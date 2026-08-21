import { Outlet, useLocation } from "react-router-dom"; // <-- Import Outlet

import { Toaster } from "./ui/sonner";
import { useEffect } from "react";


function extractHrSectionFromPath(pathname: string) {
  const match = pathname.match(/\/yk-ltd\/([^/-]+)/i);
  if (!match) return "";

  let word = match[1];

  if (word.endsWith("s")) {
    word = word.slice(0, -1);
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}
export function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = extractHrSectionFromPath(pathname);

    document.title = title ? `Yousuf Keyhan MIS - ${title}` : "Yousuf Keyhan MIS";
  }, [pathname]);

  return (
    <>
      <Toaster />
      <Outlet />
    </>
  );
}
