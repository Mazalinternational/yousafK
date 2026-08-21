import { Download, Printer, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type LedgerPdfRowActionsProps = {
  rowKey: string;
  activeKey: string | null;
  onPrint: () => void;
  onShare: () => void;
  onDownload: () => void;
};

export function LedgerPdfRowActions({
  rowKey,
  activeKey,
  onPrint,
  onShare,
  onDownload,
}: LedgerPdfRowActionsProps) {
  const { t } = useTranslation();
  const busy = activeKey !== null;
  const isPrint = activeKey === `${rowKey}-print`;
  const isShare = activeKey === `${rowKey}-share`;
  const isDownload = activeKey === `${rowKey}-download`;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title={isPrint ? t("common:preparing_pdf") : t("common:print")}
        disabled={busy}
        onClick={onPrint}
      >
        <Printer className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title={isShare ? t("common:preparing_pdf") : t("common:report_share")}
        disabled={busy}
        onClick={onShare}
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title={isDownload ? t("common:preparing_pdf") : t("common:download")}
        disabled={busy}
        onClick={onDownload}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
