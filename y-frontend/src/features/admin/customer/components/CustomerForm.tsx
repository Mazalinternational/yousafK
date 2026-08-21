import { zodResolver } from "@hookform/resolvers/zod";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { type Resolver, useForm } from "react-hook-form";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Season } from "../../seasons/schemas/season";
import {
  createCustomerFormSchema,
  type Customer,
  type CustomerFormValues,
} from "../schemas/customer";
import { useAllowedCustomerTypes } from "../hooks/useAllowedCustomerTypes";

interface CustomerFormProps {
  activeSeason: Season | null;
  defaultValues: Customer | null;
  onSubmit: (values: CustomerFormValues) => void;
  isSubmitting?: boolean;
}

export function CustomerForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: CustomerFormProps) {
  const { t } = useTranslation();
  const { allowedTypes, defaultType } = useAllowedCustomerTypes();
  const customerFormSchema = useMemo(() => createCustomerFormSchema(t), [t]);
  const customerTypeOptions = allowedTypes.map((type) => ({
    value: type,
    label: t(`common:${type}`),
  }));

  // When editing, keep the current type visible even if the option list is filtered.
  const typeOptions =
    defaultValues &&
    !customerTypeOptions.some((option) => option.value === defaultValues.type)
      ? [
          {
            value: defaultValues.type,
            label: t(`common:${defaultValues.type}`),
          },
          ...customerTypeOptions,
        ]
      : customerTypeOptions;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormValues>,
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || defaultType,
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      notes: defaultValues?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:season")}</p>
          <p className="mt-1 text-base font-semibold">
            {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("common:customer_season_hint")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="type"
            label={t("common:type")}
            control={form.control}
            required
            options={typeOptions}
            placeholder={t("common:select", { name: t("common:type") })}
            disabled={Boolean(defaultValues)}
          />

          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="phoneNo"
            label={t("common:phone_number")}
            placeholder={t("common:enter", { name: t("common:phone_number") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="address"
            label={t("common:address")}
            placeholder={t("common:enter", { name: t("common:address") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />

          <InputField
            name="notes"
            label={t("common:notes")}
            placeholder={t("common:enter", { name: t("common:notes") })}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!activeSeason && !defaultValues) ||
              (!defaultValues && allowedTypes.length === 0)
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:customer") })
              : t("common:save", { name: t("admin:customer") })}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
          >
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
