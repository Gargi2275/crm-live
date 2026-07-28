"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { RecaptchaField, requireCaptchaToken } from "@/components/RecaptchaField";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  country: z.enum(["UK", "US", "Other"], { message: "Please select a country" }),
  service: z.enum(
    ["New OCI", "OCI Renewal/Transfer", "OCI Update", "Indian e-Visa", "Passport Renewal", "Not Sure"],
    { message: "Please select a service" },
  ),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitError("");
    const captchaMsg = requireCaptchaToken(captchaToken);
    if (captchaMsg) {
      setCaptchaError(captchaMsg);
      return;
    }
    setCaptchaError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.FORMS.CONTACT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          country: data.country,
          service_needed: data.service,
          message: data.message,
          captcha_token: captchaToken,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload as { message?: string; error?: { message?: string } }).message ||
            (payload as { error?: { message?: string } }).error?.message ||
            "Failed to send message.",
        );
      }
      setIsSuccess(true);
      reset();
      setCaptchaToken("");
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="mb-2 block text-base font-medium text-primary">
      {children}
    </label>
  );

  const ErrorMessage = ({ message }: { message?: string }) => (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", x: [0, -8, 8, -8, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-1.5 flex items-center gap-1.5 text-base text-red-600"
        >
          <AlertCircle className="h-4 w-4" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const inputClass =
    "w-full rounded-xl border border-primary/15 bg-white px-4 py-3.5 text-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15";

  return (
    <div className="rounded-3xl border border-primary/15 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_38px_rgba(51,161,253,0.12)] sm:p-10">
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <CheckCircle className="mb-6 h-16 w-16 text-success" />
          <h3 className="mb-2 font-heading text-2xl font-bold text-primary">Message Sent!</h3>
          <p className="font-body text-textMuted">
            We&apos;ve received your inquiry and will get back to you shortly.
          </p>
          <button onClick={() => setIsSuccess(false)} className="mt-8 font-medium text-accent hover:underline">
            Send another message
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className={`${inputClass} ${errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                placeholder="John Doe"
              />
              <ErrorMessage message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`${inputClass} ${errors.email ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                placeholder="john@example.com"
              />
              <ErrorMessage message={errors.email?.message} />
            </div>

            <div>
              <Label htmlFor="country">Country of Residence</Label>
              <select
                id="country"
                {...register("country")}
                className={`${inputClass} appearance-none ${errors.country ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a country...
                </option>
                <option value="UK">United Kingdom</option>
                <option value="US">United States</option>
                <option value="Other">Other</option>
              </select>
              <ErrorMessage message={errors.country?.message} />
            </div>

            <div>
              <Label htmlFor="service">Service Needed</Label>
              <select
                id="service"
                {...register("service")}
                className={`${inputClass} appearance-none ${errors.service ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a service...
                </option>
                <option value="New OCI">New OCI Card</option>
                <option value="OCI Renewal/Transfer">OCI Renewal / Transfer</option>
                <option value="OCI Update">OCI Update (Gratis)</option>
                <option value="Indian e-Visa">Indian e-Visa</option>
                <option value="Passport Renewal">Indian Passport Renewal</option>
                <option value="Not Sure">Not Sure — Help Me Decide</option>
              </select>
              <ErrorMessage message={errors.service?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="message">Your Message</Label>
            <textarea
              id="message"
              rows={4}
              {...register("message")}
              className={`${inputClass} resize-none ${errors.message ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
              placeholder="How can we help you?"
            />
            <ErrorMessage message={errors.message?.message} />
          </div>

          <RecaptchaField
            onChange={(token) => {
              setCaptchaToken(token);
              if (token) setCaptchaError("");
            }}
            error={captchaError}
          />

          {submitError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-xl bg-btn-primary px-6 py-4 font-medium text-white shadow-[0_12px_28px_rgba(51,161,253,0.35)] transition-all hover:shadow-[0_16px_34px_rgba(51,161,253,0.42)] disabled:pointer-events-none disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending Message...
              </>
            ) : (
              "Send Message"
            )}
          </motion.button>

          <p className="mt-4 text-center text-sm text-gray-500">
            * Please do not share card details or bank information via this form. We only use secure payment links for any
            fees.
          </p>
        </form>
      )}
    </div>
  );
}
