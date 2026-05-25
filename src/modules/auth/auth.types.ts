import type { VoucherStatus, PaymentStatus, ApprovalStatus } from "@/lib/constants";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRight {
  id: string;
  roleId: string;
  rightId: string;
}

export interface Right {
  id: string;
  code: string;
  name: string;
  moduleCode: string;
  action: "create" | "read" | "update" | "delete" | "approve";
  description: string | null;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Profile extends User {
  roles: Role[];
}

export type { VoucherStatus, PaymentStatus, ApprovalStatus };