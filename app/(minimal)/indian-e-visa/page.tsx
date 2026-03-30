"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { useEVisa } from "@/context/EVisaContext";
import { ProgressStepper } from "@/components/ProgressStepper";
import { eVisaApi } from "@/lib/api-client";

const registrationSchema = z.object({
  visaDuration: z.enum(["1-Year", "5-Year"], { message: "Select visa duration" }),
  email: z.string().min(1, 'Email is required').email("Enter a valid email address"),
  confirmEmail: z.string().email("Enter a valid email address"),
  countryCode: z.string().min(1),
  phone: z.string().min(7, "Enter a valid phone number"),
  fullName: z.string().min(2, "Enter your full name as per passport"),
  nationality: z.string().min(1, "Select your nationality"),
  countryOfResidence: z.string().min(1, "Select your country of residence"),
  purposeOfVisit: z.enum(["Tourism", "Business", "Medical", "Conference", "Other"], { message: "Select purpose of visit" }),
  consent: z.literal(true, { message: "You must agree to continue" }),
}).refine(d => d.email === d.confirmEmail, {
  message: "Email addresses do not match",
  path: ["confirmEmail"],
});

type RegistrationData = z.infer<typeof registrationSchema>;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const trustItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function RegistrationPage() {
  const router = useRouter();
  const { updateData } = useEVisa();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");

  const { register, handleSubmit, control, formState: { errors } } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      countryCode: "+44",
      consent: undefined,
    }
  });

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);
    setHasSubmitError(false);
    setSubmitErrorMessage("");
    
    try {
      const response = await eVisaApi.register({
        email: data.email,
        confirm_email: data.confirmEmail,
        mobile_number: `${data.countryCode}${data.phone}`,
        full_name: data.fullName,
        nationality: data.nationality,
        country_of_residence: data.countryOfResidence,
        purpose_of_visit: data.purposeOfVisit,
        visa_duration: data.visaDuration,
        consent: data.consent,
      });

      const fileNumber = response.data.case_number;
      toast.success(response.message || "Registration successful.");
      
      updateData({
        fileNumber,
        visaDuration: data.visaDuration,
        email: data.email,
        phone: data.phone,
        countryCode: data.countryCode,
        fullName: data.fullName,
        nationality: data.nationality,
        countryOfResidence: data.countryOfResidence,
        purposeOfVisit: data.purposeOfVisit,
        isEmailConfirmed: false,
        hasPaid: false,
        hasUploaded: false,
      });

      const backendConfirmUrl = response.data.confirm_url;
      if (backendConfirmUrl) {
        router.push(backendConfirmUrl);
      } else {
        router.push(`/indian-e-visa/confirm-email?case=${encodeURIComponent(fileNumber)}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
      setSubmitErrorMessage(message);
      setHasSubmitError(true);
      setTimeout(() => setHasSubmitError(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = () => {
    toast.error("Please fix the highlighted fields.");
    setHasSubmitError(true);
    setTimeout(() => setHasSubmitError(false), 500); // Reset shake capability
  };

  const inputClasses = (hasError: boolean) => `w-full px-3 py-2.5 border rounded-lg font-body text-[12px] bg-[#f8fafd] outline-none transition-all duration-200 ${
    hasError 
      ? "border-red shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red" 
      : "border-[#d7e3f2] focus:border-[#1a56db] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.16)]"
  } disabled:opacity-50 disabled:bg-gray-50`;

  return (
    <div className="relative w-full bg-[#f0f5fc] text-black pb-6 sm:pb-8 pt-6 sm:pt-8 overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-[#56a7ff]/30 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 12, 0], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-20 right-0 h-48 w-48 rounded-full bg-[#9cc8ff]/35 blur-3xl"
        animate={{ x: [0, -22, 0], y: [0, -10, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-1 sm:mb-2">
        <ProgressStepper currentStep={0} />
      </div>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[0.38fr_0.62fr] gap-6 lg:gap-8 items-stretch">
          <aside className="px-1 sm:px-2 lg:px-0 lg:pr-2 h-full">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              whileHover={{ y: -3 }}
              className="max-w-[430px] lg:max-w-none h-full rounded-xl border border-[#dde8f5] bg-white/95 backdrop-blur-sm p-5 sm:p-6 flex flex-col shadow-[0_20px_48px_rgba(23,72,145,0.08)]"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-[#e8f0fe] border border-[#c7dafb] text-[#1a56db] px-3 py-1.5 rounded-full font-body text-xs font-semibold mb-5">
                <span className="h-2 w-2 rounded-full bg-[#1a56db]" />
                Indian e-Visa assistance
              </motion.div>

              <motion.h1 variants={itemVariants} className="font-heading text-[22px] sm:text-[24px] lg:text-[26px] font-semibold leading-tight text-[#0f1f3d] mb-3">
                Apply for <span className="italic text-[#1a56db]">Indian e-Visa</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="font-body text-[13px] text-[#6b7d92] mb-6">
                Fast, secure assistance for UK & US travellers
              </motion.p>

              <motion.p variants={itemVariants} className="font-body text-[12px] text-[#6b7d92] mb-6 max-w-[420px] leading-relaxed">
                Register in under 60 seconds. Complete payment to upload documents. We submit on your behalf.
              </motion.p>

              <motion.div variants={itemVariants} className="hidden sm:block space-y-4 mb-6">
                {[
                  "Choose visa type",
                  "Use email you check regularly",
                  "Enter passport name exactly",
                  "Pay to unlock upload",
                ].map((item, idx) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-[#1a56db] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="font-body text-[13px] text-[#6b7d92] leading-relaxed">{item}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="hidden sm:block mt-auto space-y-3">
                <details className="group rounded-lg border border-[#d7e3f2] bg-[#f8fafd] p-3">
                  <summary className="cursor-pointer list-none font-body text-[12px] font-semibold text-[#0f1f3d] flex items-center justify-between">
                    Why we ask these details
                    <span className="text-[#7b8fa7] group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-2 font-body text-[11px] text-[#6b7d92] leading-relaxed">
                    This helps us prepare your application correctly and reduce delays caused by document mismatches.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#d7e3f2] bg-[#f8fafd] p-3">
                  <summary className="cursor-pointer list-none font-body text-[12px] font-semibold text-[#0f1f3d] flex items-center justify-between">
                    What happens next
                    <span className="text-[#7b8fa7] group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-2 font-body text-[11px] text-[#6b7d92] leading-relaxed">
                    After registration you confirm email, complete payment, then upload passport and photo for submission.
                  </p>
                </details>

                <div className="bg-white border border-[#c9dbf3] rounded-xl p-3">
                <p className="font-body text-[11px] text-[#74889f] leading-relaxed">
                  We assist with preparation and submission of your Indian e-Visa application based on the information and documents you provide. Independent service. Not affiliated with the Government of India.
                </p>
                </div>
              </motion.div>
            </motion.div>
          </aside>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative bg-white/95 backdrop-blur-sm border border-[#dde8f5] rounded-xl border-t-[3px] border-t-[#1a56db] p-5 sm:p-6 lg:p-7 h-full lg:max-h-[860px] lg:overflow-y-auto lg:pr-4 shadow-[0_24px_54px_rgba(20,76,160,0.10)]"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-3 top-3 hidden sm:block"
              animate={{ rotate: [0, 8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-4 w-4 text-[#1a56db]/40" />
            </motion.div>
            <div className="mb-5">
              <h3 className="font-heading text-[22px] sm:text-[24px] font-semibold leading-tight text-[#0f1f3d] mb-2">
                Apply for <span className="italic text-[#1a56db]">Indian e-Visa</span>
              </h3>
              <p className="font-body text-[13px] text-[#6b7d92] mb-2">Fast, secure assistance for UK & US travellers</p>
              <p className="font-body text-[12px] text-[#6b7d92] leading-relaxed mb-2">
                Register in under 60 seconds. Complete payment to upload documents. We submit on your behalf.
              </p>
              <p className="font-body text-[11px] text-[#8a9bb0] leading-relaxed">
                We assist with preparation and submission of your Indian e-Visa application based on the information and documents you provide. Independent service. Not affiliated with the Government of India.
              </p>
            </div>
            <div className="w-full h-[1px] bg-[#e5edf7] mb-5" />

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
              
              {/* Field 1: Visa Duration */}
              <div>
                <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Select visa duration *</label>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="visaDuration"
                    control={control}
                    render={({ field }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => field.onChange("1-Year")}
                          className={`relative rounded-[10px] border p-3 text-left transition-all ${
                            field.value === "1-Year"
                              ? "border-[#1a56db] bg-[#f0f6ff]"
                              : "border-[#d7e3f2] bg-white"
                          }`}
                        >
                          <span className="absolute top-2 right-2 bg-[#1a56db] text-white text-[9px] px-2 py-0.5 rounded-full font-semibold">Popular</span>
                          <p className="font-body text-[12px] text-[#6b7d92]">1-year e-Visa</p>
                          <p className="font-mono text-[22px] font-bold text-[#1a56db] mt-1">£88</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => field.onChange("5-Year")}
                          className={`rounded-[10px] border p-3 text-left transition-all ${
                            field.value === "5-Year"
                              ? "border-[#1a56db] bg-[#f0f6ff]"
                              : "border-[#d7e3f2] bg-white"
                          }`}
                        >
                          <p className="font-body text-[12px] text-[#6b7d92]">5-year e-Visa</p>
                          <p className="font-mono text-[22px] font-bold text-[#1a56db] mt-1">£150</p>
                        </button>
                      </>
                    )}
                  />
                </div>
                <AnimatePresence>
                  {errors.visaDuration && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-2">
                      {errors.visaDuration.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <p className="font-body text-[10px] tracking-[0.14em] uppercase text-[#8da1b8] font-semibold mb-2">Contact Details</p>
                <div className="h-[1px] bg-[#e5edf7]" />
              </div>

              {/* Fields 2 & 3: Emails */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Email address *</label>
                  <input
                    {...register("email")}
                    type="email"
                    disabled={isSubmitting}
                    placeholder="your@email.com"
                    className={inputClasses(!!errors.email)}
                    aria-invalid={!!errors.email}
                  />
                  <AnimatePresence>
                    {errors.email && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                        {errors.email.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Confirm email *</label>
                  <input
                    {...register("confirmEmail")}
                    type="email"
                    disabled={isSubmitting}
                    placeholder="your@email.com"
                    className={inputClasses(!!errors.confirmEmail)}
                    aria-invalid={!!errors.confirmEmail}
                  />
                  <AnimatePresence>
                    {errors.confirmEmail && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                        {errors.confirmEmail.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Field 4: Mobile */}
              <div>
                <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Mobile number *</label>
                <div className="flex gap-2.5">
                  <select
                    {...register("countryCode")}
                    disabled={isSubmitting}
                    className="w-[140px] px-3 py-2.5 border border-[#d7e3f2] rounded-lg font-body text-[12px] bg-[#f8fafd] outline-none focus:border-[#1a56db] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.16)] transition-all duration-200"
                  >
                    <option value="+44">+44 🇬🇧 UK</option>
                    <option value="+1">+1 🇺🇸 US</option>
                    <option value="+91">+91 🇮🇳 IN</option>
                    <option value="+971">+971 🇦🇪 UAE</option>
                    <option value="+65">+65 🇸🇬 SG</option>
                    <option value="+61">+61 🇦🇺 AU</option>
                  </select>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register("phone")}
                      type="tel"
                      disabled={isSubmitting}
                      placeholder="e.g. 7700 900000"
                      className={inputClasses(!!errors.phone)}
                      aria-invalid={!!errors.phone}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {errors.phone && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                      {errors.phone.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <p className="font-body text-[10px] tracking-[0.14em] uppercase text-[#8da1b8] font-semibold mb-2">Travel Details</p>
                <div className="h-[1px] bg-[#e5edf7]" />
              </div>

              {/* Field 5: Full Name */}
              <div>
                <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Full name (as per passport) *</label>
                <input
                  {...register("fullName")}
                  type="text"
                  disabled={isSubmitting}
                  placeholder="As per your passport"
                  className={inputClasses(!!errors.fullName)}
                  aria-invalid={!!errors.fullName}
                />
                <AnimatePresence>
                  {errors.fullName && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                      {errors.fullName.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Fields 6 & 7: Nationality and Residence */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Nationality *</label>
                  <select
                    {...register("nationality")}
                    disabled={isSubmitting}
                    className={inputClasses(!!errors.nationality) + " bg-white"}
                  >
                    <option value="">Select...</option>
                    <option value="British">British</option>
                    <option value="American">American</option>
                    <option value="Canadian">Canadian</option>
                    <option value="Australian">Australian</option>
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                  <AnimatePresence>
                    {errors.nationality && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                        {errors.nationality.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-2">Country of residence *</label>
                  <select
                    {...register("countryOfResidence")}
                    disabled={isSubmitting}
                    className={inputClasses(!!errors.countryOfResidence) + " bg-white"}
                  >
                    <option value="">Select...</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="UAE">UAE</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Other">Other</option>
                  </select>
                  <AnimatePresence>
                    {errors.countryOfResidence && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-1.5">
                        {errors.countryOfResidence.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Field 8: Purpose of Visit */}
              <div>
                <label className="block font-body font-semibold text-[#0f1f3d] text-[12px] mb-3">Purpose of visit *</label>
                <Controller
                  name="purposeOfVisit"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-1.5">
                      {["Tourism", "Business", "Medical", "Conference", "Other"].map((item) => {
                        const active = field.value === item;
                        return (
                          <motion.button
                            key={item}
                            type="button"
                            onClick={() => field.onChange(item)}
                            className={`px-2.5 py-1.5 rounded-full border text-[10px] sm:text-[11px] font-body transition-all ${
                              active
                                ? "bg-[#e8f0fe] border-[#1a56db] text-[#1a56db]"
                                : "bg-white border-[#d7e3f2] text-[#6b7d92]"
                            }`}
                          >
                            {item}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
                <AnimatePresence>
                  {errors.purposeOfVisit && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-2">
                      {errors.purposeOfVisit.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Field 9: Consent */}
              <div>
                <motion.label
                  whileHover={{ y: -1 }}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors bg-[#f8fafd] ${
                  errors.consent ? "border-red" : "border-[#d7e3f2]"
                }`}>
                  <input
                    type="checkbox"
                    {...register("consent")}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 rounded border-[#c8d7ea] text-[#1a56db] focus:ring-[#1a56db]"
                  />
                  <span className="font-body text-[11px] text-[#6b7d92] leading-relaxed select-none">
                    I agree to the <span className="text-[#1a56db] font-semibold">Terms & Privacy Policy</span> and consent to be contacted.
                  </span>
                </motion.label>
                <AnimatePresence>
                  {errors.consent && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-2">
                      {errors.consent.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Legal Disclaimer Box */}
              <motion.div
                whileHover={{ y: -1 }}
                className="bg-[#f8fafd] border border-[#d7e3f2] rounded-lg p-3 flex gap-3 text-primary mt-1"
              >
                <Shield className="w-4 h-4 shrink-0 text-[#1a56db] mt-0.5" />
                <p className="font-body text-[11px] leading-relaxed text-[#6b7d92]">
                  Independent service. Not affiliated with the Government of India.
                </p>
              </motion.div>

              {/* Submit CTA */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                animate={hasSubmitError ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                whileHover={!isSubmitting ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isSubmitting ? { scale: 0.97 } : {}}
                className={`relative overflow-hidden w-full bg-[#1a56db] text-white font-semibold text-[12px] px-6 py-3 rounded-[9px] hover:bg-[#1648b5] flex justify-center items-center transition-all ${
                  isSubmitting ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed transform-none" : ""
                }`}
              >
                {!isSubmitting && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                    animate={{ x: ["-10%", "230%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
                  />
                )}
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating your case...
                  </>
                ) : (
                  <span className="relative z-10">Continue to payment →</span>
                )}
              </motion.button>

              {submitErrorMessage && (
                <p className="text-center text-sm font-semibold text-red-600 mt-2">{submitErrorMessage}</p>
              )}
            </form>

            {/* Trust row */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 font-body text-[10px] text-[#7b8fa7] font-medium tracking-wide"
            >
              <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />Secure & encrypted</motion.span>
              <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />WhatsApp updates</motion.span>
              <motion.span variants={trustItemVariants} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#2fa36b]" />Expert review</motion.span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
