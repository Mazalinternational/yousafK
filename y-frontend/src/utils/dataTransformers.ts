type ArrayToOptionsItem = {
  id: string | number;
  name?: { en?: string } & Record<string, any>;
  title?: string;
  year?: string;
  jobTitle?: string;
};

// Transform data into the expected options format
export const arrayToOptions = <T extends ArrayToOptionsItem>(
  array?: T[],
): { label: string; value: string }[] => {
  return (
    array?.map((arr) => ({
      label: arr.name?.en || arr.title || arr.year || arr.jobTitle || "",
      value: String(arr.id),
    })) || []
  );
};

export const transferToMultiSelectDefault = <
  T extends { id: string | number } & Record<string, any>,
>(
  array?: T[],
): string[] => {
  return array?.map((arr) => String(arr.id)) || [];
};
