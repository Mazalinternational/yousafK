import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  totalHeaders: number;
}

export const TableSkeleton = ({ totalHeaders }: TableSkeletonProps) => {
  return (
    <div className="w-full border rounded-md overflow-hidden">
      {/* Skeleton Table Header */}
      <div className="flex w-full">
        {Array.from({ length: totalHeaders }).map((_, i) => (
          <div 
            key={i} 
            className={
              i === totalHeaders - 1
                ? "w-20 px-4 py-4 flex-shrink-0"
                : "flex-1 px-4 py-4"
            }
          >
            <Skeleton 
              className={
                i === totalHeaders - 1
                  ? "h-6 w-8 mx-auto rounded-md animate-pulse"
                  : "h-6 w-3/4 mx-auto rounded-md animate-pulse"
              }
            />
          </div>
        ))}
      </div>
      {/* Skeleton Table Body (7 rows) */}
      {Array.from({ length: 7 }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex w-full ${
            rowIdx % 2 === 0 ? "bg-muted" : ""
          }`}
        >
          {Array.from({ length: totalHeaders }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={
                colIdx === totalHeaders - 1
                  ? "w-20 px-2 py-4 flex-shrink-0"
                  : "flex-1 px-2 py-4"
              }
            >
              <Skeleton
                className={
                  colIdx === totalHeaders - 1
                    ? "h-2 w-6 mx-auto"
                    : "h-8 w-5/6 mx-auto"
                }
              />
            </div>
            
          ))}
        </div>
      ))}
      
      {/* Skeleton Pagination */}
      <div className="flex items-center justify-between px-4 py-4 border-t">
        {/* Left side - Showing entries text */}
        <div className="flex items-center">
          <Skeleton className="h-4 w-40" />
        </div>
        
        {/* Right side - Rows per page and pagination controls */}
        <div className="flex items-center gap-6">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          
          {/* Pagination buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-9" />
            <Skeleton className="h-8 w-9" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-9" />
            <Skeleton className="h-8 w-9" />
          </div>
        </div>
      </div>
    </div>
  );
};