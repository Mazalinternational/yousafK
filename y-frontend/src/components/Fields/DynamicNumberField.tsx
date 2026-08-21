import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import RequiredFieldMark from "@/components/required-field-mark";
import { cn } from "@/lib/utils";

interface FloatingNumberFieldProps {
  name: string;
  label: string;
  control: any;
  required?: boolean;
}

export default function FloatingNumberField({
  name,
  label,
  control,
  required = false,
}: FloatingNumberFieldProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "dr" || i18n.language === "ps";
  const [focused, setFocused] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const hasValue = field.value !== "" && field.value !== null;

        return (
          <FormItem className="relative" dir={isRTL ? "rtl" : "ltr"}>
            
            {/* Floating Label */}
            <label
              htmlFor={name}
              className={cn(
                "absolute z-20 bg-background px-1 text-sm text-gray-500 transition-all duration-200 pointer-events-none",
                focused || hasValue ? "-top-2 scale-75" : "top-3 scale-100",
                isRTL ? "right-3" : "left-3",
                "flex items-center gap-1"
              )}
            >
              {label}
              {required && <RequiredFieldMark />}
            </label>

            {/* Input */}
            <FormControl>
              <input
                id={name}
                type="number"
                {...field}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={cn(
                  "peer h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-ring/30",
                  // Remove number arrows
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  isRTL ? "text-right" : "text-left"
                )}
              />
            </FormControl>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
