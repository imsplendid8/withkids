import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersService = {
      createUser: jest.fn(),
      createUserWithPassword: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUserPassword: jest.fn(),
      countUsers: jest.fn().mockResolvedValue(0),
    };

    mockJwtService = {
      sign: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user with encrypted password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123',
        profileName: 'Test User',
      };

      const createdUser: any = {
        id: 'user-1',
        email: userData.email,
        profileName: userData.profileName,
      };

      mockUsersService.createUserWithPassword.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('mocked-access-token');

      const result = await service.register(
        userData.email,
        userData.password,
        userData.profileName
      );

      expect(result.userId).toBe('user-1');
      expect(result.email).toBe(userData.email);
      expect(result.accessToken).toBe('mocked-access-token');
      const [, savedHash, savedName] = mockUsersService.createUserWithPassword.mock.calls[0];
      expect(savedHash).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, savedHash)).toBe(true);
      expect(savedName).toBe(userData.profileName);
    });

    it('계정이 이미 있으면 가입을 막는다', async () => {
      mockUsersService.countUsers.mockResolvedValue(1);

      await expect(service.register('intruder@example.com', 'Password123')).rejects.toThrow(
        ForbiddenException
      );
      expect(mockUsersService.createUserWithPassword).not.toHaveBeenCalled();
    });

    it('ALLOW_REGISTRATION=true 이면 계정이 있어도 가입을 받는다', async () => {
      const previous = process.env.ALLOW_REGISTRATION;
      process.env.ALLOW_REGISTRATION = 'true';
      try {
        mockUsersService.countUsers.mockResolvedValue(3);
        mockUsersService.createUserWithPassword.mockResolvedValue({
          id: 'user-2',
          email: 'second@example.com',
        });
        mockJwtService.sign.mockReturnValue('token');

        await expect(service.register('second@example.com', 'Password123')).resolves.toMatchObject({
          userId: 'user-2',
        });
      } finally {
        if (previous === undefined) delete process.env.ALLOW_REGISTRATION;
        else process.env.ALLOW_REGISTRATION = previous;
      }
    });
  });

  describe('needsSetup', () => {
    it('계정이 없을 때만 true', async () => {
      mockUsersService.countUsers.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

      await expect(service.needsSetup()).resolves.toBe(true);
      await expect(service.needsSetup()).resolves.toBe(false);
    });
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('SomePassword123', 4),
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login('test@example.com', 'SomePassword123');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(86400);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('SomePassword123', 4),
      });

      await expect(service.login('test@example.com', 'WrongPassword')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException on invalid email', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(null);

      await expect(service.login('nonexistent@example.com', 'password')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if password is not set', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);

      await expect(service.login('test@example.com', 'SomePassword123')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('validateToken', () => {
    it('should validate and return JWT payload', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234568890,
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('OldPassword123', 4),
      };

      mockUsersService.getUserById.mockResolvedValue(mockUser);
      mockUsersService.updateUserPassword.mockResolvedValue(undefined);

      await service.changePassword('user-1', 'OldPassword123', 'NewPassword456');

      const [userId, newHash] = mockUsersService.updateUserPassword.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(await bcrypt.compare('NewPassword456', newHash)).toBe(true);
    });

    it('should reject when the current password is wrong', async () => {
      mockUsersService.getUserById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('OldPassword123', 4),
      });

      await expect(
        service.changePassword('user-1', 'NotMyPassword', 'NewPassword456')
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.updateUserPassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.getUserById.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', 'OldPassword123', 'NewPassword456')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPasswordRequest', () => {
    it('should generate reset token for valid email', async () => {
      const mockUser: any = {
        id: 'user-1',
        email: 'test@example.com',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('reset-token');

      const result = await service.resetPasswordRequest('test@example.com');

      expect(result).toBe('reset-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(null);

      await expect(service.resetPasswordRequest('nonexistent@example.com')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
