export function parseAllowedOrigins(frontendUrl: string): string[] {
  return frontendUrl
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isOriginAllowed(
  origin: string,
  allowedOrigins: string[],
): boolean {
  if (allowedOrigins.length === 0) return true;

  for (const allowed of allowedOrigins) {
    if (allowed === origin) return true;
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      if (new RegExp(`^${pattern}$`, 'i').test(origin)) return true;
    }
  }

  return false;
}
