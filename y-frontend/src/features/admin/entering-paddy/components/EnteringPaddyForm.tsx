import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { formatWeightFromKg, quantityInputFromRecord, SEER_KG } from "@/utils/weightUnit";
import type { Season } from "../../seasons/schemas/season";
import type { Customer } from "../../customer/schemas/customer";
import { useVarietySelectOptions } from "../../verieties/hooks";
import {
  ENTERING_PADDY_RECEIVED_FROM_OPTIONS,
  createEnteringPaddyFormSchema,
  type EnteringPaddy,
  type EnteringPaddyFormValues,
} from "../schemas/entering-paddy";

interface EnteringPaddyFormProps {
  activeSeason: Season | null;
  customers: Customer[];
  defaultValues: EnteringPaddy | null;
  onSubmit: (values: EnteringPaddyFormValues) => void;
  isSubmitting?: boolean;
}

export function EnteringPaddyForm({
  activeSeason,
  customers,
  defaultValues,
  onSubmit,
  isSubmitting,
}: EnteringPaddyFormProps) {
  const { t } = useTranslation();
  const receivedFromOptions = ENTERING_PADDY_RECEIVED_FROM_OPTIONS.map((option) => ({
    value: option,
    label: t(`common:${option}`),
  }));
  const {
    options: varietyOptions,
    isLoading: varietiesLoading,
    isEmpty: noPaddyVarieties,
  } = useVarietySelectOptions("PADDY");
  const customerOptions = customers
    .filter(
      (customer) =>
        customer.type === "paddy_farmer" || customer.type === "paddy_seller",
    )
    .map((customer) => ({
      value: customer.id,
      label: `${customer.name} (${customer.phoneNo}) - ${t(`common:${customer.type}`)}`,
      type: customer.type,
    }));

  const formSchema = useMemo(() => createEnteringPaddyFormSchema(t), [t]);

  const form = useForm<EnteringPaddyFormValues>({
    resolver: zodResolver(formSchema) as Resolver<EnteringPaddyFormValues>,
    defaultValues: {
      customerId: defaultValues?.customerId || defaultValues?.customer?.id || "",
      variety: defaultValues?.variety || "",
      date: defaultValues?.date?.slice(0, 10) || "",
      weight: defaultValues
        ? quantityInputFromRecord(defaultValues.weight, defaultValues.weightUnit)
        : "",
      weightUnit: "seven_kg",
      driverName: defaultValues?.driverName || "",
      carPlate: defaultValues?.carPlate || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      receivedFrom: defaultValues?.receivedFrom || "farmer",
    },
  });

  const weight = Number(useWatch({ control: form.control, name: "weight" }) || 0);
  const selectedCustomerId = useWatch({ control: form.control, name: "customerId" }) || "";
  const totalWeightKg = weight * SEER_KG;
  const selectedCustomer = customerOptions.find(
    (customer) => customer.value === selectedCustomerId,
  );

  useEffect(() => {
    if (varietiesLoading || varietyOptions.length === 0) {
      return;
    }
    const current = form.getValues("variety");
    if (!current || !varietyOptions.some((o) => o.value === current)) {
      form.setValue("variety", varietyOptions[0].value, { shouldValidate: true });
    }
  }, [varietiesLoading, varietyOptions, form]);

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    form.setValue(
      "receivedFrom",
      selectedCustomer.type === "paddy_farmer" ? "farmer" : "seller",
    );
  }, [form, selectedCustomer]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...form.register("weightUnit")} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{t("common:season")}</p>
            <p className="mt-1 text-base font-semibold">
              {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common:entering_paddy_season_hint")}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{t("common:total_weight_kg")}</p>
            <p className="mt-1 text-base font-semibold">
              {formatWeightFromKg(totalWeightKg || 0, t)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("common:entering_paddy_weight_hint")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DynamicLocalSelect
            name="customerId"
            label={t("common:customer")}
            control={form.control}
            required
            options={customerOptions}
            placeholder={t("common:select", { name: t("common:customer") })}
          />

          <DynamicLocalSelect
            name="variety"
            label={t("common:variety")}
            control={form.control}
            required
            options={varietyOptions}
            placeholder={t("common:select", { name: t("common:variety") })}
            disabled={varietiesLoading || noPaddyVarieties}
          />
          {noPaddyVarieties && !varietiesLoading ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              {t("common:verieties_catalog_empty_hint")}
            </p>
          ) : null}

          <DatePickerField
            name="date"
            label={t("common:date")}
            control={form.control}
            required
          />

          <InputField
            name="weight"
            label={t("common:quantity_seer")}
            placeholder={t("common:enter", { name: t("common:quantity_seer") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />

          <InputField
            name="driverName"
            label={t("common:driver_name")}
            placeholder={t("common:enter", { name: t("common:driver_name") })}
            control={form.control}
            required
            characterRestriction="none"
          />

          <InputField
            name="carPlate"
            label={t("common:car_plate")}
            placeholder={t("common:enter", { name: t("common:car_plate") })}
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

          <DynamicLocalSelect
            name="receivedFrom"
            label={t("common:received_from")}
            control={form.control}
            required
            options={receivedFromOptions}
            placeholder={t("common:select", { name: t("common:received_from") })}
            disabled
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
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              ((!activeSeason && !defaultValues) || customerOptions.length === 0) ||
              varietiesLoading ||
              noPaddyVarieties
            }
          >
            {isSubmitting
              ? t("common:saving", { name: t("admin:entering_paddy") })
              : t("common:save", { name: t("admin:entering_paddy") })}
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
