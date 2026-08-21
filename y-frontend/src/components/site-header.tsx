import { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./mode-toggle";
import { LanguageSelector } from "./language-switcher";
import { useTranslation } from 'react-i18next';

export function SiteHeader() {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = useMemo(() => {
    if (i18n.language === "dr") return "fa-AF";
    if (i18n.language === "ps") return "ps-AF";
    return "en-US";
  }, [i18n.language]);

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(now),
    [locale, now],
  );

  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [locale, now],
  );

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <div className="flex shrink-0 items-center gap-1">
          <SidebarTrigger className="ltr:-ml-1 rtl:-mr-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium leading-none">{t("sidebar:app:title")}</h1>
        </div>

        <div className="mx-auto hidden min-w-0 items-center gap-3 md:flex">
          <span className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
            {dateLabel}
          </span>
          <span className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums">
            {timeLabel}
          </span>
          <a
            href="https://www.mazalinternational.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("sidebar:app:developed_by")}
          </a>
        </div>

        <Separator
          orientation="vertical"
          className="ms-auto me-1 data-[orientation=vertical]:h-4 md:hidden"
        />
        <div className="flex gap-2">
          <LanguageSelector />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
