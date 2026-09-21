import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SimpleTablePaginationProps = {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onChange: (next: { pageNumber: number; pageSize: number }) => void;
  pageSizeOptions?: number[];
};

export function SimpleTablePagination({
  pageNumber,
  pageSize,
  totalCount,
  onChange,
  pageSizeOptions = [10, 20, 30, 50],
}: SimpleTablePaginationProps) {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const to = Math.min(pageNumber * pageSize, totalCount);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("common:showing_from_to_of_entries", { from, to, total: totalCount })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{t("common:rows_per_page")}</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) =>
              onChange({ pageNumber: 1, pageSize: Number(value) })
            }
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onChange({ pageNumber: pageNumber - 1, pageSize })}
            disabled={pageNumber <= 1}
          >
            <span className="sr-only">{t("common:go_to_previous_page")}</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-[90px] text-center text-sm font-medium">
            {t("common:page")} {pageNumber} {t("common:of")} {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onChange({ pageNumber: pageNumber + 1, pageSize })}
            disabled={pageNumber >= pageCount}
          >
            <span className="sr-only">{t("common:go_to_next_page")}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
