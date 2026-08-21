import { DateObject } from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";

const SHAMSI_MONTH_NAMES = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
] as const;

export function todayGregorianInKabul(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

export function currentShamsiMonthStart(): string {
  const today = todayGregorianInKabul();
  const shamsi = new DateObject({ date: today, calendar: gregorian }).convert(persian);
  return new DateObject(shamsi).setDay(1).convert(gregorian).format("YYYY-MM-DD");
}

export function currentShamsiMonthKey(): string {
  const today = todayGregorianInKabul();
  const shamsi = new DateObject({ date: today, calendar: gregorian }).convert(persian);
  return `${String(shamsi.year).padStart(4, "0")}-${String(shamsi.month.number).padStart(2, "0")}`;
}

export function formatShamsiMonthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const monthName = SHAMSI_MONTH_NAMES[month - 1] ?? String(month);
  return `${monthName} ${year}`;
}

export function gregorianToShamsiMonthKey(value: string): string {
  const shamsi = new DateObject({ date: value, calendar: gregorian }).convert(persian);
  return `${String(shamsi.year).padStart(4, "0")}-${String(shamsi.month.number).padStart(2, "0")}`;
}

export function formatShamsiMonthLabel(value: string): string {
  const shamsi = new DateObject({ date: value, calendar: gregorian }).convert(persian);
  const monthName = SHAMSI_MONTH_NAMES[shamsi.month.number - 1] ?? String(shamsi.month.number);
  return `${monthName} ${shamsi.year}`;
}

export function formatShamsiMonthPicker(value: string): string {
  return formatShamsiMonthLabel(value);
}
