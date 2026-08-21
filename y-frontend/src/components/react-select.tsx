// components/ReactSelect.tsx
import React from "react";
import Select, {
  type GroupBase,
  type MultiValue,
  type SingleValue,
  type Props as SelectProps,
} from "react-select";
import {
  useController,
  type Control,
  type FieldValues,
  type FieldPath,
} from "react-hook-form";
import { useSelectStyles } from "@/hooks/useSelectStyle";

// Define the option structure
export type OptionType = {
  value: string | number;
  label: string;
};

// Props for ReactSelect
const isOptionType = (
  option: OptionType | GroupBase<OptionType> | undefined,
): option is OptionType => option != null && "value" in option;

type ReactSelectProps<T extends FieldValues> = Omit<
  SelectProps<OptionType, boolean, GroupBase<OptionType>>,
  "onChange" | "value" | "name"
> & {
  name: FieldPath<T>;
  control: Control<T>;
  isMulti?: boolean;
};

const ReactSelect = <T extends FieldValues>({
  name,
  control,
  isMulti = false,
  ...props
}: ReactSelectProps<T>) => {
  const {
    field: { value, onChange, onBlur, ref }, 
  } = useController({ name, control });

  const [isFocused, setIsFocused] = React.useState(false);
  const [hasFloatingLabel, setHasFloatingLabel] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const labelRef = React.useRef<HTMLLabelElement | null>(null);

  const {
    onBlur: userOnBlur,
    onFocus: userOnFocus,
    placeholder: userPlaceholder,
    ...restProps
  } = props;

  // Handle change based on multi/single
  const handleChange = (
    newValue: SingleValue<OptionType> | MultiValue<OptionType>,
  ) => {
    if (isMulti) {
      onChange(
        (newValue as MultiValue<OptionType>).map((option) =>
          option?.value === undefined ? "" : String(option.value),
        ),
      );
    } else {
      const nextValue = (newValue as SingleValue<OptionType>)?.value;
      onChange(nextValue === undefined ? "" : String(nextValue));
    }
  };

  const hasValue = React.useMemo(() => {
    if (isMulti) {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== null && value !== undefined && value !== "";
  }, [value, isMulti]);

  // Transform value to react-select format
  const selectValue = React.useMemo(() => {
    if (value === null || value === undefined || value === "") {
      return isMulti ? [] : null;
    }

    if (isMulti) {
      return Array.isArray(value)
        ? (value
            .map((val: string | number) =>
              props.options?.find(
                (opt): opt is OptionType =>
                  isOptionType(opt) && String(opt.value) === String(val),
              ),
            )
            .filter((opt: OptionType | undefined): opt is OptionType => opt != null))
        : [];
    }

    const match = props.options?.find(
      (option): option is OptionType =>
        isOptionType(option) && String(option.value) === String(value),
    );
    return match ?? null;
  }, [value, props.options, isMulti]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const formItem = container.closest('[data-slot="form-item"]');
    const label = formItem?.querySelector(
      '[data-slot="form-label"]',
    ) as HTMLLabelElement | null;
    if (!label) {
      if (hasFloatingLabel) setHasFloatingLabel(false);
      labelRef.current = null;
      return;
    }

    label.setAttribute("data-floating", "true");
    label.setAttribute("data-float", hasValue || isFocused ? "true" : "false");
    labelRef.current = label;
    if (!hasFloatingLabel) setHasFloatingLabel(true);
  });

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    userOnFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur();
    userOnBlur?.(event);
  };

  return (
    <div
      ref={containerRef}
      className="w-full"
      onWheel={(e) => e.stopPropagation()}
    >
      <Select<OptionType, boolean, GroupBase<OptionType>>
        value={selectValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        isMulti={isMulti}
        isClearable
        ref={ref}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : null
        }
        styles={useSelectStyles()}
        placeholder={hasFloatingLabel ? " " : userPlaceholder}
        {...restProps}
        inputId={name}
      />
    </div>
  );
};

export default ReactSelect;
