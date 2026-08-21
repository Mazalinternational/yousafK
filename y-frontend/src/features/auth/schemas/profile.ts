import z from "zod";

export const EditProfileFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
});

export const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type EditProfileFormValues = z.infer<typeof EditProfileFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordFormSchema>;
