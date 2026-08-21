"use client";

import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import FloatingLabelLocalSelect from "../floating-label-local-select";
import type { OptionType } from "../react-select";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

type DynamicLocalSelectProps<TFieldValues extends FieldValues = FieldValues> = {
  name: FieldPath<TFieldValues>;
  label: string;
  control: Control<TFieldValues>;
  required?: boolean;
  options?: OptionType[];
  route?: string;
  placeholder?: string;
  isMulti?: boolean;
  disabled?: boolean;
};

export default function DynamicLocalSelectFloating<
  TFieldValues extends FieldValues = FieldValues,
>({
  name,
  label,
  control,
  required = false,
  options = [],
  route,
  placeholder = "",
  isMulti = false,
  disabled = false,
}: DynamicLocalSelectProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FloatingLabelLocalSelect
            name={name}
            label={label}
            required={required}
            route={route}
            control={control}
            options={options}
            placeholder={placeholder}
            isMulti={isMulti}
            disabled={disabled}
            fieldValue={field.value}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
