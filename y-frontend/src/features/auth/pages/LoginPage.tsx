import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
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
import loginRiceFields from "@/assets/images/login-rice-fields.jpg";
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
      <FormLabel className="text-sm font-semibold text-white/90">{label}</FormLabel>
      <div className="group relative">
        <Icon
          className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55 transition-colors duration-200 group-focus-within:text-white"
          aria-hidden
        />
        <FormControl>
          <Input
            type={type}
            autoComplete={autoComplete}
            disabled={disabled}
            className={cn(
              "h-12 rounded-full border-white/30 bg-white/20 ps-11 text-white shadow-none backdrop-blur-md transition-all duration-200",
              "placeholder:text-white/45",
              "focus-visible:border-white/55 focus-visible:bg-white/25 focus-visible:ring-white/20",
              "dark:bg-white/10 dark:border-white/20",
              trailing ? "pe-12" : undefined,
              inputClassName,
            )}
            {...inputProps}
          />
        </FormControl>
        {trailing ? (
          <div className="absolute end-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
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
  const copyrightYear = isRtl
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
      const message = axios.isAxiosError(err)
        ? (extractMessage(err) ?? "Invalid email or password")
        : "Unexpected error. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir={i18n.dir()} className="relative flex min-h-screen overflow-hidden bg-emerald-950">
      {/* Full-bleed rice-field backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginRiceFields})` }}
        aria-hidden
      >
        <img
          src={loginRiceFields}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Keep the photo readable — light veil only */}
        <div className="absolute inset-0 bg-emerald-950/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/55 via-transparent to-emerald-950/25" />
      </div>

      <motion.div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ y: [0, -22, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-20 bottom-1/5 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl"
        animate={{ y: [0, 16, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        aria-hidden
      />

      <motion.div
        className="absolute end-4 top-4 z-30 flex items-center gap-2 sm:end-6 sm:top-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-white/20 bg-white/15 p-2 shadow-lg backdrop-blur-md"
        >
          <LanguageSelector className="rounded-full text-white" />
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-white/20 bg-white/15 p-2 shadow-lg backdrop-blur-md"
        >
          <ModeToggle className="rounded-full text-white" />
        </motion.div>
      </motion.div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8 px-4 py-12 pb-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:pb-20 xl:px-24">
        {/* Brand panel — hero signal */}
        <motion.div
          className={cn(
            "w-full max-w-xl text-white",
            isRtl ? "lg:order-2 lg:text-end" : "lg:order-1 lg:text-start",
            "text-center lg:text-inherit",
          )}
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div
            variants={fadeUpItemVariants}
            className={cn(
              "mb-6 flex items-center gap-4",
              "justify-center lg:justify-start",
              isRtl && "lg:justify-end lg:flex-row-reverse",
            )}
          >
            <motion.div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-xl backdrop-blur-md"
              whileHover={{ rotate: [0, -6, 6, 0], scale: 1.04 }}
              transition={{ duration: 0.45 }}
            >
              <img
                src="/logo.png"
                alt="Yousuf Keyhan"
                className="h-11 w-11 rounded-full object-contain"
              />
            </motion.div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                Rice Process &amp; Production
              </p>
              <p className="text-sm font-medium text-white/80">Management Information System</p>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUpItemVariants}
            className="font-[poppins] text-4xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[3.25rem]"
          >
            Yousuf Keyhan
          </motion.h1>
          <motion.p
            variants={fadeUpItemVariants}
            className={cn(
              "mt-4 max-w-md text-base leading-relaxed text-emerald-50/90 sm:text-lg",
              "mx-auto lg:mx-0",
              isRtl && "lg:ms-auto lg:me-0",
            )}
          >
            {t("common:system:description")}
          </motion.p>

          <motion.p
            variants={fadeUpItemVariants}
            className="mt-8 hidden text-xs text-white/55 lg:block"
          >
            © {copyrightYear} Yousuf Keyhan Rice Process &amp; Production —{" "}
            {t("common:system:all_rights_reserved")}
          </motion.p>
        </motion.div>

        {/* Enhanced login card */}
        <motion.section
          className={cn(
            "w-full max-w-[340px]",
            isRtl ? "lg:order-1" : "lg:order-2",
          )}
          variants={authCardVariants}
          initial="initial"
          animate="animate"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.75rem]",
              "border border-white/35 bg-white/20 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)]",
              "backdrop-blur-2xl backdrop-saturate-150",
              "ring-1 ring-white/20",
              "dark:border-white/20 dark:bg-white/10 dark:ring-white/10",
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent dark:from-white/15 dark:via-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
              aria-hidden
            />
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/20 blur-2xl"
              animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />

            <div className="relative z-10 space-y-6 p-6 sm:p-7">
              <motion.div
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
                className="space-y-6"
              >
                <motion.div variants={fadeUpItemVariants} className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                    Sign in
                  </h2>
                  <p className="text-sm leading-relaxed text-white/80">
                    Welcome back. Enter your email and password to open the dashboard.
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
                                className="h-9 w-9 rounded-full text-white/70 hover:bg-white/15 hover:text-white"
                                disabled={isDisabled}
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={
                                  showPassword ? "Hide password" : "Show password"
                                }
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
                          className="overflow-hidden rounded-full border border-red-300/40 bg-red-500/20 px-3.5 py-2.5 text-sm text-red-50 backdrop-blur-md"
                        >
                          {error}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <motion.div variants={fadeUpItemVariants}>
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
                        <Button
                          type="submit"
                          className={cn(
                            "h-12 w-full rounded-full text-base font-semibold",
                            "bg-white/90 text-emerald-950 hover:bg-white",
                            "shadow-lg shadow-black/20 backdrop-blur-md",
                            "dark:bg-white/85 dark:text-emerald-950 dark:hover:bg-white",
                          )}
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
                  className="text-center text-xs text-white/65"
                >
                  Secure, role-based access for authorized staff only.
                </motion.p>
              </motion.div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-white/60 lg:hidden">
            © {copyrightYear} Yousuf Keyhan — {t("common:system:all_rights_reserved")}
          </p>
        </motion.section>
      </div>

      <p className="absolute inset-x-0 bottom-4 z-20 px-4 text-center text-xs text-white/70 sm:bottom-5">
        Developed by:{" "}
        <a
          href="https://www.mazalinternational.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white underline decoration-white/40 underline-offset-2 transition-colors hover:text-emerald-100 hover:decoration-emerald-200"
        >
          Mazal Technology IT &amp; Digital Solutions
        </a>
      </p>
    </div>
  );
}

function extractMessage(err: AxiosError): string | null {
  const data = err.response?.data as { message?: string | string[] } | undefined;
  if (!data?.message) return null;
  return Array.isArray(data.message) ? data.message.join(", ") : data.message;
}
