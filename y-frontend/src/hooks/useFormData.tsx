export const useFormData = <T extends Record<string, any>>() => {
  const flattenObject = (obj: any, prefix = "", formData: FormData): void => {
    if (
      obj == null ||
      typeof obj !== "object" ||
      obj instanceof File ||
      obj instanceof Blob ||
      obj instanceof Date
    ) {
      // Base types: append directly
      if (prefix) {
        if (obj instanceof File || obj instanceof Blob) {
          formData.append(prefix, obj);
        } else {
          formData.append(prefix, String(obj));
        }
      }
      return;
    }

    if (Array.isArray(obj)) {
      // Handle arrays: obj => prefix[0], prefix[1], ...
      obj.forEach((item, index) => {
        flattenObject(item, `${prefix}[${index}]`, formData);
      });
    } else {
      // Handle plain objects: obj.key => prefix.key
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        flattenObject(value, newKey, formData);
      }
    }
  };

  const createFormData = (values: T): FormData => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null) {
        continue;
      }

      // Special handling for top-level arrays and objects
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          flattenObject(item, `${key}[${index}]`, formData);
        });
      } else if (
        typeof value === "object" &&
        !(value instanceof File) &&
        !(value instanceof Blob) &&
        !(value instanceof Date)
      ) {
        // Flatten nested object
        flattenObject(value, key, formData);
      } else {
        // Primitive or File/Blob/Date
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    }

    return formData;
  };

  return { createFormData };
};
