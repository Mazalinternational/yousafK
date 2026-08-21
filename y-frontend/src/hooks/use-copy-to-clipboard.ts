import { useState } from "react";

export function useCopyToClipboard({
  timeout = 5000,
}: { timeout?: number } = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
      console.warn("Clipboard not supported");
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), timeout);
      })
      .catch((error) => {
        console.error("Failed to copy: ", error);
        setIsCopied(false);
      });
  };

  return { copyToClipboard, isCopied };
}
