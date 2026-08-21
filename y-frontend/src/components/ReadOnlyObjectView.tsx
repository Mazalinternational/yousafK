import { memo, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { dateFormatter } from "@/utils/dataFormatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ValueRenderContext = {
  key: string;
  path: readonly string[];
  depth: number;
};

export type ValueResolver = (
  value: unknown,
  context: ValueRenderContext,
) => ReactNode | undefined;

export type LabelResolver = (key: string, path: readonly string[]) => string;
export type ExcludeKeyResolver = (
  key: string,
  path: readonly string[],
) => boolean;

export interface ReadOnlyObjectViewProps {
  data: Record<string, unknown> | null | undefined;
  className?: string;
  gridClassName?: string;
  fieldClassName?: string;
  emptyValue?: ReactNode;
  emptyText?: ReactNode;
  yesLabel?: ReactNode;
  noLabel?: ReactNode;
  maxDepth?: number;
  maxArrayItems?: number;
  excludeKeys?: readonly string[];
  excludeKeyResolver?: ExcludeKeyResolver;
  labelResolver?: LabelResolver;
  valueResolver?: ValueResolver;
}

const DEFAULT_EMPTY_VALUE = "-";
const DEFAULT_EMPTY_TEXT = "No data available";
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_ARRAY_ITEMS = 50;
const NUMBER_FORMATTER = new Intl.NumberFormat();
const DATE_STRING_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const URL_REGEX = /^(https?:\/\/|www\.)/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const toLabel = (key: string): string => {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  if (!normalized) return key;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isDateString = (value: string): boolean => {
  if (!DATE_STRING_REGEX.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
};

const ReadOnlyObjectView = memo(function ReadOnlyObjectView({
  data,
  className,
  gridClassName,
  fieldClassName,
  emptyValue = DEFAULT_EMPTY_VALUE,
  emptyText = DEFAULT_EMPTY_TEXT,
  yesLabel = "Yes",
  noLabel = "No",
  maxDepth = DEFAULT_MAX_DEPTH,
  maxArrayItems = DEFAULT_MAX_ARRAY_ITEMS,
  excludeKeys,
  excludeKeyResolver,
  labelResolver,
  valueResolver,
}: ReadOnlyObjectViewProps) {
  const excludedSet = useMemo(() => new Set(excludeKeys ?? []), [excludeKeys]);

  const shouldExcludeKey = useCallback(
    (key: string, path: readonly string[]): boolean => {
      if (excludedSet.has(key)) return true;
      return excludeKeyResolver?.(key, path) ?? false;
    },
    [excludedSet, excludeKeyResolver],
  );

  const entries = useMemo(() => {
    if (!data || !isPlainObject(data)) return [];
    return Object.entries(data).filter(([key]) => !shouldExcludeKey(key, [key]));
  }, [data, shouldExcludeKey]);

  const resolveLabel = (key: string, path: readonly string[]) => {
    if (labelResolver) return labelResolver(key, path);
    return toLabel(key);
  };

  const renderNode = (
    value: unknown,
    key: string,
    path: readonly string[],
    depth: number,
    stack: readonly object[],
  ): ReactNode => {
    const customValue = valueResolver?.(value, { key, path, depth });
    if (customValue !== undefined) {
      return customValue;
    }

    if (value === null || value === undefined || value === "") return emptyValue;

    if (typeof value === "boolean") return value ? yesLabel : noLabel;

    if (typeof value === "number" && Number.isFinite(value)) {
      return NUMBER_FORMATTER.format(value);
    }

    if (value instanceof Date) {
      const formatted = dateFormatter(value);
      return formatted || value.toISOString();
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return emptyValue;

      if (URL_REGEX.test(trimmed)) {
        const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all"
          >
            {trimmed}
          </a>
        );
      }

      if (isDateString(trimmed)) {
        const formatted = dateFormatter(trimmed);
        return formatted || trimmed;
      }

      return value;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (Array.isArray(value)) {
      if (!value.length) return emptyValue;
      if (depth >= maxDepth) return `[${value.length} items]`;

      const preview = value.slice(0, maxArrayItems);
      const hasMore = value.length > preview.length;
      const allObjects = preview.every((item) => isPlainObject(item));

      if (allObjects) {
        const columns = Array.from(
          preview.reduce((acc, row) => {
            Object.keys(row).forEach((column) => {
              if (!shouldExcludeKey(column, [...path, column])) {
                acc.add(column);
              }
            });
            return acc;
          }, new Set<string>()),
        );

        if (!columns.length) return emptyValue;

        return (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={`${path.join(".")}:${column}`}>
                      {resolveLabel(column, [...path, column])}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, rowIndex) => (
                  <TableRow key={`${path.join(".")}:row:${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${path.join(".")}:cell:${rowIndex}:${column}`}
                        className="whitespace-normal align-top"
                      >
                        {renderNode(
                          row[column],
                          column,
                          [...path, String(rowIndex), column],
                          depth + 1,
                          stack,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMore ? (
              <p className="text-xs text-muted-foreground">
                +{value.length - preview.length} more items
              </p>
            ) : null}
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <ul className="list-disc space-y-1 ps-5">
            {preview.map((item, index) => (
              <li key={`${path.join(".")}:item:${index}`} className="break-words">
                {renderNode(item, key, [...path, String(index)], depth + 1, stack)}
              </li>
            ))}
          </ul>
          {hasMore ? (
            <p className="text-xs text-muted-foreground">
              +{value.length - preview.length} more items
            </p>
          ) : null}
        </div>
      );
    }

    if (isPlainObject(value)) {
      if (stack.includes(value)) return "[Circular]";
      if (depth >= maxDepth) return "{...}";

      const objectEntries = Object.entries(value);
      const filteredEntries = objectEntries.filter(([childKey]) => {
        return !shouldExcludeKey(childKey, [...path, childKey]);
      });
      if (!filteredEntries.length) return emptyValue;

      const nextStack = [...stack, value];

      // Render single-field objects as plain value (e.g. { name: "X" } -> "X")
      if (filteredEntries.length === 1) {
        const [singleKey, singleValue] = filteredEntries[0];
        return renderNode(
          singleValue,
          singleKey,
          [...path, singleKey],
          depth + 1,
          nextStack,
        );
      }

      return (
        <div className="space-y-2 border-s border-border/60 ps-3">
          {filteredEntries.map(([childKey, childValue]) => {
            const childPath = [...path, childKey];
            return (
              <div
                key={childPath.join(".")}
                className="grid grid-cols-1 gap-1 md:grid-cols-[minmax(140px,180px)_1fr]"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {resolveLabel(childKey, childPath)}
                </p>
                <div className="text-sm break-words">
                  {renderNode(
                    childValue,
                    childKey,
                    childPath,
                    depth + 1,
                    nextStack,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return String(value);
  };

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3",
        className,
        gridClassName,
      )}
    >
      {entries.map(([key, value]) => {
        const path = [key];

        return (
          <div
            key={key}
            className={cn(
              "space-y-1 rounded-md border bg-background/70 px-3 py-2",
              fieldClassName,
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {resolveLabel(key, path)}
            </p>
            <div className="text-sm break-words">
              {renderNode(value, key, path, 0, [])}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default ReadOnlyObjectView;
