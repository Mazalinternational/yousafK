import type { TFunction } from "i18next";

export const getErrorMessage = (error: unknown, t: TFunction): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as {
      response?: {
        status?: number;
        data?: { message?: string | string[]; title?: string } | string;
      };
    }).response;
    const data = response?.data;
    const raw =
      typeof data === "string"
        ? data
        : data && typeof data === "object"
          ? (data.message ?? data.title)
          : undefined;
    if (Array.isArray(raw)) {
      return raw.join(", ");
    }
    if (typeof raw === "string" && raw.trim()) {
      const trimmed = raw.trim();
      if (
        trimmed.includes("403.shtml") ||
        (response?.status === 403 && /cannot\s+(get|post|put|patch|delete)/i.test(trimmed))
      ) {
        return t("common:unexpected_error");
      }
      return trimmed;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return t("common:unexpected_error");
};
