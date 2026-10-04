import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserBookmark, BookmarkType } from './entities/user-bookmark.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: any;
  let mockPreferencesRepository: any;
  let mockBookmarksRepository: any;

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    mockPreferencesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockBookmarksRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserPreferences),
          useValue: mockPreferencesRepository,
        },
        {
          provide: getRepositoryToken(UserBookmark),
          useValue: mockBookmarksRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('createUserWithPassword', () => {
    const transactionWith = (repos: { users: any; preferences: any }) =>
      jest.fn(async (work: (manager: any) => Promise<unknown>) =>
        work({
          getRepository: (entity: unknown) => (entity === User ? repos.users : repos.preferences),
        })
      );

    it('사용자·기본 설정·비밀번호를 한 트랜잭션에서 저장한다', async () => {
      const users = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((v) => v),
        save: jest.fn(async (v) => ({ ...v, id: 'user-1' })),
      };
      const preferences = { create: jest.fn((v) => v), save: jest.fn().mockResolvedValue({}) };
      mockUserRepository.manager = { transaction: transactionWith({ users, preferences }) };

      const user = await service.createUserWithPassword('me@example.com', 'hash', '나');

      expect(user).toMatchObject({ id: 'user-1', email: 'me@example.com', passwordHash: 'hash' });
      expect(preferences.save).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(mockUserRepository.manager.transaction).toHaveBeenCalledTimes(1);
    });

    it('기본 설정 저장이 실패하면 트랜잭션 오류를 그대로 던진다 (커밋되지 않음)', async () => {
      const users = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((v) => v),
        save: jest.fn(async (v) => ({ ...v, id: 'user-1' })),
      };
      const preferences = {
        create: jest.fn((v) => v),
        save: jest.fn().mockRejectedValue(new Error('db down')),
      };
      mockUserRepository.manager = { transaction: transactionWith({ users, preferences }) };

      await expect(service.createUserWithPassword('me@example.com', 'hash')).rejects.toThrow(
        'db down'
      );
    });

    it('이미 있는 이메일이면 막는다', async () => {
      const users = {
        findOne: jest.fn().mockResolvedValue({ id: 'x' }),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockUserRepository.manager = {
        transaction: transactionWith({
          users,
          preferences: { create: jest.fn(), save: jest.fn() },
        }),
      };
      await expect(service.createUserWithPassword('me@example.com', 'hash')).rejects.toThrow(
        'Email already registered'
      );
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user with default preferences', async () => {
      const userData = {
        email: 'test@example.com',
        profileName: 'Test User',
        childrenAges: [5, 8],
      };

      const createdUser: any = {
        id: 'user-1',
        ...userData,
        isActive: true,
      };

      mockUserRepository.create.mockReturnValue(userData);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockPreferencesRepository.create.mockReturnValue({
        userId: 'user-1',
      });
      mockPreferencesRepository.save.mockResolvedValue({
        userId: 'user-1',
        notifyOpeningSoon: true,
      });

      const result = await service.createUser(
        userData.email,
        userData.profileName,
        userData.childrenAges
      );

      expect(result.email).toBe(userData.email);
      expect(result.childrenAges).toEqual([5, 8]);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockPreferencesRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should retrieve a user with preferences', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        profileName: 'Test User',
        preferences: {
          userId: 'user-1',
          notifyOpeningSoon: true,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(result?.preferences).toBeDefined();
    });
  });

  describe('addBookmark', () => {
    it('should create a new bookmark', async () => {
      const bookmarkData = {
        userId: 'user-1',
        experienceRunId: 'run-1',
        bookmarkType: BookmarkType.WISHLIST,
      };

      mockBookmarksRepository.findOne.mockResolvedValue(null);
      mockBookmarksRepository.create.mockReturnValue(bookmarkData);
      mockBookmarksRepository.save.mockResolvedValue({
        id: 'bookmark-1',
        ...bookmarkData,
      });

      const result = await service.addBookmark('user-1', 'run-1', BookmarkType.WISHLIST);

      expect(result.bookmarkType).toBe(BookmarkType.WISHLIST);
      expect(mockBookmarksRepository.save).toHaveBeenCalled();
    });

    it('should update existing bookmark', async () => {
      const existingBookmark: any = {
        userId: 'user-1',
        experienceRunId: 'run-1',
        bookmarkType: BookmarkType.WISHLIST,
      };

      mockBookmarksRepository.findOne.mockResolvedValue(existingBookmark);
      mockBookmarksRepository.save.mockResolvedValue({
        ...existingBookmark,
        bookmarkType: BookmarkType.INTERESTED,
      });

      const result = await service.addBookmark('user-1', 'run-1', BookmarkType.INTERESTED);

      expect(result.bookmarkType).toBe(BookmarkType.INTERESTED);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user account', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.deactivateUser('user-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile with new data', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        profileName: 'Old Name',
        childrenAges: [5],
        profileImageUrl: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        profileName: 'New Name',
        childrenAges: [5, 8],
        profileImageUrl: 'https://example.com/image.jpg',
      });

      const result = await service.updateUserProfile(
        'user-1',
        'New Name',
        [5, 8],
        'https://example.com/image.jpg'
      );

      expect(result.profileName).toBe('New Name');
      expect(result.childrenAges).toEqual([5, 8]);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should retrieve user preferences', async () => {
      const mockPreferences: any = {
        userId: 'user-1',
        interestedCategories: ['sports', 'art'],
        maxPricePerProgram: 50000,
        preferFree: false,
        notifyOpeningSoon: true,
      };

      mockPreferencesRepository.findOne.mockResolvedValue(mockPreferences);

      const result = await service.getUserPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(mockPreferencesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences and return the stored row', async () => {
      const updates: any = {
        interestedCategories: ['sports', 'art'],
        maxPricePerProgram: 75000,
      };
      const storedPreferences: any = { userId: 'user-1', ...updates };

      mockPreferencesRepository.update.mockResolvedValue({ affected: 1 });
      mockPreferencesRepository.findOne.mockResolvedValue(storedPreferences);

      const result = await service.updateUserPreferences('user-1', updates);

      expect(mockPreferencesRepository.update).toHaveBeenCalledWith({ userId: 'user-1' }, updates);
      expect(mockPreferencesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.interestedCategories).toEqual(['sports', 'art']);
      expect(result.maxPricePerProgram).toBe(75000);
    });

    it('should throw when the user has no preferences row', async () => {
      mockPreferencesRepository.update.mockResolvedValue({ affected: 0 });
      mockPreferencesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserPreferences('user-1', { maxPricePerProgram: 1000 } as any)
      ).rejects.toThrow('Preferences not found');
    });
  });

  describe('removeBookmark', () => {
    it('should remove a bookmark', async () => {
      mockBookmarksRepository.findOne.mockResolvedValue({ id: 'bookmark-1' });
      mockBookmarksRepository.delete.mockResolvedValue({ affected: 1 });

      await service.removeBookmark('user-1', 'run-1');

      expect(mockBookmarksRepository.delete).toHaveBeenCalled();
    });
  });

  describe('getUserBookmarks', () => {
    // 서비스는 쿼리빌더로 조회한다. 타입 필터가 붙는지를 검증한다.
    const mockQueryBuilder = (result: unknown[]) => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(result),
      };
      mockBookmarksRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should retrieve user bookmarks without filter', async () => {
      const mockBookmarks: any = [
        {
          id: 'bookmark-1',
          userId: 'user-1',
          experienceRunId: 'run-1',
          bookmarkType: BookmarkType.WISHLIST,
        },
        {
          id: 'bookmark-2',
          userId: 'user-1',
          experienceRunId: 'run-2',
          bookmarkType: BookmarkType.INTERESTED,
        },
      ];
      const qb = mockQueryBuilder(mockBookmarks);

      const result = await service.getUserBookmarks('user-1');

      expect(result).toEqual(mockBookmarks);
      expect(qb.where).toHaveBeenCalledWith('b.userId = :userId', { userId: 'user-1' });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('b.experienceRun', 'run');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('b.createdAt', 'DESC');
    });

    it('should retrieve user bookmarks with type filter', async () => {
      const mockBookmarks: any = [
        {
          id: 'bookmark-1',
          userId: 'user-1',
          experienceRunId: 'run-1',
          bookmarkType: BookmarkType.WISHLIST,
        },
      ];
      const qb = mockQueryBuilder(mockBookmarks);

      const result = await service.getUserBookmarks('user-1', BookmarkType.WISHLIST);

      expect(result).toEqual(mockBookmarks);
      expect(qb.andWhere).toHaveBeenCalledWith('b.bookmarkType = :bookmarkType', {
        bookmarkType: BookmarkType.WISHLIST,
      });
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users with limit', async () => {
      const mockUsers: any = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          profileName: 'User 1',
        },
        {
          id: 'user-2',
          email: 'test2@example.com',
          profileName: 'User 2',
        },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await service.getAllUsers(10);

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate a deactivated user', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: true,
      });

      const result = await service.reactivateUser('user-1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve user by email', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        profileName: 'Test User',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(result?.email).toBe('test@example.com');
    });
  });
});
