import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "@/components/Fields/InputField";
import CheckboxField from "@/components/Fields/CheckboxField";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ExpenseCategoryCreateFormSchema,
  ExpenseCategoryUpdateFormSchema,
  type ExpenseCategory,
  type ExpenseCategoryCreateFormValues,
  type ExpenseCategoryUpdateFormValues,
} from "../schemas/expense-category";

export function ExpenseCategoryCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: ExpenseCategoryCreateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();

  const form = useForm<ExpenseCategoryCreateFormValues>({
    resolver: zodResolver(ExpenseCategoryCreateFormSchema) as Resolver<ExpenseCategoryCreateFormValues>,
    defaultValues: {
      code: "",
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {t("common:expense_categories_create_hint")}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common:expense_category_code")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    maxLength={32}
                    placeholder="office_supplies"
                    onChange={(e) => {
                      const v = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 32);
                      field.onChange(v);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:expense_categories_name_placeholder")}
            control={form.control}
            characterRestriction="none"
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("common:expense_category") })
              : t("common:save", { name: t("common:expense_category") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function ExpenseCategoryEditForm({
  category,
  onSubmit,
  isSubmitting,
}: {
  category: ExpenseCategory;
  onSubmit: (values: ExpenseCategoryUpdateFormValues) => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();

  const form = useForm<ExpenseCategoryUpdateFormValues>({
    resolver: zodResolver(ExpenseCategoryUpdateFormSchema) as Resolver<ExpenseCategoryUpdateFormValues>,
    defaultValues: {
      name: category.name,
      isActive: category.isActive,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("common:expense_category_code")}</p>
          <p className="mt-1 text-base font-semibold">{category.code}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            name="name"
            label={t("common:name")}
            placeholder={t("common:enter", { name: t("common:name") })}
            control={form.control}
            required
            characterRestriction="none"
            className="md:col-span-2"
          />
          <CheckboxField
            name="isActive"
            label={t("common:expense_categories_active_label")}
            control={form.control}
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("common:saving", { name: t("common:expense_category") })
              : t("common:save", { name: t("common:expense_category") })}
          </Button>
        </div>
      </form>
    </Form>
  );
}
