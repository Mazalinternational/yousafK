import { useEffect, useState } from "react";
import type { Ref } from "react";
import DatePicker from "react-multi-date-picker";
import Toolbar from "react-multi-date-picker/plugins/toolbar";
import transition from "react-element-popper/animations/transition";
import opacity from "react-element-popper/animations/opacity";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_en from "react-date-object/locales/persian_en";
import { DateObject } from "react-multi-date-picker";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-provider";

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

type PopperAnimation = (...args: unknown[]) => void;

const datePickerAnimations: PopperAnimation[] = [opacity(), transition()];

interface ShamsiMonthPickerProps {
  onChange: (date: string) => void;
  value: string | null | undefined;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  inputClassName?: string;
}

export default function ShamsiMonthPicker({
  onChange,
  value,
  placeholder,
  disabled = false,
  name,
  onBlur,
  inputClassName,
}: ShamsiMonthPickerProps) {
  const [selectedDate, setSelectedDate] = useState<DateObject | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (value) {
      const apiDate = new DateObject({ date: value, calendar: gregorian });
      const convertedDate = apiDate.convert(persian);
      setSelectedDate(convertedDate);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const handleDateChange = (date: DateObject | null) => {
    if (!date) {
      onChange("");
      return;
    }

    const shamsiMonth = new DateObject(date).setDay(1);
    const gregorianMonthStart = shamsiMonth.convert(gregorian);
    onChange(gregorianMonthStart.format("YYYY-MM-DD"));
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
        className={resolvedTheme === "dark" ? "teal bg-dark" : ""}
        inputClass={dateInputClasses}
        zIndex={100}
        portal
        hideOnScroll
        disabled={disabled}
        name={name}
        value={selectedDate}
        weekDays={["ش", "ی", "د", "س", "چ", "پ", "ج"]}
        months={persianMonths}
        calendar={persian}
        locale={persian_en}
        onChange={handleDateChange}
        onlyMonthPicker
        format="MMMM YYYY"
        monthYearSeparator=" "
        placeholder={placeholder}
        animations={datePickerAnimations}
        plugins={[
          <Toolbar
            key="toolbar"
            position="bottom"
            names={{
              today: "امروز",
              deselect: "پاک کردن",
              close: "تایید",
            }}
          />,
        ]}
      />
    </div>
  );
}
