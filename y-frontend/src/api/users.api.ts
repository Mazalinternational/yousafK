import { apiClient } from "./client";

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
  roles: { id: string; slug: string; name: string; isSystem: boolean }[];
}

export interface UsersListResponse {
  items: AdminUserSummary[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UsersListFilters {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  role?: string;
  isActive?: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  isActive?: boolean;
  roles?: string[];
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  password?: string;
  isActive?: boolean;
}

export interface SessionSummary {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export const usersApi = {
  async list(filters: UsersListFilters = {}): Promise<UsersListResponse> {
    const res = await apiClient.get<ApiEnvelope<UsersListResponse>>("/users", {
      params: {
        pageNumber: filters.pageNumber,
        pageSize: filters.pageSize,
        query: filters.query || undefined,
        role: filters.role || undefined,
        isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
      },
    });
    return res.data.data;
  },

  async get(id: string): Promise<AdminUserSummary> {
    const res = await apiClient.get<ApiEnvelope<AdminUserSummary>>(`/users/${id}`);
    return res.data.data;
  },

  async sessions(id: string): Promise<SessionSummary[]> {
    const res = await apiClient.get<ApiEnvelope<SessionSummary[]>>(`/users/${id}/sessions`);
    return res.data.data;
  },

  async create(payload: CreateUserPayload): Promise<AdminUserSummary> {
    const res = await apiClient.post<ApiEnvelope<AdminUserSummary>>("/users", payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AdminUserSummary> {
    const res = await apiClient.patch<ApiEnvelope<AdminUserSummary>>(`/users/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async enable(id: string): Promise<AdminUserSummary> {
    const res = await apiClient.patch<ApiEnvelope<AdminUserSummary>>(`/users/${id}/enable`);
    return res.data.data;
  },

  async disable(id: string): Promise<AdminUserSummary> {
    const res = await apiClient.patch<ApiEnvelope<AdminUserSummary>>(`/users/${id}/disable`);
    return res.data.data;
  },

  async assignRoles(id: string, roles: string[]): Promise<AdminUserSummary> {
    const res = await apiClient.post<ApiEnvelope<AdminUserSummary>>(`/users/${id}/roles`, {
      roles,
    });
    return res.data.data;
  },

  async forceLogout(id: string): Promise<void> {
    await apiClient.post(`/users/${id}/force-logout`);
  },
};
