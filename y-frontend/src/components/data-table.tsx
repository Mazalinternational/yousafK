import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  type Column,
} from "@tanstack/react-table";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Search,
} from "lucide-react";
import { TableSkeleton } from "@/components/table-skeleton";
import { useTranslation } from "react-i18next";
import RowSelectionCheckbox from "./row-selection-checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { sectionVariants, staggerContainerVariants, tableRowVariants } from "@/lib/motion";

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='menuitem']",
  "[data-row-click-ignore='true']",
].join(",");

interface DataTableProps<TData, TValue> {
  columns: (ColumnDef<TData, TValue> & {
    enableSorting?: boolean;
  })[];
  data: TData[];
  pageCount?: number;
  pagination?: {
    pageNumber: number;
    pageSize: number;
  };
  sorting?: {
    sortBy: string;
    sortDirection: "desc" | "asc";
  };
  onPaginationChange?: (pagination: {
    pageNumber: number;
    pageSize: number;
  }) => void;
  onSortingChange?: (sorting: {
    sortBy: string;
    sortDirection: "desc" | "asc";
  }) => void;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  totalCount?: number;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
  enableRowSelection?: boolean | ((row: { original: TData }) => boolean);
  showSelectAll?: boolean;
  bulkActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedData: TData[]) => void;
  };
  filterTrigger?: React.ReactNode;
  onRowClick?: (data: TData) => void;
}
export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount = -1,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onSearch,
  searchPlaceholder,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = true,
  showSelectAll = true,
  bulkActions,
  filterTrigger,
  isLoading = false,
  totalCount = 0,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir();
  const prefersReducedMotion = useReducedMotion();

  const [columnVisibility, setColumnVisibility] = useState({});

  const shouldIgnoreRowClick = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(target.closest(INTERACTIVE_SELECTOR));
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: !!onPaginationChange,
    manualSorting: !!onSortingChange,
    pageCount,
    enableRowSelection,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const newState =
            updater instanceof Function
              ? updater(table.getState().rowSelection)
              : updater;
          onRowSelectionChange(newState);
        }
      : undefined,

    state: {
      pagination: pagination
        ? {
            pageIndex: pagination.pageNumber - 1,
            pageSize: pagination.pageSize,
          }
        : undefined,
      sorting: sorting
        ? [
            {
              id: sorting.sortBy,
              desc: sorting.sortDirection === "desc" ? true : false,
            },
          ]
        : [],
      rowSelection: rowSelection ?? {},
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (!onPaginationChange) return;

      const newState =
        updater instanceof Function
          ? updater({
              pageIndex: pagination ? pagination.pageNumber - 1 : 0,
              pageSize: pagination?.pageSize || 10,
            })
          : updater;

      onPaginationChange({
        pageNumber: newState.pageIndex + 1,
        pageSize: newState.pageSize,
      });
    },
    onSortingChange: (updater) => {
      if (!onSortingChange) return;

      const newState =
        updater instanceof Function
          ? updater([
              {
                id: sorting?.sortBy || "",
                desc: sorting?.sortDirection === "desc" ? true : false,
              },
            ])
          : updater;

      if (newState.length > 0) {
        onSortingChange({
          sortBy: newState[0].id,
          sortDirection: newState[0].desc ? "desc" : "asc",
        });
      } else {
        onSortingChange({
          sortBy: "",
          sortDirection: "asc",
        });
      }
    },
  });

  function SortableHeader({
    column,
    children,
  }: {
    column: Column<TData, unknown>;
    children: React.ReactNode;
  }) {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "desc")}
        className="p-0! hover:bg-transparent hover:cursor-pointer"
      >
        {children}
        <ArrowUpDown className="size-4 -ml-1" />
      </Button>
    );
  }

  return (
    <motion.div
      className="w-full min-w-0"
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
    >
      <motion.div
        variants={sectionVariants}
        className="rounded-t-md border px-6 py-4 flex flex-row-reverse items-center justify-between gap-4 border-b-muted/50"
      >
        <div className="flex gap-4">
          <div>
            {onSearch && (
              <div className="flex items-center relative">
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 rtl:rotate-90" />
                <Input
                  placeholder={searchPlaceholder ?? t("common:search")}
                  onChange={(event) => onSearch(event.target.value)}
                  className=" ps-10 bg-background/80 w-[200px]"
                />
              </div>
            )}
          </div>
          {filterTrigger}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isRtl === "rtl" ? "start" : "end"}
              className="w-48 max-h-60 overflow-y-auto "
            >
              {table.getAllColumns().map((column) => {
                if (!column.getCanHide()) return null;
                return (
                  <DropdownMenuItem
                    key={column.id}
                    className="capitalize p-0 text-start"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Label className="flex flex-row items-center w-full gap-2 px-2 py-1.5 cursor-pointer text-start rtl:flex-row-reverse">
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) => {
                          if (typeof checked === "boolean") {
                            column.toggleVisibility(checked);
                          }
                        }}
                      />
                      <span>
                        {typeof column.columnDef.header === "string"
                          ? column.columnDef.header
                          : column.id}
                      </span>
                    </Label>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 items-center">
          {bulkActions &&
            rowSelection &&
            Object.keys(rowSelection).some((key) => rowSelection[key]) && (
              <motion.div
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    const selectedData = table
                      .getSelectedRowModel()
                      .rows.map((row) => row.original);
                    bulkActions.onClick(selectedData);
                  }}
                >
                  {bulkActions.icon && (
                    <span className="mr-2">{bulkActions.icon}</span>
                  )}
                  {bulkActions.label}
                </Button>
              </motion.div>
            )}
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {rowSelection &&
          Object.keys(rowSelection).some((key) => rowSelection[key]) && (
          <motion.div
            layout
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border px-4 py-2 flex items-center justify-between gap-4 border-b-muted/50 overflow-hidden"
          >
            <span className="text-sm text-muted-foreground">
              {Object.values(rowSelection).filter(Boolean).length}{" "}
              {t("common:selected")}
            </span>
            <div>
              {Object.values(rowSelection).filter(Boolean).length <
                data.length && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => table.toggleAllRowsSelected(true)}
                >
                  {t("common:select_all")} ({data.length})
                </Button>
              )}

              <Button
                variant="link"
                size="sm"
                onClick={() => table.toggleAllRowsSelected(false)}
              >
                {t("common:deselect_all")}
              </Button>
            </div>
          </motion.div>
          )}
      </AnimatePresence>
      {isLoading ? (
        <TableSkeleton totalHeaders={columns.length} />
      ) : (
        <>
          {/* Table */}
          <motion.div variants={sectionVariants} className="w-full overflow-x-auto border">
            <Table>
              <TableHeader className="bg-secondary/70">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {onRowSelectionChange && showSelectAll && (
                      <TableHead>
                        <RowSelectionCheckbox
                          checked={table.getIsAllPageRowsSelected()}
                          onChange={table.getToggleAllPageRowsSelectedHandler()}
                        />
                      </TableHead>
                    )}
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : isSortable ? (
                            <div className="flex items-center">
                              <SortableHeader column={header.column}>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </SortableHeader>
                            </div>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  <AnimatePresence initial={false}>
                    {table.getRowModel().rows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        layout={!prefersReducedMotion}
                        initial={prefersReducedMotion ? false : "initial"}
                        animate="animate"
                        exit="exit"
                        variants={tableRowVariants}
                        transition={
                          prefersReducedMotion
                            ? undefined
                            : {
                                duration: 0.2,
                                delay: Math.min(index * 0.025, 0.18),
                              }
                        }
                        data-state={row.getIsSelected() && "selected"}
                        className={`hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors ${
                          onRowClick ? "cursor-pointer" : ""
                        }`}
                        onClick={(event) => {
                          if (!onRowClick || shouldIgnoreRowClick(event.target)) {
                            return;
                          }

                          onRowClick(row.original);
                        }}
                      >
                        {onRowSelectionChange && (
                          <TableCell className="w-12" data-row-click-ignore="true">
                            <RowSelectionCheckbox
                              checked={row.getIsSelected()}
                              onChange={row.getToggleSelectedHandler()}
                            />
                          </TableCell>
                        )}
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <motion.tr
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {t("common:no_results")}
                    </TableCell>
                  </motion.tr>
                )}
              </TableBody>
            </Table>
          </motion.div>

          {/* Pagination Controls */}
          {pagination && (
            <motion.div
              variants={sectionVariants}
              className="flex items-center justify-between px-2 mt-4"
            >
              <div className="flex-1 text-sm text-muted-foreground">
                {t("common:showing_from_to_of_entries", {
                  from: (pagination.pageNumber - 1) * pagination.pageSize + 1,
                  to: Math.min(
                    pagination.pageNumber * pagination.pageSize,
                    totalCount,
                  ),
                  total: totalCount,
                })}
              </div>

              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">
                    {t("common:rows_per_page")}
                  </p>
                  <Select
                    value={`${pagination.pageSize}`}
                    onValueChange={(value) => {
                      onPaginationChange?.({
                        pageNumber: 1, // Reset to first page when changing page size
                        pageSize: Number(value),
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() =>
                      onPaginationChange?.({
                        pageNumber: 1,
                        pageSize: pagination.pageSize,
                      })
                    }
                    disabled={pagination.pageNumber === 1}
                  >
                    <span className="sr-only">
                      {t("common:go_to_first_page")}
                    </span>
                    <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      onPaginationChange?.({
                        pageNumber: pagination.pageNumber - 1,
                        pageSize: pagination.pageSize,
                      })
                    }
                    disabled={pagination.pageNumber === 1}
                  >
                    <span className="sr-only">
                      {t("common:go_to_previous_page")}
                    </span>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    {t("common:page")} {pagination.pageNumber} {t("common:of")}{" "}
                    {pageCount}
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      onPaginationChange?.({
                        pageNumber: pagination.pageNumber + 1,
                        pageSize: pagination.pageSize,
                      })
                    }
                    disabled={pagination.pageNumber >= pageCount}
                  >
                    <span className="sr-only">
                      {t("common:go_to_next_page")}
                    </span>
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() =>
                      onPaginationChange?.({
                        pageNumber: pageCount,
                        pageSize: pagination.pageSize,
                      })
                    }
                    disabled={pagination.pageNumber >= pageCount}
                  >
                    <span className="sr-only">
                      {t("common:go_to_last_page")}
                    </span>
                    <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
