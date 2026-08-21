import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { StatusIndicator } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sectionVariants, staggerContainerVariants } from "@/lib/motion";
import { dateFormatter } from "@/utils/dataFormatters";
import {
  formatDisplayAmount,
  formatDisplayNumber,
  getDisplayLocale,
} from "@/utils/displayLocale";
import { useEmployeeDashboard } from "../hooks/useEmployeeDashboard";

export function EmployeeDashboard() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const { data, isLoading, error } = useEmployeeDashboard();
  const [searchTerm, setSearchTerm] = useState("");

  const overviewCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.overview.map((item) => ({
      key: item.label,
      label: t(`common:${item.label}`),
      value:
        item.unit === "count"
          ? formatDisplayNumber(item.value, locale)
          : formatDisplayAmount(item.value, locale),
    }));
  }, [data, locale, t]);

  const filterEmployees = (employees: NonNullable<typeof data>["paidEmployees"]) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) =>
      [employee.name, employee.employeeNo, employee.position, employee.phoneNo]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  };

  const paidEmployees = useMemo(
    () => (data ? filterEmployees(data.paidEmployees) : []),
    [data, searchTerm],
  );
  const remainingEmployees = useMemo(
    () => (data ? filterEmployees(data.remainingEmployees) : []),
    [data, searchTerm],
  );

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:employees:dashboard") })}
      />
    );
  }

  if (error || !data) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <motion.div
        className="flex w-full min-w-0 flex-col gap-6"
        initial="initial"
        animate="animate"
        variants={staggerContainerVariants}
      >
        <motion.div variants={sectionVariants} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t("sidebar:employees:dashboard")}</h2>
          <p className="text-sm text-muted-foreground">{t("common:employees_dashboard_description")}</p>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {data.season ? (
            <Card className="border-s-4 border-s-cyan-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-3">
                  <span>{data.season.name}</span>
                  <Badge variant={data.season.status === "ACTIVE" ? "default" : "secondary"}>
                    {t(`common:${data.season.status === "ACTIVE" ? "active" : "closed"}`)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t("common:current_season_range", {
                    startDate: dateFormatter(data.season.startDate),
                    endDate: data.season.endDate
                      ? dateFormatter(data.season.endDate)
                      : t("common:ongoing"),
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              {t("common:no_active_season_employee_dashboard_hint")}
            </div>
          )}
        </motion.div>

        <motion.div variants={sectionVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card) => (
            <Card key={card.key}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={sectionVariants} className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("common:search_employee_salary_status")}
            className="max-w-sm"
          />
          <Button asChild variant="outline">
            <Link to="/yk/employees">{t("sidebar:employees:records")}</Link>
          </Button>
        </motion.div>

        <motion.div variants={sectionVariants}>
          <Tabs defaultValue="remaining" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="remaining">
                {t("common:remaining_employees")} ({formatDisplayNumber(remainingEmployees.length, locale)})
              </TabsTrigger>
              <TabsTrigger value="paid">
                {t("common:paid_employees")} ({formatDisplayNumber(paidEmployees.length, locale)})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="remaining">
              <EmployeeStatusList
                locale={locale}
                title={t("common:remaining_employees")}
                description={t("common:remaining_employees_description")}
                employees={remainingEmployees}
                emptyMessage={t("common:all_employees_paid")}
              />
            </TabsContent>

            <TabsContent value="paid">
              <EmployeeStatusList
                locale={locale}
                title={t("common:paid_employees")}
                description={t("common:paid_employees_description")}
                employees={paidEmployees}
                emptyMessage={t("common:no_paid_employees_yet")}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}

type EmployeeStatusListProps = {
  locale: string;
  title: string;
  description: string;
  employees: Array<{
    id: string;
    employeeNo: string;
    name: string;
    position: string;
    status: string;
    paymentStatus: "paid" | "partial_paid" | "remaining";
    phoneNo: string;
    monthlySalary: string;
    payableThisMonth: string;
    deductionsThisMonth: string;
    paidThisMonth: string;
    remainingAmount: string;
    weOweEmployeeAmount: string;
    lastPaymentDate?: string | null;
  }>;
  emptyMessage: string;
};

function EmployeeStatusList({
  locale,
  title,
  description,
  employees,
  emptyMessage,
}: EmployeeStatusListProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <Link
                key={employee.id}
                to={`/yk/employees/${employee.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.position} | {employee.employeeNo}
                    </p>
                  </div>
                  <Badge variant={employee.remainingAmount === "0.00" ? "default" : "secondary"}>
                    {t(`common:${employee.paymentStatus}`)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">{t("common:monthly_salary")}: </span>
                    <span className="tabular-nums">
                      {formatDisplayAmount(employee.monthlySalary, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common:payable_this_month")}: </span>
                    <span className="tabular-nums">
                      {formatDisplayAmount(employee.payableThisMonth, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common:deductions_this_month")}: </span>
                    <span className="tabular-nums">
                      {formatDisplayAmount(employee.deductionsThisMonth, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common:paid_this_month")}: </span>
                    <span className="tabular-nums">
                      {formatDisplayAmount(employee.paidThisMonth, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("common:salary_amount_remaining")}: </span>
                    <span className="tabular-nums">
                      {formatDisplayAmount(employee.remainingAmount, locale)}
                    </span>
                  </div>
                  {Number(employee.weOweEmployeeAmount) > 0 ? (
                    <div>
                      <span className="text-muted-foreground">
                        {t("common:employee_we_owe_this_month")}:{" "}
                      </span>
                      <span className="tabular-nums">
                        {formatDisplayAmount(employee.weOweEmployeeAmount, locale)}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground">{t("common:last_payment_date")}: </span>
                    {employee.lastPaymentDate ? dateFormatter(employee.lastPaymentDate) : "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
