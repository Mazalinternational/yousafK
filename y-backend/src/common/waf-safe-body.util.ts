/**
 * Decode client WAF-safe string wrappers (`yk1:` + base64 UTF-8) that the
 * frontend uses so ModSecurity does not false-positive on Pashto/Dari text.
 */
const WAF_SAFE_PREFIX = 'yk1:';

function decodeWafSafeString(value: string): string {
  if (!value.startsWith(WAF_SAFE_PREFIX)) {
    return value;
  }

  try {
    return Buffer.from(value.slice(WAF_SAFE_PREFIX.length), 'base64').toString(
      'utf8',
    );
  } catch {
    return value;
  }
}

export function decodeWafSafeValue<T>(value: T): T {
  if (typeof value === 'string') {
    return decodeWafSafeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => decodeWafSafeValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = decodeWafSafeValue(record[key]);
    }
  }

  return value;
}
