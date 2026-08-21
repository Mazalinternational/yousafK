import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDisplayLocale } from "@/utils/displayLocale";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import CustomDialog from "@/components/CustomDialog";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import { useCreateEmployee } from "../hooks/useCreateEmployee";
import { useDeleteEmployee } from "../hooks/useDeleteEmployee";
import { useEmployees } from "../hooks/useEmployees";
import { useUpdateEmployee } from "../hooks/useUpdateEmployee";
import type { Employee, EmployeeFormValues } from "../schemas/employee";
import { getEmployeeColumns } from "./columns";
import { EmployeeForm } from "./EmployeeForm";

export function EmployeeList() {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useEmployees({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const { mutate: deleteEmployee } = useDeleteEmployee();

  const handleSubmit = (values: EmployeeFormValues) => {
    if (editingEmployee) {
      updateEmployee(
        { id: editingEmployee.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingEmployee(null);
          },
        },
      );
      return;
    }

    createEmployee(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<Employee>({
    customColumns: getEmployeeColumns(t, locale),
    onEdit: (employee) => {
      setEditingEmployee(employee);
      setIsFormOpen(true);
    },
    editVisible: (employee) => employee.season?.status === "ACTIVE",
    onDelete: (employee) => deleteEmployee(employee.id),
    deleteVisible: (employee) => employee.season?.status === "ACTIVE",
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:employees:employees") })}
      />
    );
  }

  if (error) {
    return <StatusIndicator statusType="error" message={t("common:error_message")} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{t("sidebar:employees:employees")}</h2>
            <p className="text-sm text-muted-foreground">{t("common:employees_description")}</p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason}
          >
            <PlusIcon className="me-2 h-4 w-4" />
            {t("common:add", { name: t("admin:employees") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {t("common:no_active_season_employee_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingEmployee !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingEmployee(null);
            }
          }}
          title={
            editingEmployee
              ? t("common:edit", { name: t("admin:employees") })
              : t("common:add", { name: t("admin:employees") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:employee_form_description")}
        >
          <EmployeeForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingEmployee}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/yk/employees/${row.id}`)}
          onSearch={(search) => {
            setSearchTerm(search);
            setPagination((prev) => ({ ...prev, pageNumber: 1 }));
          }}
          pagination={pagination}
          sorting={sorting}
          onSortingChange={setSorting}
          onPaginationChange={setPagination}
          pageCount={data?.totalPages}
          totalCount={data?.totalCount ?? 0}
          isLoading={isFetching}
        />
      </div>
    </div>
  );
}
