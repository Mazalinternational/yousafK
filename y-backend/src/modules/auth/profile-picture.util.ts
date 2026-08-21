import { join } from 'node:path';

export const PROFILE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profiles');
export const PROFILE_UPLOAD_URL_PREFIX = '/uploads/profiles';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024;

export function isAllowedProfilePictureMime(mimeType: string) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function extensionForProfilePictureMime(mimeType: string) {
  return MIME_TO_EXT[mimeType] ?? null;
}

export function buildProfilePictureFileName(userId: string, mimeType: string) {
  const extension = extensionForProfilePictureMime(mimeType);
  if (!extension) return null;
  return `${userId}${extension}`;
}

export function buildProfilePictureUrl(fileName: string | null | undefined) {
  if (!fileName) return null;
  return `${PROFILE_UPLOAD_URL_PREFIX}/${fileName}`;
}

export function resolveProfilePictureDiskPath(fileName: string) {
  return join(PROFILE_UPLOAD_DIR, fileName);
}
