import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "number";
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "",
  className,
  type = "text",
}: SearchInputProps) {
  const { i18n } = useTranslation();
      const isRTL = i18n.language === "dr" || i18n.language === "ps";

  return (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      dir={isRTL ? "rtl" : "ltr"}
      className={cn(
        "w-[200px]",
        type === "number" &&
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  );
}
