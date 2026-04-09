export type UserRole = 'admin' | 'viewer';

export type AuthUser = {
  name: string;
  role: UserRole;
};
