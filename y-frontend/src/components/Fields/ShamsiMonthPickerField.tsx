import { useTranslation } from "react-i18next";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import RequiredFieldMark from "@/components/required-field-mark";
import { cn } from "@/lib/utils";
import ShamsiMonthPicker from "../shamsi-month-picker";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

type ShamsiMonthPickerFieldProps<TFieldValues extends FieldValues = FieldValues> =
  {
    name: FieldPath<TFieldValues>;
    label: string;
    control: Control<TFieldValues>;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
  };

const ShamsiMonthPickerField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  control,
  required = false,
  disabled = false,
  className,
  placeholder,
}: ShamsiMonthPickerFieldProps<TFieldValues>) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "dr" || i18n.language === "ps";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn("floating-label-field", className)}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <FormControl>
            <div className="relative">
              <ShamsiMonthPicker
                name={field.name}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                placeholder={placeholder}
                disabled={disabled}
                inputClassName={cn(
                  "peer block w-full bg-transparent px-2 py-4 border rounded focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50",
                  !!field.value && "has-value",
                )}
              />
              <label
                htmlFor={name}
                className={cn(
                  "absolute px-1 left-2 -top-2.5 text-sm bg-background text-gray-500 transition-all pointer-events-none origin-left z-10 ",
                  isRTL ? "right-3 left-auto origin-right" : "",
                  field.value ? "scale-75" : "top-3 scale-100",
                  "peer-focus:-top-2.5 peer-focus:scale-75",
                )}
                style={
                  isRTL
                    ? {
                        right: "0.75rem",
                        left: "auto",
                        transformOrigin: "right",
                      }
                    : undefined
                }
              >
                {label}
                {required && <RequiredFieldMark />}
              </label>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ShamsiMonthPickerField;
