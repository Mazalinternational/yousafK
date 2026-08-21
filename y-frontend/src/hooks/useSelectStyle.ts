import { useTheme } from "@/contexts/theme-provider";
import type { StylesConfig, GroupBase } from "react-select";

export function useSelectStyles(
  fontSize: string = "0.875rem",
  tagFontSize: string = "0.75rem",
): StylesConfig<any, boolean, GroupBase<any>> {
  const { resolvedTheme: mode } = useTheme();

  return {
    control: (provided, state) => ({
      ...provided,
      width: "100%",
      cursor: "pointer",

      fontSize,
      backgroundColor:
        mode === "light" ? "oklch(1 0 0)" : "oklch(0.21 0.006 285.885)",
      borderColor: state.isFocused
        ? "#FEA317"
        : mode === "light"
          ? "oklch(0.92 0.004 286.32)"
          : "oklch(1 0 0 / 15%)",
      borderRadius: "0.3rem",
      padding: "2px",
      boxShadow: state.isFocused ? `0 0 0 1px #FEA317` : "none",
      "&:hover": {
        borderColor: "#FEA317",
      },
    }),

    input: (provided) => ({
      ...provided,
      width: "100%",

      color:
        mode === "light" ? "oklch(0.141 0.005 285.823)" : "oklch(0.985 0 0)",
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize,
      cursor: "pointer",

      backgroundColor: state.isSelected
        ? mode === "light"
          ? "oklch(0.967 0.001 286.375)"
          : "oklch(0.274 0.006 286.033)"
        : state.isFocused
          ? mode === "light"
            ? "oklch(0.967 0.001 286.375)"
            : "oklch(0.274 0.006 286.033)"
          : mode === "light"
            ? "oklch(1 0 0)"
            : "oklch(0.21 0.006 285.885)",
      color: state.isSelected
        ? mode === "light"
          ? "oklch(0.21 0.006 285.885)"
          : "oklch(0.985 0 0)"
        : mode === "light"
          ? "oklch(0.141 0.005 285.823)"
          : "oklch(0.985 0 0)",
      "&:active": {
        backgroundColor:
          mode === "light"
            ? "oklch(0.967 0.001 286.375)"
            : "oklch(0.274 0.006 286.033)",
        color:
          mode === "light" ? "oklch(0.21 0.006 285.885)" : "oklch(0.985 0 0)",
      },
    }),

    singleValue: (provided) => ({
      ...provided,
      fontSize,
      color:
        mode === "light" ? "oklch(0.141 0.005 285.823)" : "oklch(0.985 0 0)",
    }),

    multiValue: (provided) => ({
      ...provided,
      backgroundColor:
        mode === "light"
          ? "oklch(0.967 0.001 286.375)"
          : "oklch(0.274 0.006 286.033)",
    }),

    multiValueLabel: (provided) => ({
      ...provided,
      fontSize: tagFontSize,
      color:
        mode === "light" ? "oklch(0.21 0.006 285.885)" : "oklch(0.985 0 0)",
    }),

    multiValueRemove: (provided) => ({
      ...provided,
      color:
        mode === "light" ? "oklch(0.21 0.006 285.885)" : "oklch(0.985 0 0)",
      "&:hover": {
        backgroundColor:
          mode === "light"
            ? "oklch(0.967 0.001 286.375)"
            : "oklch(0.274 0.006 286.033)",
        color:
          mode === "light" ? "oklch(0.21 0.006 285.885)" : "oklch(0.985 0 0)",
      },
    }),

    placeholder: (provided) => ({
      ...provided,
      fontSize,
      color:
        mode === "light"
          ? "oklch(0.552 0.016 285.938)"
          : "oklch(0.705 0.015 286.067)",
    }),

    menu: (provided) => ({
      ...provided,
      backgroundColor:
        mode === "light" ? "oklch(1 0 0)" : "oklch(0.21 0.006 285.885)",
      zIndex: 1000,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999, // Higher than Radix's 50
      pointerEvents: "auto", // Force interaction
    }),
  };
}
