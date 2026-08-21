import type { ApiVarietyKind } from "./schemas/variety";

export const VERIETY_PATH_TO_KIND: Record<string, ApiVarietyKind> = {
  rice: "RICE",
  paddy: "PADDY",
};

export const VERIETY_KIND_PATHS = ["rice", "paddy"] as const;

export type VerietyPathSegment = (typeof VERIETY_KIND_PATHS)[number];
