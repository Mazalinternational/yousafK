
import React, { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ReactAsyncSelect from "./react-async-select";
import { useTranslation } from "react-i18next";
interface FloatingLabelAsyncSelectProps {
  id?: string;
  label: string;
  name: string;
  control: any;
  route?: string;
  otherParams?: Record<string, any>;
  className?: string;
  isMulti?: boolean;
  defaultOptions?: any;
  selectPlaceholder?: string;
  options?: { label: string; value: any }[];
  required?: boolean;
  fieldValue?: any;  
  isDisabled?: boolean;
}

export default function FloatingLabelAsyncSelect({
  id,
  label,
  name,
  control,
  route,
  otherParams,
  className,
  isMulti = false,
  defaultOptions = true, 
  selectPlaceholder = "Select...",
  options,
  required = false,
  fieldValue,  
  isDisabled = false,
}: FloatingLabelAsyncSelectProps) {

  const { i18n } = useTranslation();
  const isRTL =
    i18n.language.startsWith("dr") ||
    i18n.language.startsWith("fa") ||
    i18n.language.startsWith("ps") ||
    i18n.language.startsWith("pa");

  const generatedId =
    id || `floating-select-${Math.random().toString(36).substr(2, 9)}`;

  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasValue = React.useMemo(() => {
    if (fieldValue !== undefined) {
      return isMulti
        ? Array.isArray(fieldValue) && fieldValue.length > 0
        : Boolean(fieldValue);
    }
    
    const valueFromControl = control?._formValues?.[name];
    return isMulti
      ? Array.isArray(valueFromControl) && valueFromControl.length > 0
      : Boolean(valueFromControl);
  }, [fieldValue, control?._formValues?.[name], isMulti]);

  const showPlaceholder = focused && !hasValue;
  const floatLabel = focused || hasValue;

  const useLocal = Array.isArray(options);
  const otherParamsKey = React.useMemo(
    () => JSON.stringify(otherParams ?? {}),
    [otherParams],
  );

  const handleContainerFocus = () => {
    setFocused(true);
  };

  const handleContainerBlur = () => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setFocused(false);
      }
    }, 0);
  };

  const handleLabelClick = () => {
    const input = containerRef.current?.querySelector('input[id$="input"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  return (
    <div 
      className={cn("relative w-full pointer-events-auto", className)}
      dir={isRTL ? "rtl" : "ltr"}
      ref={containerRef}
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
      tabIndex={-1} 
    >
      <Label
        htmlFor={generatedId}
        className={cn(
          "absolute z-20 px-1.5 text-sm transition-all duration-200 pointer-events-none",
          floatLabel
            ? "top-[-8px] scale-75 bg-background"
            : "top-3 scale-100",
          isRTL ? "right-2" : "left-2",
          "text-gray-600 dark:text-gray-300",
          "cursor-text"
        )}
        onClick={handleLabelClick}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </Label>
      

      <ReactAsyncSelect
        name={name}
        control={control}
        options={useLocal ? options : undefined}
        defaultOptions={useLocal ? options : defaultOptions}
        route={!useLocal ? (route ?? "") : ""}
        otherParams={!useLocal ? otherParams : undefined}
        isMulti={isMulti}
        isDisabled={isDisabled}
        inputId={generatedId}
        placeholder={showPlaceholder ? selectPlaceholder : ""}
        menuPortalTarget={
          typeof window !== "undefined"
            ? document.getElementById("dialog-portal-container")
            : null
        }
        menuPosition="absolute"
        menuShouldScrollIntoView={false}
        key={`${name}-${i18n.language}-${JSON.stringify(fieldValue)}-${otherParamsKey}`}
      />
    </div>
  );
}
