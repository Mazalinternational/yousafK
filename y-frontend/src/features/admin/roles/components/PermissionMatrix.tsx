import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type PermissionGroup } from "@/api/permissions.api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getLocalizedPermissionAction,
  getLocalizedPermissionModule,
} from "../utils/permissionDisplay";

type PermissionMatrixProps = {
  groups: PermissionGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function PermissionMatrix({
  groups,
  value,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  const { t } = useTranslation();
  const valueSet = useMemo(() => new Set(value), [value]);

  const toggle = (key: string, checked: boolean) => {
    if (disabled) return;
    if (checked) onChange([...value, key]);
    else onChange(value.filter((k) => k !== key));
  };

  const toggleAll = (group: PermissionGroup, checked: boolean) => {
    if (disabled) return;
    const keys = group.permissions.map((p) => p.key);
    if (checked) {
      const merged = new Set([...value, ...keys]);
      onChange(Array.from(merged));
      return;
    }
    onChange(value.filter((k) => !keys.includes(k)));
  };

  return (
    <div className="max-h-[65vh] space-y-3 overflow-y-auto rounded-md border p-3">
      {groups.map((group) => {
        const all = group.permissions.every((p) => valueSet.has(p.key));
        const some = group.permissions.some((p) => valueSet.has(p.key));
        return (
          <div key={group.module} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-start">
                {getLocalizedPermissionModule(group.module, t)}
              </h4>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={all ? true : some ? "indeterminate" : false}
                  onCheckedChange={(next) => toggleAll(group, !!next)}
                  disabled={disabled}
                />
                {t("common:all")}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {group.permissions.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={valueSet.has(p.key)}
                    onCheckedChange={(next) => toggle(p.key, !!next)}
                    disabled={disabled}
                  />
                  <span className="text-start">{getLocalizedPermissionAction(p.action, t)}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
