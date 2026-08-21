import {
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"; 
import FloatingLabelAsyncSelect from "../floating-label-async-select";
import type { OptionType } from "../react-async-select";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

type DynamicSelectFieldProps<TFieldValues extends FieldValues = FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  route?: string;
  required?: boolean;
  otherParams?: Record<string, any>;
  placeholder?: string;
  options?: OptionType[];
  onChange?: (value: any) => void;
  isMulti?: boolean;
  isDisabled?: boolean;
  defaultOptions?: OptionType[] | boolean;
};

export default function DynamicSelectField<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  name,
  label,
  route,
  required = false,
  otherParams = {},
  placeholder,
  options,
  isMulti = false,
  isDisabled = false,
  defaultOptions = true,
}: DynamicSelectFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FloatingLabelAsyncSelect
            name={name}
            label={label}
            control={control}
            route={route}
            otherParams={otherParams}
            options={options}
            selectPlaceholder={placeholder}
            required={required}
            fieldValue={field.value}
            isMulti={isMulti}
            isDisabled={isDisabled}
            defaultOptions={defaultOptions}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
