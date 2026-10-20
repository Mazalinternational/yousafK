import { zodResolver } from "@hookform/resolvers/zod";
import DatePickerField from "@/components/Fields/DatePickerField";
import DynamicLocalSelect from "@/components/Fields/DynamicLocalSelect";
import InputField from "@/components/Fields/InputField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect, useMemo, useRef } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
  const isEditing = Boolean(defaultValues);
  const originalSalaryRef = useRef(defaultValues ? String(defaultValues.monthlySalary) : "");

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema) as Resolver<EmployeeFormValues>,
    defaultValues: {
      employeeNo: defaultValues?.employeeNo || generatedEmployeeNo,
      name: defaultValues?.name || "",
      position: defaultValues?.position || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      joinDate: defaultValues?.joinDate?.slice(0, 10) || todayIsoDate(),
      monthlySalary: defaultValues?.monthlySalary || "",
      salaryEffectiveDate: defaultValues ? todayIsoDate() : "",
      earlierMonthlySalary: defaultValues ? String(defaultValues.monthlySalary) : "",
      status: defaultValues?.status || "active",
      notes: defaultValues?.notes || "",
    },
  });

  useEffect(() => {
    originalSalaryRef.current = defaultValues ? String(defaultValues.monthlySalary) : "";
    form.reset({
      employeeNo: defaultValues?.employeeNo || generatedEmployeeNo,
      name: defaultValues?.name || "",
      position: defaultValues?.position || "",
      phoneNo: defaultValues?.phoneNo || "",
      address: defaultValues?.address || "",
      joinDate: defaultValues?.joinDate?.slice(0, 10) || todayIsoDate(),
      monthlySalary: defaultValues?.monthlySalary || "",
      salaryEffectiveDate: defaultValues ? todayIsoDate() : "",
      earlierMonthlySalary: defaultValues ? String(defaultValues.monthlySalary) : "",
      status: defaultValues?.status || "active",
      notes: defaultValues?.notes || "",
    });
  }, [defaultValues, form, generatedEmployeeNo]);

  const monthlySalary = useWatch({ control: form.control, name: "monthlySalary" });
  const earlierMonthlySalary = useWatch({
    control: form.control,
    name: "earlierMonthlySalary",
  });
  const salaryChangedWhileEditing =
    isEditing &&
    String(monthlySalary ?? "").trim() !== "" &&
    Number(monthlySalary) !== Number(originalSalaryRef.current);
  const historyCorrectionWhileEditing =
    isEditing &&
    String(earlierMonthlySalary ?? "").trim() !== "" &&
    Number(earlierMonthlySalary) !== Number(monthlySalary);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (
      (salaryChangedWhileEditing || historyCorrectionWhileEditing) &&
      !form.getValues("salaryEffectiveDate")
    ) {
      form.setValue("salaryEffectiveDate", todayIsoDate(), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [
    form,
    historyCorrectionWhileEditing,
    isEditing,
    salaryChangedWhileEditing,
  ]);

  const handleSubmit = (values: EmployeeFormValues) => {
    if (!isEditing) {
      onSubmit(values);
      return;
    }

    const originalSalary = originalSalaryRef.current;
    const nextSalary = String(values.monthlySalary ?? "").trim();
    const earlierSalary =
      String(values.earlierMonthlySalary ?? "").trim() || originalSalary;
    const salaryChanged = Number(nextSalary) !== Number(originalSalary);
    const historyCorrection =
      String(earlierSalary).trim() !== "" &&
      Number(earlierSalary) !== Number(nextSalary);
    const effectiveDate = String(values.salaryEffectiveDate ?? "").trim();
    const joinDate = String(values.joinDate ?? "").slice(0, 10);
    const needsEffectiveDate = salaryChanged || historyCorrection;

    if (needsEffectiveDate && !effectiveDate) {
      form.setError("salaryEffectiveDate", {
        type: "manual",
        message: t("common:employee_validation_required"),
      });
      return;
    }

    if (needsEffectiveDate && effectiveDate && joinDate && effectiveDate < joinDate) {
      form.setError("salaryEffectiveDate", {
        type: "manual",
        message: t("common:salary_effective_before_hire"),
      });
      return;
    }

    onSubmit({
      ...values,
      earlierMonthlySalary: earlierSalary,
      salaryEffectiveDate: needsEffectiveDate
        ? effectiveDate || todayIsoDate()
        : values.salaryEffectiveDate,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

          {isEditing ? (
            <>
              <DatePickerField
                name="salaryEffectiveDate"
                label={t("common:salary_applies_from")}
                control={form.control}
                required={salaryChangedWhileEditing}
              />

              <InputField
                name="earlierMonthlySalary"
                label={t("common:earlier_monthly_salary")}
                placeholder={t("common:enter", { name: t("common:earlier_monthly_salary") })}
                control={form.control}
                type="number"
                characterRestriction="none"
              />

              <p className="text-xs text-muted-foreground md:col-span-2">
                {t("common:salary_applies_from_hint")} {t("common:earlier_monthly_salary_hint")}
              </p>

              {salaryChangedWhileEditing || historyCorrectionWhileEditing ? (
                <div className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-950 md:col-span-2 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100">
                  {t("common:salary_raise_preview", {
                    earlier: String(earlierMonthlySalary || originalSalaryRef.current),
                    next: String(monthlySalary ?? ""),
                    from: form.getValues("salaryEffectiveDate") || todayIsoDate(),
                  })}
                </div>
              ) : null}
            </>
          ) : null}

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
