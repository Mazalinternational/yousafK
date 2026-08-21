import {
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import RequiredFieldMark from "../required-field-mark";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

type DynamicCheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> =
  {
    control: Control<TFieldValues>;
    name: FieldPath<TFieldValues>;
    label: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
  };

export default function DynamicCheckboxField<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  label,
  required = false,
  disabled = false,
  className,
}: DynamicCheckboxFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center gap-3">
            <FormControl>
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                ref={field.ref}
                disabled={disabled}
              />
            </FormControl>

            <FormLabel className="text-sm">
              {label}
              {required && <RequiredFieldMark />}
            </FormLabel>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
