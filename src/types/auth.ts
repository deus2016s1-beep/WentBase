export type UserRole = 'admin' | 'viewer';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};
