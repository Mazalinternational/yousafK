import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  type Season,
  type SeasonFormValues,
  SeasonFormSchema,
} from "../schemas/season";

interface SeasonFormProps {
  defaultValues: Season | null;
  onSubmit: (values: SeasonFormValues) => void;
  isSubmitting?: boolean;
}

export function SeasonForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: SeasonFormProps) {
  const { t } = useTranslation();

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(SeasonFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      code: defaultValues?.code || "",
      startDate: defaultValues?.startDate?.slice(0, 10) || "",
      closingNotes: defaultValues?.closingNotes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="code"
            label={t("common:code")}
            placeholder={t("common:enter", { name: t("common:code") })}
            control={form.control}
            characterRestriction="none"
          />

          <DatePickerField
            name="startDate"
            label={t("common:start_date")}
            control={form.control}
            required
          />

          <InputField
            name="closingNotes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("common:saving", { name: t("admin:season") })
            : t("common:save", { name: t("admin:season") })}
        </Button>

        <Button
          type="button"
          className="ms-3"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isSubmitting}
        >
          {t("common:reset")}
        </Button>
      </form>
    </Form>
  );
}
