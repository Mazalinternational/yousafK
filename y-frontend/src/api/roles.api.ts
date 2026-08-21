import { apiClient, baseURL, getCachedCsrfToken, getViewSeasonScope } from "./client";

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface AdminRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: { id: string; key: string; module: string; action: string }[];
  createdAt: string;
  updatedAt: string;
}

export const rolesApi = {
  async list(): Promise<AdminRole[]> {
    const res = await apiClient.get<ApiEnvelope<AdminRole[]>>("/roles");
    return res.data.data;
  },

  async get(id: string): Promise<AdminRole> {
    const res = await apiClient.get<ApiEnvelope<AdminRole>>(`/roles/${id}`);
    return res.data.data;
  },

  async create(payload: {
    name: string;
    slug: string;
    description?: string;
    permissions?: string[];
  }): Promise<AdminRole> {
    const res = await apiClient.post<ApiEnvelope<AdminRole>>("/roles", payload);
    return res.data.data;
  },

  async update(
    id: string,
    payload: { name?: string; description?: string },
  ): Promise<AdminRole> {
    const res = await apiClient.patch<ApiEnvelope<AdminRole>>(`/roles/${id}`, payload);
    return res.data.data;
  },

  async setPermissions(id: string, permissions: string[]): Promise<AdminRole> {
    const res = await apiClient.put<ApiEnvelope<AdminRole>>(`/roles/${id}/permissions`, {
      permissions,
    });
    return res.data.data;
  },

  /**
   * Best-effort persist when the tab is closing. Axios can be cancelled by the
   * browser; `keepalive` fetch is allowed to outlive the page.
   */
  persistPermissionsOnUnload(id: string, permissions: string[]): void {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const csrf = getCachedCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;

    const viewSeasonId = getViewSeasonScope();
    if (viewSeasonId) headers["X-View-Season-Id"] = viewSeasonId;

    void fetch(`${baseURL}/roles/${id}/permissions`, {
      method: "PUT",
      credentials: "include",
      keepalive: true,
      headers,
      body: JSON.stringify({ permissions }),
    });
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },
};
