import { Download, Printer, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type LedgerPdfAction = "download" | "share" | "print";

type LedgerPdfActionButtonsProps = {
  activeAction: LedgerPdfAction | null;
  disabled?: boolean;
  onPrint: () => void;
  onShare: () => void;
  onDownload: () => void;
};

export function LedgerPdfActionButtons({
  activeAction,
  disabled,
  onPrint,
  onShare,
  onDownload,
}: LedgerPdfActionButtonsProps) {
  const { t } = useTranslation();
  const busy = disabled || activeAction !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={onPrint} disabled={busy}>
        <Printer className="mr-2 h-4 w-4" />
        {activeAction === "print" ? t("common:preparing_pdf") : t("common:print")}
      </Button>
      <Button variant="outline" onClick={onShare} disabled={busy}>
        <Share2 className="mr-2 h-4 w-4" />
        {activeAction === "share" ? t("common:preparing_pdf") : t("common:report_share")}
      </Button>
      <Button variant="outline" onClick={onDownload} disabled={busy}>
        <Download className="mr-2 h-4 w-4" />
        {activeAction === "download" ? t("common:preparing_pdf") : t("common:download")}
      </Button>
    </div>
  );
}
