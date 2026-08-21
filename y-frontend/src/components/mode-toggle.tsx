import { Check, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/theme-provider";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
interface ThemeItems {
  value: "light" | "dark" | "system";
  label: string;
}
export function ModeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themeItems: ThemeItems[] = [
    { value: "light", label: t("common:light") },
    { value: "dark", label: t("common:dark") },
    { value: "system", label: t("common:system_mode") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className={cn(className)}>
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{t("sidebar:ui:toggle_theme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeItems.map((item) => (
          <DropdownMenuItem
            key={item.value}
            className="flex justify-between items-center"
            disabled={theme === item.value}
            onClick={() => setTheme(item.value)}
          >
            {item.label}
            {theme === item.value && <Check />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
