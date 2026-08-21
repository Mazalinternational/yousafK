import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CustomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  modal?: boolean;
  showOverlay?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
};

const baseOverlayClassName =
  "fixed inset-0 z-40 bg-black/30 dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export default function CustomDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  modal = false,
  showOverlay = true,
  contentClassName,
  overlayClassName,
  showCloseButton = true,
}: CustomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      {open && showOverlay && modal === false && (
        <div className={cn(baseOverlayClassName, overlayClassName)} />
      )}
      <DialogContent
        className={contentClassName}
        showCloseButton={showCloseButton}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
