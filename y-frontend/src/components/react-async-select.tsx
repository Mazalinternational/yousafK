// components/ReactAsyncSelect.tsx
import React, { useState, useMemo, useCallback } from "react";
import type { GroupBase, MultiValue, SingleValue } from "react-select";
import AsyncSelect, { type AsyncProps } from "react-select/async";
import {
  useController,
  type Control,
  type FieldValues,
  type FieldPath,
} from "react-hook-form";
import { useSelectStyles } from "@/hooks/useSelectStyle";
import { apiClient } from "@/api/client";

// Option type
export type OptionType = {
  value: string | number;
  label: string;
};

// Props for ReactAsyncSelect
type ReactAsyncSelectProps<T extends FieldValues> = Omit<
  AsyncProps<OptionType, boolean, GroupBase<OptionType>>,
  "onChange" | "value" | "loadOptions" | "name"
> & {
  name: FieldPath<T>;
  control: Control<T>;
  isMulti?: boolean;
  route?: string;
  otherParams?: Record<string, any>;
  defaultOptions?: OptionType[] | boolean;
  className?: string;
  options?: OptionType[];
};

const ReactAsyncSelect = <T extends FieldValues>({
  name,
  control,
  isMulti = false,
  defaultOptions: propDefaultOptions = true,
  route,
  otherParams = {},
  className,
  ...props
}: ReactAsyncSelectProps<T>) => {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController({ name, control });

  const [isFocused, setIsFocused] = useState(false);
  const [hasFloatingLabel, setHasFloatingLabel] = useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const labelRef = React.useRef<HTMLLabelElement | null>(null);

  const {
    onBlur: userOnBlur,
    onFocus: userOnFocus,
    placeholder: userPlaceholder,
    options: _options,
    ...restProps
  } = props;

  const fetchData = useCallback(
    async (inputValue: string) => {
      if (!route) {
        return [];
      }

      const response = await apiClient.get(route, {
        params: { query: inputValue, ...otherParams },
      });
      const items = response.data?.items as
        | Array<{ id: string | number; text: string }>
        | undefined;
      return (items ?? []).map((item) => ({
        value: item.id.toString(),
        label: item.text,
      }));
    },
    [route, otherParams],
  );

  // Initialize internal default options
  const [internalDefaultOptions, setInternalDefaultOptions] = useState<
    OptionType[]
  >(Array.isArray(propDefaultOptions) ? propDefaultOptions : []);

  // Memoize merged value for react-select
  const selectValue = useMemo(() => {
    if (isMulti) {
      return Array.isArray(value)
        ? (value as unknown[]).filter(
            (v): v is OptionType =>
              v != null && typeof v === "object" && "value" in v,
          )
        : [];
    } else {
      return value ?? null;
    }
  }, [value, isMulti]);

  const hasValue = useMemo(() => {
    if (isMulti) {
      return Array.isArray(selectValue) && selectValue.length > 0;
    }
    return selectValue !== null && selectValue !== undefined;
  }, [selectValue, isMulti]);

  const DEBOUNCE_DELAY = 300; // ms
  // Enhanced loadOptions with debounce
  const enhancedLoadOptions = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debouncedLoad = (inputValue: string): Promise<OptionType[]> => {
      return new Promise<OptionType[]>((resolve, reject) => {
        // Clear any pending timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async () => {
          try {
            const options = await fetchData(inputValue);

            // Merge into internal default options
            setInternalDefaultOptions((prev) => {
              const map = new Map<string | number, OptionType>();
              prev.forEach((opt) => map.set(opt.value, opt));
              options.forEach((opt) => map.set(opt.value, opt));
              return Array.from(map.values());
            });

            resolve(options); // ✅ Using closure's resolve
          } catch (error) {
            reject(error);
          }
        }, DEBOUNCE_DELAY);
      });
    };

    // Cleanup on unmount (optional)
    debouncedLoad.clear = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    return debouncedLoad;
  }, [fetchData, DEBOUNCE_DELAY]);

  // Also update internal options when value changes (e.g., from form reset or init)
  React.useEffect(() => {
    if (!selectValue) return;

    const valuesToSync = Array.isArray(selectValue)
      ? selectValue
      : [selectValue];
    setInternalDefaultOptions((prev) => {
      const map = new Map<string | number, OptionType>();
      prev.forEach((opt) => map.set(opt.value, opt));
      valuesToSync.forEach((opt) => {
        if (opt && !map.has(opt.value)) {
          map.set(opt.value, opt);
        }
      });
      return Array.from(map.values());
    });
  }, [selectValue]);

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

  const handleChange = (
    newValue: MultiValue<OptionType> | SingleValue<OptionType>,
  ) => {
    if (isMulti) {
      onChange([...(newValue as MultiValue<OptionType>)]);
      return;
    }
    onChange(newValue as SingleValue<OptionType>);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    userOnFocus?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur();
    userOnBlur?.(event);
  };

  // Final defaultOptions passed to AsyncSelect
  const finalDefaultOptions = useMemo(() => {
    // If propDefaultOptions is array, we still prioritize internal merged list
    return internalDefaultOptions.length > 0
      ? internalDefaultOptions
      : propDefaultOptions;
  }, [internalDefaultOptions, propDefaultOptions]);

  return (
    <div ref={containerRef} className="w-full">
      <AsyncSelect<OptionType, boolean, GroupBase<OptionType>>
        className={className}
        ref={ref}
        value={selectValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        styles={useSelectStyles()}
        isMulti={isMulti}
        cacheOptions={false} // Set to false to always use our merging logic
        defaultOptions={finalDefaultOptions}
        isClearable
        loadOptions={enhancedLoadOptions}
        loadingMessage={() => "Loading..."}
        noOptionsMessage={() => "No options found"}
        placeholder={hasFloatingLabel ? " " : userPlaceholder}
        {...restProps}
        inputId={name}
      />
    </div>
  );
};

export default ReactAsyncSelect;
