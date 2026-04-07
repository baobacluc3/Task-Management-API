import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

export type RefreshJwtPayload = JwtPayload;

export type AuthenticatedUser = User;

export interface RefreshAuthenticatedUser extends User {
  refreshToken: string;
}
