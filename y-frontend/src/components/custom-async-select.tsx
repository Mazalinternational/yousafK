import { useMemo, useCallback, useState } from "react";
import AsyncSelect from "react-select/async";
import { useSelectStyles } from "@/hooks/useSelectStyle";
import { apiClient } from "@/api/client";

export type OptionType = {
  value: string | number;
  label: string;
};

type CustomAsyncSelectProps = {
  // Accept full option object or null
  value: OptionType | null;
  // Return full option object (or null) on change
  onChange: (option: OptionType | null) => void;
  placeholder?: string;
  route: string;
  defaultOptions?: OptionType[] | true;
  isClearable?: boolean;
  noOptionsMessage?: string;
  loadingMessage?: string;
  debounceDelay?: number;
  [key: string]: any;
};

const CustomAsyncSelect = ({
  value,
  onChange,
  placeholder = "Select...",
  route,
  defaultOptions = true,
  isClearable = true,
  noOptionsMessage = "No options found",
  loadingMessage = "Loading...",
  debounceDelay = 300,
  ...props
}: CustomAsyncSelectProps) => {
  // Optional: local cache if you still want to avoid refetching same IDs
  const [optionCache] = useState<Record<string | number, OptionType>>({});

  const loadOptions = useCallback(
    async (inputValue: string): Promise<OptionType[]> => {
      const response = await apiClient.get(route, {
        params: { query: inputValue },
      });
      const options: OptionType[] = response.data.items.map(
        (item: { id: number | string; text: string }) => ({
          value: item.id,
          label: item.text,
        }),
      );

      // Optional: cache for future lookups (e.g., if parent passes ID-only later)
      options.forEach((opt) => {
        optionCache[opt.value] = opt;
      });

      return options;
    },
    [route, optionCache],
  );

  const debouncedLoadOptions = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (inputValue: string): Promise<OptionType[]> =>
      new Promise((resolve, reject) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            const options = await loadOptions(inputValue);
            resolve(options);
          } catch (error) {
            reject(error);
          }
        }, debounceDelay);
      });
  }, [loadOptions, debounceDelay]);

  return (
    <AsyncSelect<OptionType>
      value={value}
      onChange={onChange}
      loadOptions={debouncedLoadOptions}
      defaultOptions={defaultOptions}
      cacheOptions={true} // Enable internal caching of loaded options
      styles={useSelectStyles()}
      placeholder={placeholder}
      isClearable={isClearable}
      noOptionsMessage={() => noOptionsMessage}
      loadingMessage={() => loadingMessage}
      {...props}
    />
  );
};

export default CustomAsyncSelect;
