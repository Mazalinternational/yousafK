import { useState } from "react";
import { useTranslation } from "react-i18next";
import CustomDialog from "@/components/CustomDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSeason } from "../../paddy-warehouses/hooks/useActiveSeason";
import { useCreateStoreVarietySale } from "../hooks/useCreateStoreVarietySale";
import { useStoreVarietyStock } from "../hooks/useStoreVarietyStock";
import type { StoreType } from "../schemas/store";
import type { StoreVarietySaleFormValues } from "../schemas/store-variety-sale";
import {
  isPooledStoreType,
  POOLED_SALE_VARIETY,
} from "../utils/storePooledTypes";
import { formatWeightFromKg } from "@/utils/weightUnit";
import { formatDisplayNumber, getDisplayLocale } from "@/utils/displayLocale";
import { StoreVarietySaleForm } from "./StoreVarietySaleForm";

export function VarietyStockPanel({
  storeType,
  seasonId,
  canWrite,
}: {
  storeType: StoreType;
  seasonId?: string | null;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const pooled = isPooledStoreType(storeType);
  const { data, isLoading } = useStoreVarietyStock({ storeType, seasonId });
  const { data: activeSeason } = useActiveSeason();
  const { mutate: createSale, isPending: isCreating } = useCreateStoreVarietySale();
  const [sellVariety, setSellVariety] = useState<{
    variety: string;
    availableWeightKg: string;
  } | null>(null);

  const handleSubmit = (values: StoreVarietySaleFormValues) => {
    createSale(values, {
      onSuccess: () => setSellVariety(null),
    });
  };

  if (!seasonId) {
    return null;
  }

  const stockRow = pooled ? data?.varieties[0] : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {pooled
              ? t("common:store_pooled_stock_title")
              : t("common:store_variety_stock_title")}
          </CardTitle>
          <CardDescription>
            {pooled
              ? t("common:store_pooled_stock_description")
              : t("common:store_variety_stock_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("common:loading", { name: t("common:variety") })}
            </p>
          ) : pooled ? (
            !stockRow ? (
              <p className="text-sm text-muted-foreground">
                {t("common:store_variety_stock_empty")}
              </p>
            ) : (
              <PooledStockCard
                row={stockRow}
                canWrite={canWrite}
                seasonId={seasonId}
                onSell={() =>
                  setSellVariety({
                    variety: POOLED_SALE_VARIETY,
                    availableWeightKg: stockRow.availableWeightKg,
                  })
                }
              />
            )
          ) : (data?.varieties.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common:store_variety_stock_empty")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.varieties.map((row) => {
                const available = Number(row.availableWeightKg);
                const canSell = Number.isFinite(available) && available > 0.0001;
                const noStockLeft =
                  Number.isFinite(available) &&
                  Number(row.totalWeightKg) > 0 &&
                  available <= 0.0001;

                return (
                  <div
                    key={row.variety}
                    className="flex flex-col rounded-lg border bg-muted/20 p-3"
                  >
                    <p className="font-medium">{row.variety}</p>
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">{t("common:store_stock_total")}: </span>
                      <span className="font-semibold">{formatWeightFromKg(row.totalWeightKg, t)}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {t("common:store_stock_remaining")}:{" "}
                      </span>
                      <span className="font-semibold">{formatWeightFromKg(row.availableWeightKg, t)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t("common:store_entries_count", {
                        count: formatDisplayNumber(row.entryCount, locale),
                      })}
                    </p>
                    {noStockLeft ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("common:store_variety_no_stock_left")}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 hover:cursor-pointer"
                      disabled={!canSell || !seasonId || !canWrite}
                      onClick={() =>
                        setSellVariety({
                          variety: row.variety,
                          availableWeightKg: row.availableWeightKg,
                        })
                      }
                    >
                      {t("common:sell")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomDialog
        open={Boolean(sellVariety)}
        onOpenChange={(open) => {
          if (!open) setSellVariety(null);
        }}
        title={
          pooled
            ? t("common:store_pooled_sale_dialog_title")
            : t("common:store_variety_sale_dialog_title", {
                variety: sellVariety?.variety ?? "",
              })
        }
        description={t("common:store_variety_sale_dialog_description")}
        contentClassName={
          pooled
            ? "min-w-5xl max-w-7xl w-[min(98vw,80rem)] max-h-[90vh] flex flex-col overflow-y-auto"
            : undefined
        }
      >
        {sellVariety ? (
          <StoreVarietySaleForm
            activeSeason={activeSeason ?? null}
            storeType={storeType}
            variety={sellVariety.variety}
            availableWeightKg={sellVariety.availableWeightKg}
            pooled={pooled}
            onSubmit={handleSubmit}
            isSubmitting={isCreating}
          />
        ) : null}
      </CustomDialog>
    </>
  );
}

function PooledStockCard({
  row,
  canWrite,
  seasonId,
  onSell,
}: {
  row: {
    totalWeightKg: string;
    availableWeightKg: string;
    entryCount: number;
  };
  canWrite: boolean;
  seasonId: string;
  onSell: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = getDisplayLocale(i18n.language);
  const available = Number(row.availableWeightKg);
  const canSell = Number.isFinite(available) && available > 0.0001;
  const noStockLeft =
    Number.isFinite(available) &&
    Number(row.totalWeightKg) > 0 &&
    available <= 0.0001;

  return (
    <div className="flex max-w-md flex-col rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-medium">{t("common:store_pooled_stock_label")}</p>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">{t("common:store_stock_total")}: </span>
        <span className="font-semibold">{formatWeightFromKg(row.totalWeightKg, t)}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">{t("common:store_stock_remaining")}: </span>
        <span className="font-semibold">{formatWeightFromKg(row.availableWeightKg, t)}</span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("common:store_entries_count", {
          count: formatDisplayNumber(row.entryCount, locale),
        })}
      </p>
      {noStockLeft ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("common:store_variety_no_stock_left")}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="mt-3 hover:cursor-pointer"
        disabled={!canSell || !seasonId || !canWrite}
        onClick={onSell}
      >
        {t("common:sell")}
      </Button>
    </div>
  );
}
