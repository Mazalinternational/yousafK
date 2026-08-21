import { Font, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { isRTL } from "@/i18n";
import {
  hasEasternArabicDigits,
  normalizeEasternDigitsToLatin,
} from "@/utils/displayLocale";
import notoSansArabicBoldUrl from "@/assets/fonts/NotoSansArabic-Bold.ttf?url";
import notoSansArabicRegularUrl from "@/assets/fonts/NotoSansArabic-Regular.ttf?url";
import iranyekanBoldUrl from "@/assets/fonts/fa/Qs_Iranyekan bold.ttf?url";
import iranyekanRegularUrl from "@/assets/fonts/fa/Qs_Iranyekan.ttf?url";

export const PDF_ARABIC_FONT_FAMILY = "NotoSansArabic";
export const PDF_IRANYEKAN_FONT_FAMILY = "QsIranyekan";
export const PDF_LATIN_FONT_FAMILY = "Helvetica";

const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let fontsRegistered = false;
let pdfFontsReady = false;
let pdfFontsLoadPromise: Promise<void> | null = null;
let pdfRenderLanguage: string | null = null;

function fetchFontDataUrl(url: string): Promise<string> {
  return fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF font: ${url}`);
    }

    const buffer = await response.arrayBuffer();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error(`Failed to read PDF font data: ${url}`));
      };
      reader.onerror = () => reject(new Error(`Failed to read PDF font data: ${url}`));
      reader.readAsDataURL(new Blob([buffer], { type: "font/ttf" }));
    });
  });
}

async function registerPdfFonts() {
  if (fontsRegistered && pdfFontsReady) {
    return;
  }

  try {
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    // Hyphenation callback may already be registered during hot reload.
  }

  const [notoRegularDataUrl, notoBoldDataUrl, iranyekanRegularDataUrl, iranyekanBoldDataUrl] =
    await Promise.all([
      fetchFontDataUrl(notoSansArabicRegularUrl),
      fetchFontDataUrl(notoSansArabicBoldUrl),
      fetchFontDataUrl(iranyekanRegularUrl),
      fetchFontDataUrl(iranyekanBoldUrl),
    ]);

  Font.register({
    family: PDF_ARABIC_FONT_FAMILY,
    fonts: [
      { src: notoRegularDataUrl, fontWeight: 400 },
      { src: notoBoldDataUrl, fontWeight: 700 },
    ],
  });

  Font.register({
    family: PDF_IRANYEKAN_FONT_FAMILY,
    fonts: [
      { src: iranyekanRegularDataUrl, fontWeight: 400 },
      { src: iranyekanBoldDataUrl, fontWeight: 700 },
    ],
  });

  await Promise.all([
    Font.load({ fontFamily: PDF_ARABIC_FONT_FAMILY, fontWeight: 400 }),
    Font.load({ fontFamily: PDF_ARABIC_FONT_FAMILY, fontWeight: 700 }),
    Font.load({ fontFamily: PDF_IRANYEKAN_FONT_FAMILY, fontWeight: 400 }),
    Font.load({ fontFamily: PDF_IRANYEKAN_FONT_FAMILY, fontWeight: 700 }),
  ]);

  fontsRegistered = true;
  pdfFontsReady = true;
}

export function isPdfArabicFontReady() {
  return pdfFontsReady;
}

export async function ensurePdfFontsLoaded() {
  if (fontsRegistered && pdfFontsReady) {
    return;
  }

  if (!pdfFontsLoadPromise) {
    pdfFontsLoadPromise = registerPdfFonts().catch((error) => {
      pdfFontsReady = false;
      fontsRegistered = false;
      pdfFontsLoadPromise = null;
      throw error;
    });
  }

  await pdfFontsLoadPromise;
}

export function containsArabicScript(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  return ARABIC_SCRIPT_RE.test(value);
}

export function containsArabicScriptInValues(
  ...values: Array<string | null | undefined>
) {
  return values.some((value) => containsArabicScript(value));
}

export function shouldUseRtlPdfDocument(language: string) {
  return isRTL(language);
}

export function shouldUseArabicPdfFont(
  language: string,
  ...texts: Array<string | null | undefined>
) {
  return shouldUseRtlPdfDocument(language) || containsArabicScriptInValues(...texts);
}

export function getPdfScriptFontFamily(language?: string | null): string {
  const lang = (language ?? pdfRenderLanguage ?? "").toLowerCase();
  if (lang === "ps" || lang === "dr") {
    return PDF_IRANYEKAN_FONT_FAMILY;
  }
  return PDF_ARABIC_FONT_FAMILY;
}

export function getPdfFontFamily(language: string) {
  if (!shouldUseRtlPdfDocument(language) && !pdfRenderLanguage) {
    return PDF_LATIN_FONT_FAMILY;
  }

  return getPdfScriptFontFamily(language);
}

export type LocalizedPdfOptions = {
  documentRtl?: boolean;
  useArabicFont?: boolean;
  language?: string;
};

function flattenPdfTextStyle(style?: Style | Style[]): Style {
  if (!style) {
    return {};
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style);
  }
  return { ...style };
}

export function normalizePdfText(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (value == null || value === "") {
    return fallback;
  }
  return String(value);
}

/** Latin digits, currency codes, and Persian/Arabic-Indic digits need isolated LTR runs. */
function containsLtrContent(text: string) {
  return /[0-9A-Za-z]/.test(text) || hasEasternArabicDigits(text);
}

/** Digits only — never re-parse as money (that mangled phones / bill Nos.). */
function preparePdfValue(value: string) {
  return normalizeEasternDigitsToLatin(value);
}

function valueNeedsMixedRuns(value: string) {
  return containsArabicScript(value) && containsLtrContent(value);
}

function pdfValueTextStyle(
  textStyle: Style,
  value: string,
  documentRtl: boolean,
): Style {
  if (!documentRtl) {
    return textStyle;
  }

  const prepared = preparePdfValue(value);
  const flat = flattenPdfTextStyle(textStyle);

  if (containsLtrContent(prepared) && !containsArabicScript(prepared)) {
    return {
      ...flat,
      fontFamily: PDF_LATIN_FONT_FAMILY,
      direction: "ltr",
    };
  }

  if (valueNeedsMixedRuns(prepared)) {
    return flat;
  }

  return textStyle;
}

function renderPdfValueNode(
  value: string,
  textStyle: Style,
  options: LocalizedPdfOptions & { bold?: boolean },
  documentRtl: boolean,
) {
  const prepared = preparePdfValue(value);

  if (documentRtl && valueNeedsMixedRuns(prepared)) {
    return <PdfMixedText text={prepared} style={textStyle} options={options} />;
  }

  return <Text style={pdfValueTextStyle(textStyle, prepared, documentRtl)}>{prepared}</Text>;
}

function pdfLabelTextStyle(
  textStyle: Style,
  options: LocalizedPdfOptions & { bold?: boolean },
): Style {
  const flat = flattenPdfTextStyle(textStyle);
  const scriptFont = getPdfScriptFontFamily(options.language);
  return {
    ...flat,
    fontFamily: scriptFont,
    fontWeight: options.bold || isBoldStyle(flat) ? 700 : 400,
    ...(options.documentRtl ? { textAlign: "right" as const } : {}),
  };
}

function resolvePdfLanguage(language?: string) {
  return language ?? pdfRenderLanguage ?? undefined;
}

/** Split mixed RTL + Latin/number strings into separate react-pdf Text runs. */
function PdfMixedText({
  text,
  style,
  options,
}: {
  text: string;
  style?: Style | Style[];
  options: LocalizedPdfOptions & { bold?: boolean };
}) {
  const flatStyle = flattenPdfTextStyle(style);
  const parts = text
    .split(/([0-9A-Za-z.,:;()%-]+|[\u0660-\u0669\u06F0-\u06F9]+)/)
    .filter((part) => part.length > 0)
    .map((part) => normalizeEasternDigitsToLatin(part));
  const rowStyle: Style = {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: options.documentRtl ? ("flex-end" as const) : ("flex-start" as const),
    width: "100%",
    marginBottom: flatStyle.marginBottom,
    lineHeight: flatStyle.lineHeight,
  };

  return (
    <View style={rowStyle}>
      {parts.map((part, index) => {
        const ltr =
          containsLtrContent(part) &&
          !containsArabicScript(part);
        const partStyle = ltr
          ? {
              ...flatStyle,
              fontFamily: PDF_LATIN_FONT_FAMILY,
              direction: "ltr" as const,
            }
          : arabicTextStyle(flatStyle, options);

        return (
          <Text key={`${index}-${part}`} style={partStyle}>
            {part}
          </Text>
        );
      })}
    </View>
  );
}

function isBoldStyle(style: Style) {
  const fontWeight = style.fontWeight;
  return fontWeight === 700 || fontWeight === "bold" || fontWeight === 600;
}

function shouldLocalizePdfText(options: LocalizedPdfOptions, text?: string) {
  return (
    options.useArabicFont ||
    options.documentRtl ||
    Boolean(options.language && isRTL(options.language)) ||
    containsArabicScript(text)
  );
}

function resolveActivePdfFontFamily(options: LocalizedPdfOptions) {
  if (shouldLocalizePdfText(options)) {
    return getPdfScriptFontFamily(options.language);
  }

  return PDF_LATIN_FONT_FAMILY;
}

function buildLocalizedTextStyle(
  style: Style | undefined,
  options: LocalizedPdfOptions & { bold?: boolean },
): Style {
  const flat = flattenPdfTextStyle(style);
  const localized = shouldLocalizePdfText(options);

  if (!localized || !pdfFontsReady) {
    return flat;
  }

  const fontFamily = resolveActivePdfFontFamily(options);
  const { fontFamily: _ignored, fontWeight, direction, ...rest } = flat;

  return {
    ...rest,
    fontFamily,
    fontWeight: options.bold || isBoldStyle(flat) ? 700 : 400,
    ...(options.documentRtl ? { textAlign: "right" as const } : {}),
  };
}

export function localizeTextStyle(
  style: Style | undefined,
  options: LocalizedPdfOptions & { bold?: boolean } = {},
): Style {
  return buildLocalizedTextStyle(style, options);
}

type PdfPageStyleOptions = {
  baseStyle: Style;
  documentRtl: boolean;
  useArabicFont: boolean;
  language?: string;
};

export function getPdfPageStyle({
  baseStyle,
  documentRtl,
  useArabicFont,
  language,
}: PdfPageStyleOptions): Style {
  return buildLocalizedTextStyle(baseStyle, { documentRtl, useArabicFont, language });
}

function arabicTextStyle(
  style: Style | undefined,
  options: LocalizedPdfOptions & { bold?: boolean },
): Style {
  const base = buildLocalizedTextStyle(style, options);
  const scriptFont = getPdfScriptFontFamily(options.language);
  return {
    ...base,
    fontFamily: scriptFont,
    fontWeight: options.bold ? 700 : base.fontWeight ?? 400,
  };
}

type PdfTextProps = {
  children: string;
  style?: Style | Style[];
  documentRtl?: boolean;
  useArabicFont?: boolean;
  language?: string;
};

export function PdfText({
  children,
  style,
  documentRtl = false,
  useArabicFont = false,
  language,
}: PdfTextProps) {
  const resolvedLanguage = resolvePdfLanguage(language);
  const options = { documentRtl, useArabicFont, language: resolvedLanguage };
  const text = normalizePdfText(children, "");
  const localized = shouldLocalizePdfText(options, text);
  const flatStyle = flattenPdfTextStyle(style);

  if (!localized) {
    return <Text style={style}>{text}</Text>;
  }

  if (!pdfFontsReady) {
    return <Text style={style}>{text}</Text>;
  }

  if (documentRtl && containsLtrContent(text) && containsArabicScript(text)) {
    return <PdfMixedText text={preparePdfValue(text)} style={style} options={options} />;
  }

  if (documentRtl && containsLtrContent(text)) {
    return (
      <Text
        style={{
          ...flatStyle,
          fontFamily: PDF_LATIN_FONT_FAMILY,
          direction: "ltr",
          textAlign: "right",
        }}
      >
        {preparePdfValue(text)}
      </Text>
    );
  }

  return (
    <Text style={arabicTextStyle(flatStyle, options)}>
      {text}
    </Text>
  );
}

type PdfLabeledValueProps = {
  label: string;
  value: string;
  style?: Style;
  documentRtl?: boolean;
  useArabicFont?: boolean;
  language?: string;
};

export function PdfLabeledValue({
  label,
  value,
  style,
  documentRtl = false,
  useArabicFont = false,
  language,
}: PdfLabeledValueProps) {
  const resolvedLanguage = resolvePdfLanguage(language);
  const options = { documentRtl, useArabicFont, language: resolvedLanguage };
  const normalizedLabel = normalizePdfText(label, "");
  const normalizedValue = normalizePdfText(value);
  const localized =
    shouldLocalizePdfText(options, normalizedLabel) ||
    shouldLocalizePdfText(options, normalizedValue);

  if (!localized || !pdfFontsReady) {
    return <Text style={style}>{`${normalizedLabel}: ${normalizedValue}`}</Text>;
  }

  const flatStyle = flattenPdfTextStyle(style);
  const rowStyle: Style = {
    flexDirection: "row" as const,
    justifyContent: documentRtl ? ("flex-end" as const) : ("flex-start" as const),
    width: "100%",
    marginBottom: flatStyle.marginBottom,
    lineHeight: flatStyle.lineHeight,
  };

  const textStyle = pdfLabelTextStyle(arabicTextStyle(style, options), options);

  if (documentRtl) {
    return (
      <View style={rowStyle}>
        {renderPdfValueNode(normalizedValue, textStyle, options, documentRtl)}
        <Text style={textStyle}>{` ${normalizedLabel}:`}</Text>
      </View>
    );
  }

  return (
    <View style={rowStyle}>
      <Text style={textStyle}>{`${normalizedLabel}: `}</Text>
      {renderPdfValueNode(normalizedValue, textStyle, options, documentRtl)}
    </View>
  );
}

type PdfTitleProps = {
  primary: string;
  suffix: string;
  style?: Style;
  documentRtl?: boolean;
  useArabicFont?: boolean;
  language?: string;
};

export function PdfTitle({
  primary,
  suffix,
  style,
  documentRtl = false,
  useArabicFont = false,
  language,
}: PdfTitleProps) {
  const resolvedLanguage = resolvePdfLanguage(language);
  const options = { documentRtl, useArabicFont, language: resolvedLanguage, bold: true };
  const normalizedPrimary = normalizePdfText(primary, "");
  const normalizedSuffix = normalizePdfText(suffix, "");
  const localized =
    shouldLocalizePdfText(options, normalizedPrimary) ||
    shouldLocalizePdfText(options, normalizedSuffix);

  if (!localized || !pdfFontsReady) {
    return <Text style={style}>{`${normalizedPrimary} — ${normalizedSuffix}`}</Text>;
  }

  const rowStyle: Style = {
    flexDirection: "row" as const,
    justifyContent: documentRtl ? ("flex-end" as const) : ("flex-start" as const),
    width: "100%",
    marginBottom: flattenPdfTextStyle(style).marginBottom,
  };

  const textStyle = arabicTextStyle(style, options);
  const primaryStyle = pdfValueTextStyle(textStyle, normalizedPrimary, documentRtl);
  const suffixStyle = pdfValueTextStyle(textStyle, normalizedSuffix, documentRtl);

  if (documentRtl) {
    return (
      <View style={rowStyle}>
        <Text style={primaryStyle}>{normalizedPrimary}</Text>
        <Text style={textStyle}> — </Text>
        <Text style={suffixStyle}>{normalizedSuffix}</Text>
      </View>
    );
  }

  return (
    <View style={rowStyle}>
      <Text style={textStyle}>{`${normalizedPrimary} — `}</Text>
      <Text style={suffixStyle}>{normalizedSuffix}</Text>
    </View>
  );
}

export function PdfIndexedLabel({
  index,
  label,
  style,
  documentRtl = false,
  useArabicFont = false,
  language,
}: {
  index: number;
  label: string;
  style?: Style;
  documentRtl?: boolean;
  useArabicFont?: boolean;
  language?: string;
}) {
  const resolvedLanguage = resolvePdfLanguage(language);
  const options = { documentRtl, useArabicFont, language: resolvedLanguage, bold: true };
  const normalizedLabel = normalizePdfText(label, "");
  const localized = shouldLocalizePdfText(options, normalizedLabel);
  const content = `${index + 1}. ${normalizedLabel}`;

  if (!localized || !pdfFontsReady) {
    return <Text style={style}>{content}</Text>;
  }

  return <Text style={pdfLabelTextStyle(arabicTextStyle(style, options), options)}>{content}</Text>;
}

async function runWithPdfLanguage<T>(
  language: string,
  callback: () => Promise<T> | T,
) {
  await ensurePdfFontsLoaded();

  const previousLanguage = pdfRenderLanguage;
  pdfRenderLanguage = language;

  try {
    return await callback();
  } finally {
    pdfRenderLanguage = previousLanguage;
  }
}

export async function withPdfFonts<T>(
  language: string,
  callback: () => Promise<T> | T,
) {
  return runWithPdfLanguage(language, callback);
}

export async function renderLocalizedPdf<T>(
  callback: () => Promise<T> | T,
  options: { needsArabicFonts: boolean; language: string },
) {
  if (options.needsArabicFonts) {
    return runWithPdfLanguage(options.language, callback);
  }

  return await callback();
}

export function getLocalizedPdfOptionsFromLanguage(
  language: string,
  ...texts: Array<string | null | undefined>
) {
  const documentRtl = shouldUseRtlPdfDocument(language);
  const useArabicFont = shouldUseArabicPdfFont(language, ...texts);

  return {
    language,
    documentRtl,
    useArabicFont,
    needsArabicFonts: documentRtl || useArabicFont,
  };
}
