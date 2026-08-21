// utils/useDataTableColumns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DropdownWithSubActions from "@/components/ui/dropdown-sub-actions";
type CustomAction<T> = {
  label: string;
  action?: (item: T) => void;
  link?: (item: T) => string;
  className?: string | ((item: T) => string | undefined);
  icon?: React.ReactNode;
  visible?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
  subActions?: CustomAction<T>[];
};
type UseDataTableColumnsProps<T> = {
  onChangeField?: (item: T) => void;
  onEdit?: (item: T) => void;
  editVisible?: (item: T) => boolean;
  onDelete?: (item: T) => void;
  deleteVisible?: (item: T) => boolean;
  customColumns: ColumnDef<T>[];
  customActions?: CustomAction<T>[];
};

export function useDataTableColumns<T>({
  onDelete,
  onEdit,
  editVisible,
  deleteVisible,
  customActions = [],
  customColumns,
}: UseDataTableColumnsProps<T>): ColumnDef<T>[] {
  const { t } = useTranslation();
  return [
    ...customColumns,
    {
      id: "actions",
      header: t("common:actions"),
      cell: ({ row }) => {
        const item = row.original;
        const [open, setOpen] = useState(false);
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:cursor-pointer"
                  data-row-click-ignore="true"
                >
                  <span className="sr-only">{t("common:open_menu")}</span>
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {customActions
                  .filter((action) => action.visible?.(item) !== false)
                  .map((action, index) => {
                    if (action.subActions) {
                      return (
                        <DropdownWithSubActions
                          key={index}
                          action={{
                            label: action.label,
                            disabled: action.disabled
                              ? (rowItem: unknown) =>
                                  action.disabled!(rowItem as T)
                              : undefined,
                            subActions: (action.subActions ?? []) as Parameters<
                              typeof DropdownWithSubActions
                            >[0]["action"]["subActions"],
                          }}
                          item={item}
                          index={index}
                        />
                      );
                    }

                    // If the action has a link, render it as a link item
                    if (action.link) {
                      return (
                        <DropdownMenuItem
                          key={index}
                          asChild
                          disabled={action.disabled?.(item)}
                        >
                          <Link
                            to={action.link(item)}
                            className={`hover:cursor-pointer ${
                              action.className || ""
                            }`}
                          >
                            {action.icon && (
                              <span className="mr-2">{action.icon}</span>
                            )}
                            {action.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    }

                    // Otherwise, just render the action as a menu item
                    const resolvedClassName =
                      typeof action.className === "function"
                        ? action.className(item)
                        : action.className;

                    return (
                      <DropdownMenuItem
                        key={index}
                        className={`hover:cursor-pointer  ${
                          resolvedClassName || ""
                        }`}
                        onClick={(e) => { e.stopPropagation(); action.action?.(item)}}
                        disabled={action.disabled?.(item)}
                      >
                        {action.icon && (
                          <span className="mr-2">{action.icon}</span>
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                {onEdit && (editVisible?.(item) ?? true) && (
                  <DropdownMenuItem
                    className="hover:cursor-pointer"
                    data-row-click-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    {t("common:edit_in_actions")}
                  </DropdownMenuItem>
                )}
                {onDelete && (deleteVisible?.(item) ?? true) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setTimeout(() => setOpen(true), 0); // defer dialog opening
                    }}
                    data-row-click-ignore="true"
                    className="text-red-600 hover:cursor-pointer"
                  >
                    {t("common:delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {onDelete && (deleteVisible?.(item) ?? true) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("common:confirm_deletion")}</DialogTitle>
                    <DialogDescription>
                      {t("common:confirm_deletion_description")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      data-row-click-ignore="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                      }}
                    >
                      {t("common:cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      data-row-click-ignore="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                        setOpen(false);
                      }}
                    >
                      {t("common:delete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        );
      },
    },
  ];
}
