import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarRange,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { LanguageSelector } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  authCardVariants,
  fadeUpItemVariants,
  staggerContainerVariants,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { dateFormatter } from "@/utils/dataFormatters";
import { useAuth } from "../hooks/useAuth";
import {
  resolvePostLoginPath,
  resolvePostLoginPathForUser,
} from "../post-login-redirect";

interface LocationState {
  from?: string;
}

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const SYSTEM_FEATURES = [
  {
    icon: CalendarRange,
    title: "Season-based operations",
    description: "Track paddies, rice, and expenses across active seasons.",
  },
  {
    icon: Warehouse,
    title: "Warehouse & inventory",
    description: "Company and farmer paddy intake, rice stock, and bill numbers.",
  },
  {
    icon: Users,
    title: "Customer ledgers",
    description: "Unified accounts for farmers, sellers, buyers, and rice sellers.",
  },
  {
    icon: Wallet,
    title: "Saraf & settlements",
    description: "Multi-currency Saraf ledgers linked to sales and purchases.",
  },
  {
    icon: ShieldCheck,
    title: "Payroll & access control",
    description: "Employee salary, advances, and role-based secure access.",
  },
  {
    icon: BarChart3,
    title: "Reports & analytics",
    description: "Exportable insights for management and daily decisions.",
  },
] as const;

function LoginIconField({
  icon: Icon,
  label,
  type = "text",
  autoComplete,
  disabled,
  trailing,
  inputClassName,
  ...inputProps
}: {
  icon: typeof Mail;
  label: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  trailing?: ReactNode;
  inputClassName?: string;
} & ComponentProps<typeof Input>) {
  return (
    <motion.div variants={fadeUpItemVariants} className="space-y-2">
      <FormLabel className="text-sm font-semibold text-foreground">{label}</FormLabel>
      <div className="group relative">
        <Icon
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
          aria-hidden
        />
        <FormControl>
          <Input
            type={type}
            autoComplete={autoComplete}
            disabled={disabled}
            className={cn(
              "h-11 rounded-xl border-input bg-background ps-10 shadow-none transition-all duration-200",
              "focus-visible:border-primary/60 focus-visible:ring-primary/20",
              trailing ? "pe-11" : undefined,
              inputClassName,
            )}
            {...inputProps}
          />
        </FormControl>
        {trailing ? (
          <div className="absolute end-1 top-1/2 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function LoginPage() {
  const { user, login, status, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const rawFrom = (location.state as LocationState | null)?.from;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (user) {
    const destination = resolvePostLoginPath(rawFrom, can);
    return <Navigate to={destination} replace />;
  }

  const isDisabled = submitting || status === "loading";
  const isRtl = i18n.dir() === "rtl";
  const copyrightYear =
    isRtl
      ? dateFormatter(new Date()).split("-").at(0)
      : String(new Date().getFullYear());

  async function onSubmit(values: LoginFormValues) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const signedInUser = await login(values.email, values.password);
      navigate(resolvePostLoginPathForUser(rawFrom, signedInUser.permissions), {
        replace: true,
      });
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? (extractMessage(err) ?? "Invalid email or password")
          : "Unexpected error. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      dir={i18n.dir()}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/50 px-4 py-10 sm:px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_45%),radial-gradient(circle_at_85%_75%,color-mix(in_oklch,var(--chart-2)_14%,transparent),transparent_42%)]" />

      <motion.div
        className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        animate={{ y: [0, -18, 0], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-chart-3/10 blur-3xl"
        animate={{ y: [0, 14, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        aria-hidden
      />

      <motion.div
        className="absolute end-4 top-4 z-20 flex items-center gap-2 sm:end-6 sm:top-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-border/60 bg-card/90 p-2 shadow-sm backdrop-blur-sm"
        >
          <LanguageSelector className="rounded-full" />
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-border/60 bg-card/90 p-2 shadow-sm backdrop-blur-sm"
        >
          <ModeToggle className="rounded-full" />
        </motion.div>
      </motion.div>

      <motion.div
        className={cn(
          "relative z-10 grid w-full max-w-[940px] overflow-hidden rounded-2xl border border-border/70 bg-card",
          "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/10",
          "md:grid-cols-2",
        )}
        variants={authCardVariants}
        initial="initial"
        animate="animate"
      >
        {/* Branding panel */}
        <aside
          className={cn(
            "relative flex min-h-[300px] flex-col justify-between overflow-hidden p-8 sm:p-10",
            "bg-gradient-to-br from-primary via-chart-3 to-chart-5 text-primary-foreground",
            isRtl ? "md:order-2" : "md:order-1",
          )}
        >
          <motion.div
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl"
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.85, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-black/10 blur-2xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute right-8 top-1/3 h-32 w-32 rounded-full border border-white/20 bg-white/5"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute bottom-24 left-6 h-20 w-20 rounded-full border border-white/15 bg-white/5"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            aria-hidden
          />

          <motion.div
            className="relative z-10 space-y-8"
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div
              variants={fadeUpItemVariants}
              className="flex items-center gap-4"
            >
              <motion.div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/25 backdrop-blur-sm"
                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src="/logo.png"
                  alt="Yousuf Keyhan"
                  className="h-8 w-8 rounded-full object-contain"
                />
              </motion.div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                  Rice Process &amp; Production
                </p>
                <p className="text-sm font-bold">Yousuf Keyhan MIS</p>
              </div>
            </motion.div>

            <motion.div variants={fadeUpItemVariants} className="space-y-4">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground/90 backdrop-blur-sm"
                animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 0 6px rgba(255,255,255,0.08)", "0 0 0 0 rgba(255,255,255,0)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t("common:system:enterprise_ready_workflows")}
              </motion.div>

              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]">
                {t("common:system:hrmis")}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/85 sm:text-[15px]">
                {t("common:system:description")}
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative z-10 mt-10 space-y-4"
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
          >
            <ul className="hidden gap-2.5 sm:flex sm:flex-col">
              {SYSTEM_FEATURES.slice(0, 3).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.li
                    key={feature.title}
                    variants={fadeUpItemVariants}
                    whileHover={{ x: isRtl ? -4 : 4, backgroundColor: "rgba(255,255,255,0.14)" }}
                    className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-colors"
                  >
                    <motion.span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35 + index * 0.08 }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </motion.span>
                    <span>
                      <p className="text-xs font-semibold">{feature.title}</p>
                      <p className="text-[11px] leading-snug text-primary-foreground/75">
                        {feature.description}
                      </p>
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            <motion.p variants={fadeUpItemVariants} className="text-xs text-primary-foreground/70">
              © {copyrightYear} Yousuf Keyhan Rice Process &amp; Production —{" "}
              {t("common:system:all_rights_reserved")}
            </motion.p>
          </motion.div>
        </aside>

        {/* Login form panel */}
        <section
          className={cn(
            "relative flex flex-col justify-center bg-card p-8 sm:p-10 lg:p-12",
            isRtl ? "md:order-1" : "md:order-2",
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 start-0 w-px bg-gradient-to-b from-transparent via-border/80 to-transparent"
            aria-hidden
          />

          <motion.div
            className="mb-8 flex items-center gap-3 md:hidden"
            variants={fadeUpItemVariants}
          >
            <img
              src="/logo.png"
              alt="Yousuf Keyhan"
              className="h-10 w-10 rounded-full object-contain ring-1 ring-border"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rice Process &amp; Production
              </p>
              <p className="text-sm font-semibold">Yousuf Keyhan MIS</p>
            </div>
          </motion.div>

          <motion.div
            className="mx-auto w-full max-w-sm space-y-8"
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeUpItemVariants} className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Sign in
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Welcome back. Enter your administrator email and password to open
                the dashboard.
              </p>
            </motion.div>

            <Form {...form}>
              <motion.form
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <LoginIconField
                        icon={Mail}
                        label="Email address"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        disabled={isDisabled}
                        required
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <LoginIconField
                        icon={Lock}
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        disabled={isDisabled}
                        required
                        trailing={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            disabled={isDisabled}
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={showPassword ? "hide" : "show"}
                                initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.8, rotate: 12 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center justify-center"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </Button>
                        }
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div
                      key="login-error"
                      role="alert"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.div variants={fadeUpItemVariants}>
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/20"
                      disabled={isDisabled}
                    >
                      {submitting ? <Spinner className="size-4" /> : null}
                      Sign in
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>
            </Form>

            <motion.p
              variants={fadeUpItemVariants}
              className="text-center text-xs text-muted-foreground"
            >
              Secure, role-based access for authorized staff only.
            </motion.p>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
}

function extractMessage(err: AxiosError): string | null {
  const data = err.response?.data as { message?: string | string[] } | undefined;
  if (!data?.message) return null;
  return Array.isArray(data.message) ? data.message.join(", ") : data.message;
}
