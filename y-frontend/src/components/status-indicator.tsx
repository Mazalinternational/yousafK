import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import { Spinner } from "@/components/ui/spinner";

type StatusIndicatorProps = {
  statusType: "loading" | "error" ;
  message: string;
};

export function StatusIndicator({ statusType, message }: StatusIndicatorProps) {
  return (
    <div
      className="flex min-h-[calc(100svh-3rem)] w-full flex-1 items-center justify-center p-6"
      role={statusType === "loading" ? "status" : "alert"}
      aria-live="polite"
    >
      <div className="flex w-fit flex-col gap-6 [--radius:1rem]">
        <Item variant="muted">
          {statusType === "loading" && (
            <ItemMedia>
              <Spinner />
            </ItemMedia>
          )}

          <ItemContent>
            <ItemTitle
              className={`line-clamp-1 text-xl ${
                statusType === "error" ? "text-red-500" : ""
              }`}
            >
              {message}
            </ItemTitle>
          </ItemContent>
        </Item>
      </div>
    </div>
  );
}
