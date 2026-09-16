import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { FloatingLabelInput } from "../floating-label-input";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

type CharacterRestriction = "auto" | "arabic" | "latin" | "none";

type InputFieldPropsTyped<TFieldValues extends FieldValues = FieldValues> = {
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  control: Control<TFieldValues>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  type?: string;
  autoComplete?: string;
  enabledLanguages?: string[];
  characterRestriction?: CharacterRestriction;
};

const inferCharacterRestriction = (name: string): Exclude<CharacterRestriction, "auto"> => {
  const normalizedName = name.toLowerCase();

  // Only explicit language suffixes — never bare "pa"/"en" endings (false positives).
  if (
    normalizedName.endsWith(".dr") ||
    normalizedName.endsWith(".pa") ||
    normalizedName.endsWith(".ps") ||
    normalizedName.endsWith("namedr") ||
    normalizedName.endsWith("namepa") ||
    normalizedName.endsWith("nameps")
  ) {
    return "arabic";
  }

  if (normalizedName.endsWith(".en") || normalizedName.endsWith("nameen")) {
    return "latin";
  }

  return "none";
};

const sanitizeValueByRestriction = (
  value: string,
  restriction: Exclude<CharacterRestriction, "auto">,
) => {
  if (restriction === "arabic") {
    return value.replace(/[A-Za-z]/g, "");
  }

  if (restriction === "latin") {
    return value.replace(/\p{Script=Arabic}/gu, "");
  }

  return value;
};

const InputField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  control,
  required = false,
  disabled = false,
  className,
  type = "text",
  autoComplete,
  enabledLanguages,
  characterRestriction = "auto",
}: InputFieldPropsTyped<TFieldValues>) => {
  const { i18n } = useTranslation();
  const normalizedLanguage = i18n.language.toLowerCase();
  const isEnabledForLanguage =
    !enabledLanguages ||
    enabledLanguages.some((languageCode) =>
      normalizedLanguage.startsWith(languageCode.toLowerCase()),
    );
  const isDisabled = disabled || !isEnabledForLanguage;
  const effectiveRestriction =
    characterRestriction === "auto"
      ? inferCharacterRestriction(String(name))
      : characterRestriction;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormControl>
            <FloatingLabelInput
              {...field}
              id={name}
              placeholder={placeholder}
              required={required}
              label={label}
              disabled={isDisabled}
              type={type}
              autoComplete={autoComplete}
              onChange={(event) => {
                if (
                  typeof event.target.value === "string" &&
                  type !== "email" &&
                  type !== "number" &&
                  effectiveRestriction !== "none"
                ) {
                  field.onChange(
                    sanitizeValueByRestriction(
                      event.target.value,
                      effectiveRestriction,
                    ),
                  );
                  return;
                }

                field.onChange(event);
              }}
            />
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default InputField;
