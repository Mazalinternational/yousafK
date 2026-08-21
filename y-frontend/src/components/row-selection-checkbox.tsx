import { Checkbox } from "@/components/ui/checkbox";
import { type ChangeEvent } from "react";

function RowSelectionCheckbox({
  checked,
  onChange,
  ...rest
}: {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Checkbox
      className="cursor-pointer"
      onClick={(e)=> e.stopPropagation()}
      checked={checked}
      onCheckedChange={(checked) => {
        onChange({
          target: { checked: checked as boolean },
        } as ChangeEvent<HTMLInputElement>);
      }}
      {...rest}
    />
  );
}

export default RowSelectionCheckbox;
