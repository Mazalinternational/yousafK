import DatePicker, { DateObject } from "react-multi-date-picker";
import AnalogTimePicker from "react-multi-date-picker/plugins/analog_time_picker";
import { useTheme } from "@/contexts/theme-provider";
import { cn } from "@/lib/utils";
import "react-multi-date-picker/styles/colors/yellow.css";
import "react-multi-date-picker/styles/colors/analog_time_picker_yellow.css";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import { useTranslation } from "react-i18next";

interface TimePickerProps {
  value?: string | null; // e.g., "03:24:34 PM"
  onChange: (timeString: string | null) => void;
}

export const TimePicker = ({ value, onChange }: TimePickerProps) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  // Correctly parse incoming time string using setFormat + parse
  let internalValue: DateObject | null = null;
  if (value) {
    const parser = new DateObject();
    parser.setFormat("HH:mm:ss"); // Set input format
    internalValue = parser.parse(value); // Parse string into DateObject
  }

  const handleChange = (date: DateObject | null) => {
    if (date) {
      // Format to desired output string (this works directly)
      const formatted = date.format("HH:mm:ss");
      onChange(formatted);
    } else {
      onChange(null);
    }
  };

  const dateInputClasses = cn(
    "h-9 w-full rounded-md px-3 py-1 text-base bg-background",
    "border border-input",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
    "placeholder:text-muted-foreground",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "disabled:pointer-events-none disabled:opacity-50",
    "md:text-sm",
    "outline-none"
  );
  return (
    <div className="w-full flex flex-col">
      <DatePicker
        disableDayPicker
        format="HH:mm:ss"
        plugins={[<AnalogTimePicker />]}
        value={internalValue}
        onChange={handleChange}
        editable={false}
        className={cn("yellow", resolvedTheme === "dark" ? "bg-dark" : "")}
        inputClass={dateInputClasses}
        placeholder={t("common:pick_time")}
      />
    </div>
  );
};
