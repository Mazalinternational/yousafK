import { z } from "zod";
export const LocalizedName = z.object({
  dr: z.string().min(3, "Name Dari must be at least two characters"),
  pa: z.string().min(3, "Name Pashto must be at least two characters"),
  en: z.string().min(3, "Name English must be at least two characters"),
});
  