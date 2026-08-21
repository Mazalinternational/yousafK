"use client";
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Funnel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import CustomSelect from "./custom-select";
import { useTranslation } from "react-i18next";
import { sectionVariants, staggerContainerVariants, tableRowVariants } from "@/lib/motion";
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchableColumns?: Array<keyof TData | string>;
  searchPlaceholderContext?: string;
  filterableColumns?: Array<{
    id: string;
    placeholder: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  hiddenColumns?: VisibilityState;
}

export function ClientSideDataTable<TData, TValue>({
  columns,
  data,
  searchableColumns,
  searchPlaceholderContext = "",
  filterableColumns = [],
  hiddenColumns = {},
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchValue, setSearchValue] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(hiddenColumns);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  // Search
  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  const searchedData = React.useMemo(() => {
    if (!searchValue || !searchableColumns || searchableColumns.length === 0) {
      return data;
    }

    const lowerSearchValue = searchValue.toLowerCase();
    return data.filter((item) =>
      searchableColumns.some((columnPath) => {
        // Handle both direct properties and nested paths
        const value =
          typeof columnPath === "string" && columnPath.includes(".")
            ? getNestedValue(item, columnPath)
            : item[columnPath as keyof TData];

        return value?.toString().toLowerCase().includes(lowerSearchValue);
      })
    );
  }, [data, searchValue, searchableColumns]);
  // End Search

  const table = useReactTable({
    data: searchedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
  });

  const handleReset = () => {
    setColumnFilters([]);
  };
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
    >
      <motion.div variants={sectionVariants} className="flex justify-between flex-row-reverse gap-4">
        <Input
          placeholder={
            searchPlaceholderContext
              ? `Search ${searchPlaceholderContext}...`
              : "Search..."
          }
          className="w-[200px] mb-6"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />

        {filterableColumns.length > 0 && (
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="max-w-sm">
                  <Funnel />
                </Button>
              </PopoverTrigger>
              <PopoverContent collisionPadding={16}>
                <div className="flex flex-col gap-4">
                  {filterableColumns.map((filterColumn) => {
                    const column = table.getColumn(filterColumn.id);

                    if (filterColumn.type === "select") {
                      const options = filterColumn.options || [];
                      return (
                        <div key={filterColumn.id}>
                          <label className="mb-1 block text-sm font-medium">
                            {filterColumn.placeholder}
                          </label>
                          <CustomSelect
                            value={(column?.getFilterValue() as string) ?? ""}
                            onChange={(value) =>
                              column?.setFilterValue(value ? value : undefined)
                            }
                            options={options}
                            placeholder={`Select ${filterColumn.placeholder}`}
                          />
                        </div>
                      );
                    }

                    // For text, number, etc.
                    return (
                      <div key={filterColumn.id}>
                        <label className="mb-1 block text-sm font-medium">
                          {filterColumn.placeholder}
                        </label>
                        <Input
                          placeholder={filterColumn.placeholder}
                          type={filterColumn.type}
                          value={(column?.getFilterValue() as string) ?? ""}
                          onChange={(e) =>
                            column?.setFilterValue(e.target.value)
                          }
                        />
                      </div>
                    );
                  })}

                  {filterableColumns.length > 0 && (
                    <Button variant="default" onClick={handleReset}>
                      Reset
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </motion.div>

      <motion.div variants={sectionVariants} className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                        : { duration: 0.2, delay: Math.min(index * 0.025, 0.18) }
                    }
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            ) : (
              <motion.tr initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
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
      <motion.div variants={sectionVariants} className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing{" "}
          {table.getRowModel().rows.length > 0
            ? table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              1
            : 0}{" "}
          to{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            table.getRowModel().rows.length}{" "}
          of {table.getFilteredRowModel().rows.length} entries
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
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
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
