import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserBookmark, BookmarkType } from './entities/user-bookmark.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';

type PublicUser = Omit<User, 'passwordHash'>;

// 응답에 비밀번호 해시가 섞여 나가지 않도록 한다.
function toPublicUser(user: User): PublicUser;
function toPublicUser(user: User | null): PublicUser | null;
function toPublicUser(user: User | null): PublicUser | null {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest as PublicUser;
}

// 경로의 :userId는 로그인한 본인만 다룰 수 있다.
function assertSelf(current: JwtPayload, userId: string): void {
  if (current.sub !== userId) {
    throw new ForbiddenException('You can only access your own account');
  }
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(
    @Body()
    body: { email: string; profileName?: string; childrenAges?: number[] },
  ): Promise<PublicUser> {
    const user = await this.usersService.createUser(
      body.email,
      body.profileName,
      body.childrenAges,
    );
    return toPublicUser(user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllUsers(@Query('limit') limit: number = 100): Promise<PublicUser[]> {
    const users = await this.usersService.getAllUsers(limit);
    return users.map((user) => toPublicUser(user));
  }

  // 아래 세 라우트는 웹 클라이언트가 호출하는 "내 정보" 경로다.
  // ':userId' 라우트보다 먼저 선언해야 'profile'/'preferences'가 userId로 잡히지 않는다.
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() current: JwtPayload): Promise<PublicUser> {
    const user = await this.usersService.getUserById(current.sub);
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMyProfile(
    @CurrentUser() current: JwtPayload,
    @Body()
    body: {
      profileName?: string;
      childrenAges?: number[];
      profileImageUrl?: string;
    },
  ): Promise<PublicUser> {
    const user = await this.usersService.updateUserProfile(
      current.sub,
      body.profileName,
      body.childrenAges,
      body.profileImageUrl,
    );
    return toPublicUser(user);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  async getMyPreferences(
    @CurrentUser() current: JwtPayload,
  ): Promise<UserPreferences | null> {
    return this.usersService.getUserPreferences(current.sub);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  async updateMyPreferences(
    @CurrentUser() current: JwtPayload,
    @Body() updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const { id: _id, userId: _userId, user: _user, ...safeUpdates } = updates;
    return this.usersService.updateUserPreferences(current.sub, safeUpdates);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<PublicUser | null> {
    assertSelf(current, userId);
    return toPublicUser(await this.usersService.getUserById(userId));
  }

  @Put(':userId/profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateUserProfile(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
    @Body()
    body: {
      profileName?: string;
      childrenAges?: number[];
      profileImageUrl?: string;
    },
  ): Promise<PublicUser> {
    assertSelf(current, userId);
    const user = await this.usersService.updateUserProfile(
      userId,
      body.profileName,
      body.childrenAges,
      body.profileImageUrl,
    );
    return toPublicUser(user);
  }

  @Get(':userId/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getUserPreferences(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<UserPreferences | null> {
    assertSelf(current, userId);
    return this.usersService.getUserPreferences(userId);
  }

  @Put(':userId/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updateUserPreferences(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
    @Body() updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    assertSelf(current, userId);
    const { id: _id, userId: _userId, user: _user, ...safeUpdates } = updates;
    return this.usersService.updateUserPreferences(userId, safeUpdates);
  }

  @Get(':userId/bookmarks')
  @ApiOperation({ summary: 'Get user bookmarks' })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getUserBookmarks(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
    @Query('type') type?: BookmarkType,
  ): Promise<UserBookmark[]> {
    assertSelf(current, userId);
    return this.usersService.getUserBookmarks(userId, type);
  }

  @Post(':userId/bookmarks')
  @ApiOperation({ summary: 'Add bookmark for experience run' })
  async addBookmark(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
    @Body()
    body: { experienceRunId: string; bookmarkType?: BookmarkType },
  ): Promise<UserBookmark> {
    assertSelf(current, userId);
    return this.usersService.addBookmark(
      userId,
      body.experienceRunId,
      body.bookmarkType || BookmarkType.WISHLIST,
    );
  }

  @Delete(':userId/bookmarks/:experienceRunId')
  @ApiOperation({ summary: 'Remove bookmark' })
  async removeBookmark(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
    @Param('experienceRunId') experienceRunId: string,
  ): Promise<void> {
    assertSelf(current, userId);
    return this.usersService.removeBookmark(userId, experienceRunId);
  }

  @Put(':userId/status/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  async deactivateUser(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<PublicUser> {
    assertSelf(current, userId);
    return toPublicUser(await this.usersService.deactivateUser(userId));
  }

  @Put(':userId/status/reactivate')
  @ApiOperation({ summary: 'Reactivate user account' })
  async reactivateUser(
    @CurrentUser() current: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<PublicUser> {
    assertSelf(current, userId);
    return toPublicUser(await this.usersService.reactivateUser(userId));
  }
}
