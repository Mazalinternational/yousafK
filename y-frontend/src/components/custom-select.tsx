import { useSelectStyles } from "@/hooks/useSelectStyle";
import Select from "react-select";

interface OptionType {
  value: string;
  label: string;
}

interface CustomSelectProps {
  onChange: (selectedValue: string | null) => void;
  value: string | null | undefined | number;
  options?: OptionType[];
  placeholder?: string;
  isMulti?: boolean;
}

const CustomSelect = ({
  onChange,
  value,
  options,
  isMulti,
  placeholder,
  ...props
}: CustomSelectProps) => {
  const handleChange = (selectedOption: OptionType | null) => {
    // Extract just the value string and pass it to onChange
    onChange(selectedOption ? selectedOption.value : null);
  };

  // Convert the string value back to the option object for react-select
  const selectedOption =
    options?.find((option) => option.value === value) || null;

  return (
    <Select
      styles={useSelectStyles()}
      value={selectedOption}
      onChange={handleChange}
      options={options}
      placeholder={placeholder || "Select..."}
      isClearable
      isMulti={isMulti}
      {...props}
    />
  );
};

export default CustomSelect;
