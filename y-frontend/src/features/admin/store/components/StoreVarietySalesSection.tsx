import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import CustomDialog from "@/components/CustomDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { Download, Printer, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { saveBlob } from "@/utils/saveBlob";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { getDisplayLocale } from "@/utils/displayLocale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSeason } from "../../paddy-warehouses/hooks/useActiveSeason";
import {
  useDeleteStoreVarietySale,
  useStoreVarietySales,
  useStoreVarietyStock,
  useUpdateStoreVarietySale,
} from "../hooks";
import type { StoreType } from "../schemas/store";
import type { StoreVarietySale, StoreVarietySaleFormValues } from "../schemas/store-variety-sale";
import { isPooledStoreType } from "../utils/storePooledTypes";
import {
  buildStoreVarietySalePdfBlob,
  openPdfPrintPreview,
  storeVarietySalePdfFileName,
} from "../utils/storeVarietySalePdf";
import { getStoreVarietySaleColumns } from "./varietySaleColumns";
import { StoreVarietySaleForm } from "./StoreVarietySaleForm";

export function StoreVarietySalesSection({
  storeType,
  seasonId,
  canWrite = false,
}: {
  storeType: StoreType;
  seasonId?: string | null;
  canWrite?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const pooled = isPooledStoreType(storeType);
  const { data: activeSeason } = useActiveSeason();
  const { data: stockData } = useStoreVarietyStock({ storeType, seasonId });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const [activePdfAction, setActivePdfAction] = useState<"download" | "share" | "print" | null>(
    null,
  );
  const [editingSale, setEditingSale] = useState<StoreVarietySale | null>(null);

  const { data, isLoading, isFetching } = useStoreVarietySales({
    storeType,
    seasonId,
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: updateSale, isPending: isUpdating } = useUpdateStoreVarietySale();
  const { mutate: deleteSale } = useDeleteStoreVarietySale();

  const editAvailableWeightKg = useMemo(() => {
    const baseKg = Number(
      pooled ? (stockData?.varieties[0]?.availableWeightKg ?? 0) : 0,
    );
    const currentSaleKg = Number(
      editingSale?.fromStockWeightKg ?? editingSale?.soldWeightKg ?? 0,
    );

    if (!editingSale || Number.isNaN(baseKg) || Number.isNaN(currentSaleKg)) {
      return pooled ? (stockData?.varieties[0]?.availableWeightKg ?? "0") : "0";
    }

    return (baseKg + currentSaleKg).toFixed(2);
  }, [editingSale, pooled, stockData?.varieties]);

  const runPdfAction = async (
    sale: StoreVarietySale,
    action: "download" | "share" | "print",
  ) => {
    setActivePdfAction(action);
    try {
      const blob = await buildStoreVarietySalePdfBlob(sale, t);
      const fileName = storeVarietySalePdfFileName(sale);

      if (action === "print") {
        openPdfPrintPreview(blob, t);
        return;
      }

      if (action === "download") {
        saveBlob(blob, fileName);
        return;
      }

      const pdfFile = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: sale.billNo,
          files: [pdfFile],
        });
        return;
      }

      saveBlob(blob, fileName);
      toast.message(t("common:salary_ledger_share_fallback"));
    } catch (error) {
      toast.error(getErrorMessage(error, t));
    } finally {
      setActivePdfAction(null);
    }
  };

  const handleEditSubmit = (values: StoreVarietySaleFormValues) => {
    if (!editingSale) {
      return;
    }

    updateSale(
      { id: editingSale.id, values },
      {
        onSuccess: () => setEditingSale(null),
      },
    );
  };

  const columns = useDataTableColumns<StoreVarietySale>({
    customColumns: getStoreVarietySaleColumns(t, { hideVariety: pooled, locale }),
    onEdit: pooled && canWrite ? (sale) => setEditingSale(sale) : undefined,
    onDelete: pooled && canWrite ? (sale) => deleteSale(sale.id) : undefined,
    editVisible: () => pooled && canWrite,
    deleteVisible: () => pooled && canWrite,
    customActions: [
      {
        label: t("common:print"),
        icon: <Printer className="size-4" />,
        action: (sale) => void runPdfAction(sale, "print"),
        disabled: () => activePdfAction !== null,
      },
      {
        label: t("common:download"),
        icon: <Download className="size-4" />,
        action: (sale) => void runPdfAction(sale, "download"),
        disabled: () => activePdfAction !== null,
      },
      {
        label: t("common:share"),
        icon: <Share2 className="size-4" />,
        action: (sale) => void runPdfAction(sale, "share"),
        disabled: () => activePdfAction !== null,
      },
    ],
  });

  if (!seasonId) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {pooled ? t("common:store_pooled_sales_title") : t("common:store_variety_sales_title")}
          </CardTitle>
          <CardDescription>
            {pooled
              ? t("common:store_pooled_sales_description")
              : t("common:store_variety_sales_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            isLoading={isLoading || isFetching}
          />
        </CardContent>
      </Card>

      <CustomDialog
        open={Boolean(editingSale)}
        onOpenChange={(open) => {
          if (!open) setEditingSale(null);
        }}
        title={
          editingSale
            ? t("common:store_variety_sale_edit_dialog_title", {
                billNo: editingSale.billNo,
              })
            : ""
        }
        description={t("common:store_variety_sale_dialog_description")}
        contentClassName="min-w-5xl max-w-7xl w-[min(98vw,80rem)] max-h-[90vh] flex flex-col overflow-y-auto"
      >
        {editingSale ? (
          <StoreVarietySaleForm
            activeSeason={activeSeason ?? null}
            storeType={storeType}
            variety={editingSale.variety}
            availableWeightKg={editAvailableWeightKg}
            pooled={pooled}
            initialSale={editingSale}
            onSubmit={handleEditSubmit}
            isSubmitting={isUpdating}
          />
        ) : null}
      </CustomDialog>
    </>
  );
}
