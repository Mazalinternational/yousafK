import { baseURL } from "@/api/client";

export function resolveProfilePictureUrl(
  profilePictureUrl?: string | null,
): string | undefined {
  if (!profilePictureUrl) {
    return undefined;
  }

  if (profilePictureUrl.startsWith("http://") || profilePictureUrl.startsWith("https://")) {
    return profilePictureUrl;
  }

  const apiOrigin = baseURL.replace(/\/$/, "");
  const path = profilePictureUrl.startsWith("/")
    ? profilePictureUrl
    : `/${profilePictureUrl}`;

  return `${apiOrigin}${path}`;
}
