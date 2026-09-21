import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredFieldMark from "./required-field-mark";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type FloatingLabelInputProps = InputProps & {
  label?: string;
  translationKey?: string;
  required?: boolean;
};

function isInputValueEmpty(value: InputProps["value"]) {
  return value === undefined || value === null || String(value).trim() === "";
}

const FloatingLabelInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.PropsWithoutRef<FloatingLabelInputProps>
>(
  (
    {
      id,
      label,
      translationKey,
      required,
      className,
      type = "text",
      value,
      onFocus,
      onBlur,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === "dr" || i18n.language === "ps";
    const [isFocused, setIsFocused] = React.useState(false);

    const generatedId =
      id || `floating-input-${Math.random().toString(36).substr(2, 9)}`;

    const displayLabel = translationKey ? t(translationKey) : label;
    const labelFloated = isFocused || !isInputValueEmpty(value);

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          id={generatedId}
          type={type}
          value={value}
          placeholder={isFocused ? placeholder : " "}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "transition-all hover:border-[#FEA317] h-10 dark:bg-[#18181B]",
            type === "number"
              ? "text-left pl-3"
              : isRTL
                ? "text-right pr-3"
                : "text-left pl-3",
          )}
          {...props}
          // Force after {...props} so RTL callers cannot block "." decimals.
          lang={type === "number" ? "en" : props.lang}
          inputMode={type === "number" ? "decimal" : props.inputMode}
          step={type === "number" ? (props.step ?? "any") : props.step}
          dir={type === "number" ? "ltr" : isRTL ? "rtl" : "ltr"}
        />
        <Label
          htmlFor={generatedId}
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "absolute z-10 transform bg-background px-2 text-sm duration-300 cursor-text",
            labelFloated
              ? "top-2 -translate-y-4 scale-75"
              : "top-1/2 -translate-y-1/2 scale-100",
            isFocused && "text-blue-600",
            "dark:text-gray-200",
            isRTL ? "origin-right right-2 text-right" : "origin-left left-2 text-left",
          )}
        >
          {displayLabel}
          {required && <RequiredFieldMark />}
        </Label>
      </div>
    );
  },
);

FloatingLabelInput.displayName = "FloatingLabelInput";

/** @deprecated Use FloatingLabelInput instead. Kept for backward compatibility. */
const FloatingInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} {...props} />
));
FloatingInput.displayName = "FloatingInput";

/** @deprecated Label positioning is handled inside FloatingLabelInput. */
const FloatingLabel = Label;

export { FloatingInput, FloatingLabel, FloatingLabelInput };
