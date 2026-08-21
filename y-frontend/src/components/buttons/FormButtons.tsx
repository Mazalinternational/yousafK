import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface FormButtonsProps {
  isSubmitting?: boolean;
  onSubmit: () => void;
  submitText?: string;
  resetText?: string;
  onReset?: () => void;
  name?: string;
}

const FormButtons: React.FC<FormButtonsProps> = ({
  isSubmitting,
  onSubmit,
  submitText = "common:save",
  resetText = "common:reset",
  onReset,
  name,
}) => {
  const { t } = useTranslation();

  return (
      <div className="flex gap-3 justify-end">
      <Button
        type="button"
        onClick={onSubmit}
        className="hover:cursor-pointer "
        disabled={isSubmitting}
      >
        {isSubmitting
          ? t("common:saving", { name: t(name || "") })
          : t(submitText, { name: t(name || "") })}
      </Button>
      <Button
        type="button"
        className="ms-3 hover:cursor-pointer"
        variant="outline"
        onClick={onReset}
        disabled={isSubmitting}
      >
        {t(resetText, { name: t(name || "") })}
      </Button>
    </div>
  );
};

export default FormButtons;