import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

export type RefreshJwtPayload = JwtPayload;

export type AuthenticatedUser = User;

export type RefreshAuthenticatedUser = Pick<User, 'id' | 'email'> & {
  refreshToken: string;
};
