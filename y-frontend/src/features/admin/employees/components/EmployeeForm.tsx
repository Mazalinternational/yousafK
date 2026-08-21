import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Season } from "../../seasons/schemas/season";
import {
  EMPLOYEE_STATUS_OPTIONS,
  createEmployeeFormSchema,
  type Employee,
  type EmployeeFormValues,
} from "../schemas/employee";

interface EmployeeFormProps {
  activeSeason: Season | null;
  defaultValues: Employee | null;
  onSubmit: (values: EmployeeFormValues) => void;
  isSubmitting?: boolean;
}

export function EmployeeForm({
  activeSeason,
  defaultValues,
  onSubmit,
  isSubmitting,
}: EmployeeFormProps) {
  const { t } = useTranslation();
  const employeeFormSchema = useMemo(() => createEmployeeFormSchema(t), [t]);
  const employeeStatusOptions = EMPLOYEE_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: t(`common:${status}`),
  }));
  const generatedEmployeeNo = `${activeSeason?.code?.trim().toUpperCase() || "SEASON"}-EMP-*`;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema) as Resolver<EmployeeFormValues>,
    defaultValues: {
      employeeNo: defaultValues?.employeeNo || generatedEmployeeNo,
      name: defaultValues?.name || "",
      position: defaultValues?.position || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      joinDate: defaultValues?.joinDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      monthlySalary: defaultValues?.monthlySalary || "",
      status: defaultValues?.status || "active",
      notes: defaultValues?.notes || "",
    },
  });

  useEffect(() => {
    form.reset({
      employeeNo: defaultValues?.employeeNo || generatedEmployeeNo,
      name: defaultValues?.name || "",
      position: defaultValues?.position || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      joinDate: defaultValues?.joinDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      monthlySalary: defaultValues?.monthlySalary || "",
      status: defaultValues?.status || "active",
      notes: defaultValues?.notes || "",
    });
  }, [defaultValues, form, generatedEmployeeNo]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:season")}</p>
          <p className="mt-1 text-base font-semibold">
            {activeSeason?.name || defaultValues?.seasonName || t("common:no_active_season")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("common:employee_season_hint")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="employeeNo"
            label={t("common:employee_no")}
            control={form.control}
            disabled
            placeholder={generatedEmployeeNo}
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
            name="position"
            label={t("common:position")}
            placeholder={t("common:enter", { name: t("common:position") })}
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

          <DatePickerField
            name="joinDate"
            label={t("common:hire_date")}
            control={form.control}
            required
          />

          <InputField
            name="monthlySalary"
            label={t("common:monthly_salary")}
            placeholder={t("common:enter", { name: t("common:monthly_salary") })}
            control={form.control}
            required
            type="number"
            characterRestriction="none"
          />

          <DynamicLocalSelect
            name="status"
            label={t("common:status")}
            control={form.control}
            required
            options={employeeStatusOptions}
            placeholder={t("common:select", { name: t("common:status") })}
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
          <Button type="submit" disabled={isSubmitting || (!activeSeason && !defaultValues)}>
            {isSubmitting
              ? t("common:saving", { name: t("admin:employees") })
              : t("common:save", { name: t("admin:employees") })}
          </Button>

          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
            {t("common:reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
