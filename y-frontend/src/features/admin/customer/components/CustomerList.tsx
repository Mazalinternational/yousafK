import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import CustomDialog from "@/components/CustomDialog";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import { useAllowedCustomerTypes } from "../hooks/useAllowedCustomerTypes";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useCustomers } from "../hooks/useCustomers";
import { useDeleteCustomer } from "../hooks/useDeleteCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import type { Customer, CustomerFormValues } from "../schemas/customer";
import { getCustomerColumns } from "./columns";
import { CustomerForm } from "./CustomerForm";

export function CustomerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<{
    sortBy: string;
    sortDirection: "asc" | "desc";
  }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const { hasAnyTypeAccess } = useAllowedCustomerTypes();
  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = useCustomers({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();

  const handleSubmit = (values: CustomerFormValues) => {
    if (editingCustomer) {
      updateCustomer(
        { id: editingCustomer.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          },
        },
      );
      return;
    }

    createCustomer(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const columns = useDataTableColumns<Customer>({
    customColumns: getCustomerColumns(t),
    onEdit: (customer) => {
      setEditingCustomer(customer);
      setIsFormOpen(true);
    },
    editVisible: (customer) => customer.season.status === "ACTIVE",
    onDelete: (customer) => {
      deleteCustomer(customer.id);
    },
    deleteVisible: (customer) => customer.season.status === "ACTIVE",
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:customer:customers") })}
      />
    );
  }

  if (error) {
    return (
      <StatusIndicator statusType="error" message={t("common:error_message")} />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col p-4 md:p-6 lg:p-8">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">
              {t("sidebar:customer:customers")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("common:customer_description")}
            </p>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="hover:cursor-pointer"
            disabled={!canCreate || isLoadingActiveSeason || !hasAnyTypeAccess}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:customer") })}
          </Button>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_customer_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFormOpen || editingCustomer !== null}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingCustomer(null);
            }
          }}
          title={
            editingCustomer
              ? t("common:edit", { name: t("admin:customer") })
              : t("common:add", { name: t("admin:customer") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:customer_form_description")}
        >
          <CustomerForm
            activeSeason={activeSeason}
            defaultValues={editingCustomer}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/yk/customers/${row.id}`)}
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
