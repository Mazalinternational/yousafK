// src/components/LanguageSelector.tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Languages, Check, LoaderIcon  } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Lang = {
  code: "en" | "dr" | "ps";
  name: string;        // English name
  nativeName: string;  // Native label
};

const languages: readonly Lang[] = [
  { code: "en",   name: "English", nativeName: "English" },
  { code: "dr", name: "Dari",    nativeName: "دری" },
  { code: "ps",   name: "Pashto",  nativeName: "پښتو" },
] as const;

// Normalizes a detected language to one of our supported codes.
const normalizeLng = (lng?: string): Lang["code"] => {
  if (!lng) return "en";
  if (lng.startsWith("dr")) return "dr";
  if (lng.startsWith("ps")) return "ps";
  return "en";
};

const toLocaleCode = (code: Lang["code"]) => {
  if (code === "ps") return "pa";
  return code;
};

export const LanguageSelector = ({ className }: { className?: string }) => {
  const { i18n, t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const currentCode = useMemo(
    () => normalizeLng(i18n.resolvedLanguage || i18n.language),
    [i18n.resolvedLanguage, i18n.language]
  );

  const current = useMemo(
    () => languages.find(l => l.code === currentCode) ?? languages[0],
    [currentCode]
  );

  const handleChange = async (code: Lang["code"]) => {
    setIsLoading(true);
    // Actually change language
    await i18n.changeLanguage(code);
    localStorage.setItem("locale", toLocaleCode(code));
    window.location.reload();
    // Direction is applied centrally in i18n.ts (reads localStorage override if present)
    setIsLoading(false);
  };

  return (
    <div className="relative"> 
      
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("inline-flex items-center justify-center", className)}
          title={`${current.nativeName} (${current.name})`}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8}>
      {isLoading ? (<LoaderIcon
                role="status"
                aria-label={t("common:loading", { name: t("sidebar:ui:platform") })}
                className={cn("size-4 animate-spin text-center", className)}
              />) : (
        languages.map((language) => {
          const active = language.code === current.code;
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleChange(language.code)}
              // a11y: indicate the selected item
              aria-checked={active}
              role="menuitemcheckbox"
              className="gap-2"
            >
              <span className="w-4 h-4 inline-flex items-center justify-center">
                {active ? <Check className="h-4 w-4" /> : null}
              </span>
              <span className="font-[450]">{language.nativeName}</span>
              <span className="text-muted-foreground">({language.name})</span>
            </DropdownMenuItem> 
          );
        }))}
      </DropdownMenuContent>
    </DropdownMenu> 
    </div>
  );
};
