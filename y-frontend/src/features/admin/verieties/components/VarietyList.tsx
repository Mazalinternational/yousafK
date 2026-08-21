import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VERIETY_KIND_PATHS, VERIETY_PATH_TO_KIND, type VerietyPathSegment } from "../constants";
import {
  useCreateVariety,
  useDeleteVariety,
  useUpdateVariety,
  useVarieties,
} from "../hooks";
import type { Variety, VarietyCreateFormValues, VarietyUpdateFormValues } from "../schemas/variety";
import { getVarietyColumns } from "./columns";
import { VarietyCreateForm, VarietyEditForm } from "./VarietyForm";

const PAGE_TITLE_KEY: Record<VerietyPathSegment, string> = {
  rice: "sidebar:veriety:rice_veriety",
  paddy: "sidebar:veriety:paddy_veriety",
};

function isVerietyPathSegment(s: string): s is VerietyPathSegment {
  return (VERIETY_KIND_PATHS as readonly string[]).includes(s);
}

export function VarietyList() {
  const { kind: pathSegment = "" } = useParams<{ kind: string }>();
  const { t } = useTranslation();

  if (!isVerietyPathSegment(pathSegment)) {
    return <Navigate to="/yk/verieties/rice" replace />;
  }

  const kind = VERIETY_PATH_TO_KIND[pathSegment];
  const pageTitle = t(PAGE_TITLE_KEY[pathSegment]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Variety | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "code",
    sortDirection: "asc",
  });

  const { data, isLoading, isFetching, error } = useVarieties(kind, {
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });

  const { mutate: createVariety, isPending: isCreating } = useCreateVariety(kind);
  const { mutate: updateVariety, isPending: isUpdating } = useUpdateVariety(kind);
  const { mutate: deleteVariety } = useDeleteVariety(kind);

  const handleCreateSubmit = (values: VarietyCreateFormValues) => {
    createVariety(values, { onSuccess: () => setIsFormOpen(false) });
  };

  const handleUpdateSubmit = (values: VarietyUpdateFormValues) => {
    if (!editing) {
      return;
    }

    updateVariety(
      { id: editing.id, values },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditing(null);
        },
      },
    );
  };

  const columns = useDataTableColumns<Variety>({
    customColumns: getVarietyColumns(t),
    onEdit: (row) => {
      setEditing(row);
      setIsFormOpen(true);
    },
    onDelete: (row) => deleteVariety(row.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: pageTitle })}
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
            <h2 className="text-lg font-bold">{pageTitle}</h2>
            <p className="text-sm text-muted-foreground">{t("common:verieties_description")}</p>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            className="hover:cursor-pointer"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("common:add", { name: t("admin:veriety") })}
          </Button>
        </div>

        <CustomDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditing(null);
            }
          }}
          title={
            editing
              ? t("common:edit", { name: t("admin:veriety") })
              : t("common:add", { name: t("admin:veriety") })
          }
          contentClassName="min-w-2xl max-h-[80vh] flex flex-col"
          description={t("common:verieties_form_description")}
        >
          {editing ? (
            <VarietyEditForm
              variety={editing}
              onSubmit={handleUpdateSubmit}
              isSubmitting={isUpdating}
            />
          ) : (
            <VarietyCreateForm onSubmit={handleCreateSubmit} isSubmitting={isCreating} />
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
