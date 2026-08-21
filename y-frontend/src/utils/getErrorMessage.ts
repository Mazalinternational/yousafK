import type { TFunction } from "i18next";

export const getErrorMessage = (error: unknown, t: TFunction): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { message?: string | string[]; title?: string } } })
      .response?.data;
    const raw = data?.message ?? data?.title;
    if (Array.isArray(raw)) {
      return raw.join(", ");
    }
    if (typeof raw === "string" && raw.trim()) {
      return raw;
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
