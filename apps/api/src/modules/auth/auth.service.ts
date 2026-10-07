import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(
    email: string,
    password: string,
    profileName?: string
  ): Promise<{ userId: string; email: string; accessToken: string }> {
    if (!(await this.isRegistrationOpen())) {
      throw new ForbiddenException('이미 계정이 있습니다. 로그인해 주세요.');
    }
    const passwordHash = await this.hashPassword(password);
    // 사용자·설정·비밀번호를 한 번에: 중간에 실패해 비밀번호 없는 계정만 남으면 다시 가입할 수 없다
    const user = await this.usersService.createUserWithPassword(email, passwordHash, profileName);

    const tokens = this.generateTokens(user.id, email);
    return {
      userId: user.id,
      email: user.email,
      accessToken: tokens.accessToken,
    };
  }

  /**
   * 혼자 쓰는 앱이라 첫 계정 하나만 가입을 받는다. 터널로 공개돼도 남이 가입할 수 없다.
   * 계정을 더 만들어야 하면 ALLOW_REGISTRATION=true 로 잠시 연다.
   */
  async isRegistrationOpen(): Promise<boolean> {
    if (process.env.ALLOW_REGISTRATION === 'true') return true;
    return this.needsSetup();
  }

  /** 계정이 하나도 없어 첫 계정을 만들어야 하는 상태인지 */
  async needsSetup(): Promise<boolean> {
    return (await this.usersService.countUsers()) === 0;
  }

  async login(email: string, password: string): Promise<AuthToken> {
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password not set for this account');
    }

    const isPasswordValid = await this.validatePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      const user = await this.usersService.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.email);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.getUserById(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password not set');
    }

    const isPasswordValid = await this.validatePassword(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await this.usersService.updateUserPassword(userId, newPasswordHash);
  }

  async resetPasswordRequest(email: string): Promise<string> {
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset', email: user.email },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '1h',
      }
    );

    return resetToken;
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync(resetToken);
      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const newPasswordHash = await this.hashPassword(newPassword);
      await this.usersService.updateUserPassword(payload.sub, newPasswordHash);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  private generateTokens(userId: string, email: string): AuthToken {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400,
    };
  }

  // 별도 시크릿이 없으면 JWT_SECRET에서 파생한다(액세스 토큰과는 다른 값).
  // 소스에 박힌 고정값을 쓰면 누구나 리프레시 토큰을 위조할 수 있다.
  private getRefreshSecret(): string {
    if (process.env.JWT_REFRESH_SECRET) {
      return process.env.JWT_REFRESH_SECRET;
    }
    return `${process.env.JWT_SECRET || 'your-secret-key'}:refresh`;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
