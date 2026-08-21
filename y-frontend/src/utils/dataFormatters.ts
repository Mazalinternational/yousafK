import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

export const dateFormatter = (
  date: string | Date | null | undefined
): string => {
  if (!date) return "";
  return new DateObject({ date }).setCalendar(persian).format("YYYY-MM-DD");
};
