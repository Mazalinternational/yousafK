import { apiClient } from "./client";

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface PermissionRow {
  id: string;
  module: string;
  action: string;
  key: string;
  description: string | null;
  createdAt: string;
}

export interface PermissionGroup {
  module: string;
  permissions: { id: string; key: string; action: string }[];
}

export const permissionsApi = {
  async list(): Promise<PermissionRow[]> {
    const res = await apiClient.get<ApiEnvelope<PermissionRow[]>>("/permissions");
    return res.data.data;
  },
  async grouped(): Promise<PermissionGroup[]> {
    const res = await apiClient.get<ApiEnvelope<PermissionGroup[]>>("/permissions/grouped");
    return res.data.data;
  },
};
