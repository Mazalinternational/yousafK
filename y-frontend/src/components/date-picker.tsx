import { useEffect, useState } from "react";
import type { Ref } from "react";
import DatePicker from "react-multi-date-picker";
import Settings from "react-multi-date-picker/plugins/settings";
import Toolbar from "react-multi-date-picker/plugins/toolbar";
import transition from "react-element-popper/animations/transition";
import opacity from "react-element-popper/animations/opacity";

import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import "react-multi-date-picker/styles/colors/teal.css";

import persian from "react-date-object/calendars/persian";
import arabic from "react-date-object/calendars/arabic";
import gregorian from "react-date-object/calendars/gregorian";

import persian_en from "react-date-object/locales/persian_en";
import arabic_en from "react-date-object/locales/arabic_en";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { DateObject } from "react-multi-date-picker";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-provider";

// Custom Month Names
const arabicMonths = [
  "محرم",
  "صفر",
  "ربیع الاول",
  "ربیع الثانی",
  "جمادی الاول",
  "جمادی الثانی",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذوالقعده",
  "ذوالحجه",
];
const persianMonths = [
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
];
const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type PopperAnimation = (...args: unknown[]) => void;

const datePickerAnimations: PopperAnimation[] = [opacity(), transition()];

interface DatePickerComponentProps {
  onChange: (date: string) => void;
  value: string | null | undefined;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  inputClassName?: string;
}

export default function DatePickerComponent({
  onChange,
  value,
  placeholder = undefined,
  disabled = false,
  name,
  onBlur,
  inputRef: _inputRef,
  inputClassName,
}: DatePickerComponentProps) {
  const [props, setProps] = useState({ calendar: persian, locale: persian_en });
  const [months, setMonths] = useState(persianMonths);
  const [calendar, setCalendar] = useState(props.calendar);
  const [locale, setLocale] = useState(props.locale);
  const [weekDays, setWeekDays] = useState(["ش", "ی", "د", "س", "چ", "پ", "ج"]);
  const [toolBarNames, setToolBarNames] = useState({
    today: "امروز",
    deselect: "پاک کردن",
    close: "تایید",
  });
  const [selectedDate, setSelectedDate] = useState<DateObject | null>(null);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const calendarType = props.calendar.name;
    // Update the months and settings based on the selected calendar type
    switch (calendarType) {
      case "gregorian":
        setCalendar(gregorian);
        setLocale(gregorian_en);
        setMonths(englishMonths);
        setWeekDays(["S", "M", "T", "W", "T", "F", "S"]);
        setToolBarNames({ today: "Today", deselect: "Clear", close: "OK" });

        break;
      case "arabic":
        setCalendar(arabic);
        setLocale(arabic_en);
        setMonths(arabicMonths);
        setWeekDays(["ح", "ن", "ث", "ر", "خ", "ج", "س"]);
        setToolBarNames({ today: "اليوم", deselect: "مسح", close: "حسنا" });

        break;
      default:
        setCalendar(persian);
        setLocale(persian_en);
        setMonths(persianMonths);
        setWeekDays(["ش", "ی", "د", "س", "چ", "پ", "ج"]);
        setToolBarNames({
          today: "امروز",
          deselect: "پاک کردن",
          close: "تایید",
        });

        break;
    }
  }, [props]);

  useEffect(() => {
    if (value) {
      const apiDate = new DateObject({ date: value, calendar: gregorian });
      const convertedDate = apiDate.convert(calendar);
      setSelectedDate(convertedDate);
    } else {
      setSelectedDate(null);
    }
  }, [props.calendar.name, value, calendar]);

  const handleDateChange = (
    date: DateObject | null,
    {
      input,
      isTyping,
    }: {
      validatedValue: string | string[];
      input: HTMLElement;
      isTyping: boolean;
    },
  ): false | void => {
    if (!isTyping) {
      // User selects the date from the calendar - no validation needed
      if (!date) {
        onChange("");
      } else {
        const gregorianDate = new DateObject(date).convert(gregorian);
        onChange(gregorianDate.format("YYYY-MM-DD"));
      }
      return;
    }

    // Validation for manual input
    let value = (input as HTMLInputElement).value;
    const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    // Convert Persian digits to English
    for (const digit of digits) {
      value = value.replace(
        new RegExp(digit, "g"),
        digits.indexOf(digit).toString(),
      );
    }

    const strings = value.split("/");
    const numbers = strings.map(Number);
    const [_year, month, day] = numbers;

    if ((input as HTMLInputElement).value && numbers.some((number) => isNaN(number))) {
      return false; // Invalid input - contains non-digit characters
    }

    if (month > 12 || month < 0) return false; // Invalid month
    if (day < 0 || (date && day > date.day)) return false; // Invalid day
    if (strings.some((val) => val.startsWith("00"))) return false; // Invalid format (leading zeros)

    // If validation passes, convert and set the date
    if (date) {
      const gregorianDate = new DateObject(date).convert(gregorian);
      onChange(gregorianDate.format());
    }
  };

  const dateInputClasses = cn(
    "h-10 w-full rounded-md px-3 py-1 text-base ",
    "border border-input",
    "bg-transparent text-foreground dark:bg-input/30 dark:text-foreground",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
    "placeholder:text-muted-foreground",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "disabled:pointer-events-none disabled:opacity-50",
    "md:text-sm",
    "outline-none",
    inputClassName,
  );

  return (
    <div className="w-full flex flex-col" onBlur={() => onBlur?.()}>
      <DatePicker
        {...props}
        className={resolvedTheme === "dark" ? "teal bg-dark" : ""}
        inputClass={dateInputClasses}
        zIndex={100}
        portal={true}
        hideOnScroll
        disabled={disabled}
        name={name}
        value={selectedDate}
        weekDays={weekDays}
        months={months}
        calendar={calendar}
        locale={locale}
        onPropsChange={setProps}
        onChange={handleDateChange}
        monthYearSeparator="|"
        placeholder={placeholder}
        animations={datePickerAnimations}
        mapDays={({ date }) => {
          const props: { className?: string } = {};
          if (date.weekDay.index === 6) {
            props.className = "highlight-red";
          }
          return props;
        }}
        plugins={[
          <Settings
            position="bottom"
            defaultActive="calendar"
            calendars={["gregorian", "persian", "arabic"]}
            locales={["en"]}
            disabledList={["other", "mode", "locale"]}
            names={{
              gregorian: "م",
              persian: "ش",
              arabic: "ق",
              indian: "",
              en: "",
              fa: "",
              ar: "",
              hi: "",
              single: "",
              multiple: "",
              range: "",
              disable: "",
              onlyMonthPicker: "",
              onlyYearPicker: "",
            }}
          />,
          <Toolbar position="bottom" names={toolBarNames} />,
        ]}
      />
    </div>
  );
}
