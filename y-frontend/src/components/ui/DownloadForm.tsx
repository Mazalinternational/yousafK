import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";

const formSchema = z.object({
  format: z.enum(["pdf", "excel", "word"]),
});

type FormValues = z.infer<typeof formSchema>;
type DownloadFormat = "Pdf" | "Excel" | "Word";

interface DownloadFormProps {
  open: boolean;
  employeeId: number | null;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onDownload: (params: { employeeId: number; format: DownloadFormat }) => void;
}

export default function DownloadForm({
  open,
  employeeId,
  title = "Download",
  onOpenChange,
  onDownload,
}: DownloadFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      format: "pdf",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = (values: FormValues) => {
    if (!employeeId) return;

    const map = {
      pdf: "Pdf",
      excel: "Excel",
      word: "Word",
    } as const;

    onDownload({
      employeeId,
      format: map[values.format],
    });

    onOpenChange(false);
    form.reset();
  };

  const { t } = useTranslation();

  const formatOptions = [
    {
      value: "pdf",
      label: "PDF",
      description: t("common:download_pdf", {
        defaultValue: "Best for printing",
      }),
      icon: FileText,
      accent: "text-rose-600",
    },
    {
      value: "excel",
      label: "Excel",
      description: t("common:download_excel", {
        defaultValue: "Editable data sheet",
      }),
      icon: FileSpreadsheet,
      accent: "text-emerald-600",
    },
    {
      value: "word",
      label: "Word",
      description: t("common:download_word", {
        defaultValue: "Editable document",
      }),
      icon: FileType,
      accent: "text-blue-600",
    },
  ] as const;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) form.reset();
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/60 via-slate-50 to-transparent dark:from-slate-800/40 dark:via-slate-900/40" />
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-slate-200/70 blur-3xl dark:bg-slate-700/30" />
          <DialogHeader className="relative px-6 pt-6 pb-5 text-center">
            <DialogTitle
              className="text-2xl font-semibold tracking-tight text-center"
              title={title}
            >
              {t("common:form_download", {
                defaultValue: "Download Form",
              })}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              {t("common:choose_format", {
                defaultValue: "Choose your preferred file format and download.",
              })}
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-center block">
                      {t("common:file_format", { defaultValue: "File format" })}
                    </FormLabel>

                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-3"
                      >
                        {formatOptions.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = field.value === opt.value;
                          return (
                            <FormItem key={opt.value} className="m-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={opt.value}
                                  className="sr-only"
                                />
                              </FormControl>
                              <FormLabel
                                className={`group flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 transition-all ${
                                  isSelected
                                    ? "border-primary/60 bg-primary/5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]"
                                    : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                                }`}
                              >
                                <span
                                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-background/80 ring-1 ring-border/60 ${opt.accent}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </span>
                                <span className="flex-1">
                                  <span className="block text-sm font-semibold">
                                    {opt.label}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {opt.description}
                                  </span>
                                </span>
                                <span
                                  className={`grid h-8 w-8 place-items-center rounded-full border ${
                                    isSelected
                                      ? "border-primary/60 bg-primary/10 text-primary"
                                      : "border-muted-foreground/30 text-muted-foreground/60"
                                  }`}
                                  aria-hidden="true"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                                </span>
                              </FormLabel>
                            </FormItem>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-col items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={!employeeId || isSubmitting}
                  className="px-8 shadow-sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("common:download")}
                </Button>
                {/* <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-muted-foreground"
                >
                  {t("common:cancel", { defaultValue: "Cancel" })}
                </Button> */}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
