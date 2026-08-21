import i18n from "i18next";
import type { TFunction } from "i18next";
import { initReactI18next } from "react-i18next";
// Optional detector (reads from localStorage, navigator, etc.)
import LanguageDetector from "i18next-browser-languagedetector";

// Import static resources (simple + fast for SPAs)


import enAdmin from "./i18n/en/admin.json";
import drAdmin from "./i18n/dr/admin.json";
import psAdmin from "./i18n/ps/admin.json";

import enCommon from "./i18n/en/common.json";
import drCommon from "./i18n/dr/common.json";
import psCommon from "./i18n/ps/common.json";

import enSidebar from "./i18n/en/sidebar.json";
import drSidebar from "./i18n/dr/sidebar.json";
import psSidebar from "./i18n/ps/sidebar.json";
import enMessages from "./i18n/en/messages.json";
import drMessages from "./i18n/dr/messages.json";
import psMessages from "./i18n/ps/messages.json";


export const resources = {
  en: {
    common: enCommon,
    sidebar: enSidebar,
    admin: enAdmin,
    messages: enMessages,
  },
  dr: {
    common: drCommon,
    sidebar: drSidebar,
    admin: drAdmin,
    messages: drMessages,
  },
  ps: {
    common: psCommon,
    sidebar: psSidebar,
    admin: psAdmin,
    messages: psMessages,
  },
} as const;

type TranslationLanguageSource = TFunction | { lng?: string; language?: string };

/** i18next exposes `t.lng`, not `t.language` — use this helper in PDF/export code. */
export function getTranslationLanguage(t: TranslationLanguageSource): string {
  const source = t as { lng?: string; language?: string };
  return source.lng ?? source.language ?? i18n.language ?? "en";
}

// Helper to decide RTL
export const isRTL = (lng?: string | null) =>
  ["dr", "ps", "ar"].some((code) => (lng ?? "").startsWith(code));

i18n
  .use(LanguageDetector) // comment out if you don't want auto-detect
  .use(initReactI18next)
  .init({
    resources,
    // Fallback if language not available
    fallbackLng: {
      ps: ["en"],
      default: ["en"],
    },
    ns: ["common", "sidebar", "admin", "messages"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // If using LanguageDetector
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    // debug:true
  });

// Keep <html dir="..."> in sync with language
const applyDir = (lng: string) => {
  const dir = isRTL(lng) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
};
applyDir(i18n.resolvedLanguage || i18n.language);

i18n.on("languageChanged", (lng) => {
  applyDir(lng);
});

export default i18n;
