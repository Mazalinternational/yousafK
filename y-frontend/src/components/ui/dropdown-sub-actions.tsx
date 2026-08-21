import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
interface SubAction {
  label: string;
  action?: (item: unknown) => void;
  disabled?: (item: unknown) => boolean;
  className?: (item: unknown) => string | undefined;
  icon?: React.ReactNode;
  subActions?: SubAction[];
}

interface DropdownWithSubActionsProps {
  action: {
    label: string;
    disabled?: (item: unknown) => boolean;
    subActions: SubAction[];
  };
  index: number;
  item: unknown;
}

const DropdownWithSubActions: React.FC<DropdownWithSubActionsProps> = ({
  action,
  item,
  index,
}) => {
  const renderSubActions = (subActions: SubAction[]) =>
    subActions.map((subAction, subIndex) => {
      if (subAction.subActions && subAction.subActions.length > 0) {
        return (
          <DropdownMenuSub key={`${subAction.label}-${subIndex}`}>
            <DropdownMenuSubTrigger>{subAction.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[220px]">
              {renderSubActions(subAction.subActions)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      const itemClassName = subAction.className?.(item);

      return (
        <DropdownMenuItem
          key={`${subAction.label}-${subIndex}`}
          className={`cursor-pointer ${itemClassName ?? ""}`}
          onClick={(e) => {
            e.stopPropagation();
            subAction.action?.(item);
          }}
          disabled={subAction.disabled?.(item)}
        >
          {subAction.icon && <span className="mr-2">{subAction.icon}</span>}
          <span>{subAction.label}</span>
        </DropdownMenuItem>
      );
    });

  return action.subActions ? (
    <DropdownMenuSub key={index}>
      <DropdownMenuSubTrigger disabled={action.disabled?.(item)}>
        {action.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-[220px]">
        {renderSubActions(action.subActions)}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  ) : null;
};

export default DropdownWithSubActions;
