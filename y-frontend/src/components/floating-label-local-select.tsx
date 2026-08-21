import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import RequiredFieldMark from "@/components/required-field-mark";
import type { OptionType } from "./react-select";
import ReactSelect from "./react-select";
import { useTranslation } from "react-i18next";
import { useSelectStyles } from "@/hooks/useSelectStyle";
import { apiClient, baseURL } from "@/api/client";

interface FloatingLabelLocalSelectProps {
  name: string;
  control: any;
  label: string;
  required?: boolean;
  options?: OptionType[];
  route?: string;
  placeholder?: string;
  isMulti?: boolean;
  disabled?: boolean;
  fieldValue?: any;
}
 
export default function FloatingLabelLocalSelect({
  name,
  control,
  label,
  route,
  required = false, 
  options = [],
  placeholder = "Select...",
  isMulti = false,
  disabled = false,
  fieldValue,
}: FloatingLabelLocalSelectProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "dr" || i18n.language === "ps";
  const lang =
    i18n.language === "ps" 
      ? "pa"
      : i18n.language === "fa"
        ? "dr"
        : i18n.language === "dr"
          ? "dr"
          : "en";
  const localizedBaseUrl = baseURL.replace(/\/api\/[^/]+$/, `/api/${lang}`);

  const [focused, setFocused] = useState(false);
  const [routeOptions, setRouteOptions] = useState<OptionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (!route) {
      setRouteOptions([]);
      return;
    }

    let mounted = true;
    const fetchRouteOptions = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(route, {
          baseURL: localizedBaseUrl,
          params: { pageNumber: 1, pageSize: 1000 },
        });

        const mappedOptions: OptionType[] =
          response.data?.items?.map((item: any) => ({
            value: String(item.id),
            label:
              typeof item.text === "string"
                ? item.text
                : item.text?.[lang] || item.text?.en || "",
          })) || [];

        if (mounted) setRouteOptions(mappedOptions);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchRouteOptions();

    return () => {
      mounted = false;
    };
  }, [route, localizedBaseUrl, lang]);

  const finalOptions = React.useMemo(() => {
    if (options?.length) return options;
    return routeOptions;
  }, [options, routeOptions]);

  const valueFromControl = control?._formValues?.[name];
  const resolvedValue = fieldValue !== undefined ? fieldValue : valueFromControl;
  const hasValue = isMulti
    ? Array.isArray(resolvedValue) && resolvedValue.length > 0
    : resolvedValue !== null &&
      resolvedValue !== undefined &&
      resolvedValue !== "";

  const floatLabel = focused || hasValue;
  const showPlaceholder = focused && !hasValue;

  return (
    <div className="relative w-full pointer-events-auto">

      <Label
        className={cn(
          "absolute z-20 px-1 text-sm transition-all duration-200 pointer-events-none flex gap-1 items-center",

          floatLabel
            ? "top-[-8px] scale-75 bg-background"
            : "top-3 scale-100 ",

          isRTL ? "origin-right right-2 text-right" : "origin-left left-2 text-left",
          "dark:text-gray-200 dark:bg-gray-900"
        )}
      >
        {label} {required && <RequiredFieldMark />}
      </Label>

      <ReactSelect
        name={name}
        control={control}
        options={finalOptions}
        isMulti={isMulti}
        placeholder={showPlaceholder ? placeholder : ""}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        styles={useSelectStyles()}
        isLoading={isLoading}
        isDisabled={disabled}
      />
    </div>
  );
};
