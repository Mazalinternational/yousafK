// for downloading a blob
export function saveBlob(data: Blob, filename = "download") {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// for getting the filename from the Content-Disposition header
export function getFilenameFromContentDisposition(
  cd?: string,
  fallbackName: string = "download" // e.g. "Statistics_Report.pdf or .xlsx"
): string {
  if (!cd) return fallbackName;

  // Try RFC 5987: filename*=UTF-8''...
  const starMatch = /filename\*=UTF-8''([^;\r\n]*)/i.exec(cd);
  if (starMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(
        starMatch[1].replace(/(^"|"$)/g, "").trim()
      );
      if (decoded) return decoded;
    } catch {
      // Ignore decode errors
    }
  }

  // Fallback to plain filename
  const plainMatch = /filename="?([^";\r\n]*?)"?(?=\s*;|$)/i.exec(cd);
  if (plainMatch?.[1]) {
    const name = plainMatch[1].trim();
    if (name) return name;
  }

  return fallbackName; // already has correct extension
}
