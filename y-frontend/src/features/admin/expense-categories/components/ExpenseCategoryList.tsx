import { useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useCreateExpenseCategory,
  useDeleteExpenseCategory,
  useExpenseCategories,
  useUpdateExpenseCategory,
} from "../hooks";
import type {
  ExpenseCategory,
  ExpenseCategoryCreateFormValues,
  ExpenseCategoryUpdateFormValues,
} from "../schemas/expense-category";
import { getExpenseCategoryColumns } from "./columns";
import { ExpenseCategoryCreateForm, ExpenseCategoryEditForm } from "./ExpenseCategoryForm";

export function ExpenseCategoryList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "code",
    sortDirection: "asc",
  });

  const { data, isLoading, isFetching, error } = useExpenseCategories({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createCategory, isPending: isCreating } = useCreateExpenseCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateExpenseCategory();
  const { mutate: deleteCategory } = useDeleteExpenseCategory();

  const handleCreateSubmit = (values: ExpenseCategoryCreateFormValues) => {
    createCategory(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const handleUpdateSubmit = (values: ExpenseCategoryUpdateFormValues) => {
    if (!editingCategory) {
      return;
    }

    updateCategory(
      { id: editingCategory.id, values },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingCategory(null);
        },
      },
    );
  };

  const columns = useDataTableColumns<ExpenseCategory>({
    customColumns: getExpenseCategoryColumns(t),
    onEdit: (category) => {
      setEditingCategory(category);
      setIsFormOpen(true);
    },
    onDelete: (category) => deleteCategory(category.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("sidebar:expenses:categories") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:expenses:categories")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("common:expense_categories_description")}
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("common:expense_category") })}
          </Button>
        </div>

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingCategory(null);
            }
          }}
          title={
            editingCategory
              ? t("common:edit", { name: t("common:expense_category") })
              : t("common:add", { name: t("common:expense_category") })
          }
          contentClassName="min-w-2xl max-h-[80vh] flex flex-col"
          description={t("common:expense_categories_form_description")}
        >
          {editingCategory ? (
            <ExpenseCategoryEditForm
              category={editingCategory}
              onSubmit={handleUpdateSubmit}
              isSubmitting={isUpdating}
            />
          ) : (
            <ExpenseCategoryCreateForm onSubmit={handleCreateSubmit} isSubmitting={isCreating} />
          )}
        </CustomDialog>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
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
