import { useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import { DataTable } from "@/components/data-table";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTableColumns } from "@/hooks/use-datatable-columns";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeasonWriteAccess } from "../../seasons/hooks/useSeasonWriteAccess";
import {
  useCompletePaddyProcess,
  useCreatePaddyProcess,
  useDeletePaddyProcess,
  usePaddyProcesses,
  useUpdatePaddyProcess,
} from "../hooks";
import { useCreateStoreEntry } from "../../store/hooks";
import { StoreEntryForm } from "../../store/components/StoreEntryForm";
import type { StoreStockFormValues, StoreType } from "../../store/schemas/store";
import { ProcessRiceForm } from "../../process-rice/components/ProcessRiceForm";
import { useCreateProcessRice } from "../../process-rice/hooks";
import type { ProcessRiceFormValues } from "../../process-rice/schemas/process-rice";
import type { PaddyProcess, PaddyProcessFormValues } from "../schemas/paddy-process";
import {
  canAddProcessOutputs,
  hasStoreOutput,
  isPaddyProcessCompleted,
  OUTPUT_HIGHLIGHT_CLASS,
} from "../utils/paddy-process-state";
import { getPaddyProcessColumns } from "./columns";
import { PaddyProcessForm } from "./PaddyProcessForm";
import { PaddyProcessFromStoreForm } from "./PaddyProcessFromStoreForm";
import { isPaddyProcessFromStoreSource } from "../utils/paddy-process-api";
import type { PaddyProcessFromStoreFormValues } from "../schemas/paddy-process";

export function PaddyProcessList() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFromStoreFormOpen, setIsFromStoreFormOpen] = useState(false);
  const [editingPaddyProcess, setEditingPaddyProcess] = useState<PaddyProcess | null>(null);
  const [completingPaddyProcess, setCompletingPaddyProcess] = useState<PaddyProcess | null>(null);
  const [addingToStore, setAddingToStore] = useState<{
    storeType: StoreType;
    paddyProcess: PaddyProcess;
  } | null>(null);
  const [addingToProcessRice, setAddingToProcessRice] = useState<PaddyProcess | null>(null);
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

  const { activeSeason, isLoadingActiveSeason, canCreate } = useSeasonWriteAccess();
  const { data, isLoading, isFetching, error } = usePaddyProcesses({
    ...pagination,
    query: debouncedSearchTerm,
    sortBy: sorting.sortBy,
    sortByAction: sorting.sortDirection,
  });
  const { mutate: createPaddyProcess, isPending: isCreating } = useCreatePaddyProcess();
  const { mutate: completePaddyProcess } = useCompletePaddyProcess();
  const { mutate: updatePaddyProcess, isPending: isUpdating } = useUpdatePaddyProcess();
  const { mutate: deletePaddyProcess } = useDeletePaddyProcess();
  const { mutate: createStoreEntry, isPending: isCreatingStoreEntry } = useCreateStoreEntry();
  const { mutate: createProcessRice, isPending: isCreatingProcessRice } =
    useCreateProcessRice();

  const handleSubmit = (values: PaddyProcessFormValues) => {
    if (editingPaddyProcess) {
      updatePaddyProcess(
        { id: editingPaddyProcess.id, values },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingPaddyProcess(null);
          },
        },
      );
      return;
    }

    createPaddyProcess(values, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const handleFromStoreSubmit = (values: PaddyProcessFromStoreFormValues) => {
    if (editingPaddyProcess) {
      updatePaddyProcess(
        { id: editingPaddyProcess.id, values },
        {
          onSuccess: () => {
            setIsFromStoreFormOpen(false);
            setEditingPaddyProcess(null);
          },
        },
      );
      return;
    }

    createPaddyProcess(values, {
      onSuccess: () => setIsFromStoreFormOpen(false),
    });
  };

  const editingFromStore =
    editingPaddyProcess !== null &&
    isPaddyProcessFromStoreSource(editingPaddyProcess.stockSourceType);

  const handleStoreSubmit = (values: StoreStockFormValues) => {
    createStoreEntry(values, {
      onSuccess: () => setAddingToStore(null),
    });
  };

  const handleProcessRiceSubmit = (values: ProcessRiceFormValues) => {
    createProcessRice(values, {
      onSuccess: () => setAddingToProcessRice(null),
    });
  };

  const storeSubActions: Array<{
    storeType: StoreType;
    labelKey: "regection" | "broken_rice" | "short_green" | "waste";
  }> = [
    { storeType: "regection", labelKey: "regection" },
    { storeType: "broken_rice", labelKey: "broken_rice" },
    { storeType: "short_green", labelKey: "short_green" },
    { storeType: "waste", labelKey: "waste" },
  ];

  const columns = useDataTableColumns<PaddyProcess>({
    customColumns: getPaddyProcessColumns(t),
    customActions: [
      {
        label: t("common:add_to_store"),
        disabled: (paddyProcess) => !canAddProcessOutputs(paddyProcess),
        subActions: storeSubActions.map(({ storeType, labelKey }) => ({
          label: t(`common:${labelKey}`),
          className: (paddyProcess) =>
            hasStoreOutput(paddyProcess as PaddyProcess, storeType)
              ? OUTPUT_HIGHLIGHT_CLASS
              : undefined,
          disabled: (paddyProcess) =>
            !canAddProcessOutputs(paddyProcess as PaddyProcess) ||
            hasStoreOutput(paddyProcess as PaddyProcess, storeType),
          action: (paddyProcess) =>
            setAddingToStore({
              storeType,
              paddyProcess: paddyProcess as PaddyProcess,
            }),
        })),
      },
      {
        label: t("common:add_to_rice"),
        className: (paddyProcess) =>
          paddyProcess.riceExtracted ? OUTPUT_HIGHLIGHT_CLASS : undefined,
        disabled: (paddyProcess) =>
          !canAddProcessOutputs(paddyProcess) || Boolean(paddyProcess.riceExtracted),
        action: (paddyProcess) => setAddingToProcessRice(paddyProcess),
      },
      {
        label: t("common:process_completed"),
        action: (paddyProcess) => setCompletingPaddyProcess(paddyProcess),
        visible: (paddyProcess) => !isPaddyProcessCompleted(paddyProcess),
        disabled: (paddyProcess) => isPaddyProcessCompleted(paddyProcess),
      },
    ],
    onEdit: (paddyProcess) => {
      setEditingPaddyProcess(paddyProcess);
      if (isPaddyProcessFromStoreSource(paddyProcess.stockSourceType)) {
        setIsFromStoreFormOpen(true);
        return;
      }
      setIsFormOpen(true);
    },
    onDelete: (paddyProcess) => deletePaddyProcess(paddyProcess.id),
  });

  if (isLoading) {
    return (
      <StatusIndicator
        statusType="loading"
        message={t("common:loading", { name: t("admin:paddy_process") })}
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
            <h2 className="text-lg font-bold">{t("sidebar:paddy_process:records")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("common:paddy_process_description")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("common:process_outputs_after_completion_hint")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="hover:cursor-pointer"
              disabled={!canCreate || isLoadingActiveSeason}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("common:add", { name: t("admin:paddy_process") })}
            </Button>

            <Button
              onClick={() => setIsFromStoreFormOpen(true)}
              variant="outline"
              className="hover:cursor-pointer"
              disabled={!canCreate || isLoadingActiveSeason}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("common:add_from_store")}
            </Button>
          </div>
        </div>

        {!activeSeason && !isLoadingActiveSeason ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("common:no_active_season_paddy_process_hint")}
          </div>
        ) : null}

        <CustomDialog
          open={isFromStoreFormOpen || editingFromStore}
          onOpenChange={(open) => {
            setIsFromStoreFormOpen(open);
            if (!open) {
              setEditingPaddyProcess(null);
            }
          }}
          title={
            editingPaddyProcess && editingFromStore
              ? t("common:edit", { name: t("admin:paddy_process") })
              : t("common:add_from_store")
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:paddy_process_from_store_form_description")}
        >
          <PaddyProcessFromStoreForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingFromStore ? editingPaddyProcess : null}
            onSubmit={handleFromStoreSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <CustomDialog
          open={isFormOpen || (editingPaddyProcess !== null && !editingFromStore)}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingPaddyProcess(null);
            }
          }}
          title={
            editingPaddyProcess
              ? t("common:edit", { name: t("admin:paddy_process") })
              : t("common:add", { name: t("admin:paddy_process") })
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:paddy_process_form_description")}
        >
          <PaddyProcessForm
            activeSeason={activeSeason ?? null}
            defaultValues={editingPaddyProcess}
            onSubmit={handleSubmit}
            isSubmitting={isCreating || isUpdating}
          />
        </CustomDialog>

        <CustomDialog
          open={addingToStore !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddingToStore(null);
            }
          }}
          title={
            addingToStore
              ? t("common:add", { name: t(`common:${addingToStore.storeType}`) })
              : t("common:add_to_store")
          }
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={
            addingToStore
              ? t("common:store_form_description", {
                  store: t(`common:${addingToStore.storeType}`),
                })
              : t("common:add_to_store")
          }
        >
          {addingToStore ? (
            <StoreEntryForm
              activeSeason={activeSeason ?? null}
              storeType={addingToStore.storeType}
              initialSourcePaddyProcessId={addingToStore.paddyProcess.id}
              lockSourceSelection
              lockedSourceProcess={{
                sourcePaddyProcessId: addingToStore.paddyProcess.id,
                billNo: addingToStore.paddyProcess.billNo,
                variety: addingToStore.paddyProcess.variety,
                date: addingToStore.paddyProcess.date,
                weight: addingToStore.paddyProcess.weight,
                unit: addingToStore.paddyProcess.unit,
                ownerName:
                  addingToStore.paddyProcess.sourceCompanyPaddyWarehouse?.ownerName ??
                  addingToStore.paddyProcess.sourceFarmerPaddyWarehouse?.ownerName ??
                  "",
                paddyWarehouseBillNo:
                  addingToStore.paddyProcess.sourceCompanyPaddyWarehouse?.billNo ??
                  addingToStore.paddyProcess.sourceFarmerPaddyWarehouse?.billNo ??
                  "",
              }}
              onSubmit={handleStoreSubmit}
              isSubmitting={isCreatingStoreEntry}
            />
          ) : null}
        </CustomDialog>

        <CustomDialog
          open={addingToProcessRice !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddingToProcessRice(null);
            }
          }}
          title={t("common:add", { name: t("admin:process_rice") })}
          contentClassName="min-w-4xl max-h-[80vh] flex flex-col"
          description={t("common:process_rice_form_description")}
        >
          {addingToProcessRice ? (
            <ProcessRiceForm
              activeSeason={activeSeason ?? null}
              defaultValues={null}
              initialSourcePaddyProcessId={addingToProcessRice.id}
              lockSourceSelection
              compactFromProcess
              sourcePreview={{
                billNo: addingToProcessRice.billNo,
                variety: addingToProcessRice.variety,
                date: addingToProcessRice.date,
              }}
              onSubmit={handleProcessRiceSubmit}
              isSubmitting={isCreatingProcessRice}
            />
          ) : null}
        </CustomDialog>

        <Dialog
          open={completingPaddyProcess !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCompletingPaddyProcess(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common:confirm_process_completion")}</DialogTitle>
              <DialogDescription>
                {t("common:confirm_process_completion_description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompletingPaddyProcess(null)}
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="button"
                disabled={completingPaddyProcess?.status === "process_completed"}
                onClick={() => {
                  if (!completingPaddyProcess) {
                    return;
                  }

                  completePaddyProcess(completingPaddyProcess.id, {
                    onSuccess: () => setCompletingPaddyProcess(null),
                  });
                }}
              >
                {t("common:process_completed")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
