import { ArrowUpDown } from "lucide-react";
import { Button } from "./ui/button";

export const SortButton = ({
  column,
  label,
}: {
  column: any;
  label: string;
}) => {
  return (
    <Button
      variant="ghost"
      className="p-0! hover:cursor-pointer"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
};
