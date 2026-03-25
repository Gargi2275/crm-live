"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Loader2 } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { VisaDurationCard } from "@/components/VisaDurationCard";
import { PurposePills } from "@/components/PurposePills";

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

export default function RegistrationPage() {
  const router = useRouter();
  const { updateData } = useEVisa();
  const shouldReduceMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      countryCode: "+44",
      consent: undefined,
    }
  });

  const onSubmit = (data: RegistrationData) => {
    setIsSubmitting(true);
    setHasSubmitError(false);
    
    // Simulate API call and flow progression
    setTimeout(() => {
      const fileNumber = `FO-EV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
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
      });
      router.push("/indian-e-visa/confirm-email");
    }, 1500);
  };

  const onError = () => {
    setHasSubmitError(true);
    setTimeout(() => setHasSubmitError(false), 500); // Reset shake capability
  };

  const inputClasses = (hasError: boolean) => `w-full px-4 py-3 border-[1.5px] rounded-input font-body text-[15px] outline-none transition-all duration-200 ${
    hasError 
      ? "border-red shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:border-red" 
      : "border-border focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
  } disabled:opacity-50 disabled:bg-gray-50`;

  return (
    <div className="flex-1 w-full bg-ui-bg relative pb-20">
      {/* HERO SECTION */}
      <section className="relative w-full pt-16 sm:pt-[88px] pb-32 overflow-hidden bg-primary">
        {/* Background Blobs */}
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-[10%] w-[500px] h-[500px] rounded-full bg-accent opacity-[0.08] blur-[120px] pointer-events-none"
          style={{ transitionDuration: shouldReduceMotion ? "0.01s" : "14s" }}
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-primary opacity-10 blur-[120px] pointer-events-none"
          style={{ transitionDuration: shouldReduceMotion ? "0.01s" : "10s" }}
        />
        {/* Dot Grid */}
        <div className="absolute top-10 right-[10%] w-32 h-32 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2.5px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[700px]">
            <motion.div variants={itemVariants} className="inline-flex items-center bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-white font-body text-sm font-semibold mb-6 backdrop-blur-sm">
              <span className="mr-2">✈️</span> Indian e-Visa Assistance
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="font-heading font-extrabold text-[clamp(36px,5.5vw,58px)] leading-[1.1] tracking-[-0.03em] text-white mb-4">
              Apply for <span className="text-accent italic">Indian e-Visa</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="font-body text-lg text-white/80 mb-3">
              Fast, secure assistance for UK & US travellers
            </motion.p>
            
            <motion.p variants={itemVariants} className="font-body text-sm text-white/65 mb-8 max-w-[500px]">
              Register in under 60 seconds. Complete payment to upload documents. We submit on your behalf.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-8">
              {['⚡ Register in 60s', '🔒 Secure & encrypted', '📧 Instant file number', '✅ Expert submission'].map(pill => (
                <div key={pill} className="bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-semibold">
                  {pill}
                </div>
              ))}
            </motion.div>

            <motion.p variants={itemVariants} className="font-italic text-xs text-white/45 max-w-[500px] leading-relaxed">
              &quot;We assist with preparation and submission of your Indian e-Visa application based on the information and documents you provide. Independent service. Not affiliated with the Government of India.&quot;
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="relative z-20 max-w-[1200px] mx-auto px-4 sm:px-6 -mt-[52px]">
        <Reveal delay={0.25}>
          <div className="bg-card w-full max-w-[580px] mx-auto rounded-card shadow-card p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ui-bgAlt text-secondary flex items-center justify-center text-xl shrink-0">✈️</div>
              <div>
                <h3 className="font-body font-bold text-primary text-xl">e-Visa Registration</h3>
                <p className="font-body text-muted text-sm">Enter your basic details to continue to payment.</p>
              </div>
            </div>
            <div className="w-full h-[1px] bg-border mb-8" />

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
              
              {/* Field 1: Visa Duration */}
              <div>
                <label className="block font-body font-bold text-primary text-sm mb-3">Select Visa Duration *</label>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="visaDuration"
                    control={control}
                    render={({ field }) => (
                      <>
                        <VisaDurationCard
                          type="1-Year"
                          price="£88"
                          selected={field.value === "1-Year"}
                          onSelect={() => field.onChange("1-Year")}
                        />
                        <VisaDurationCard
                          type="5-Year"
                          price="£150"
                          selected={field.value === "5-Year"}
                          onSelect={() => field.onChange("5-Year")}
                          bestValue
                        />
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

              {/* Fields 2 & 3: Emails */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-body font-bold text-primary text-sm mb-2">Email address *</label>
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
                  <label className="block font-body font-bold text-primary text-sm mb-2">Confirm email *</label>
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
                <label className="block font-body font-bold text-primary text-sm mb-2">Mobile number *</label>
                <div className="flex gap-3">
                  <select
                    {...register("countryCode")}
                    disabled={isSubmitting}
                    className="w-[140px] px-3 py-3 border-[1.5px] border-border rounded-input font-body text-[14px] bg-white outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] transition-all duration-200"
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

              {/* Field 5: Full Name */}
              <div>
                <label className="block font-body font-bold text-primary text-sm mb-2">Full name (as per passport) *</label>
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
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-body font-bold text-primary text-sm mb-2">Nationality *</label>
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
                  <label className="block font-body font-bold text-primary text-sm mb-2">Residence *</label>
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
                <label className="block font-body font-bold text-primary text-sm mb-3">Purpose of visit *</label>
                <Controller
                  name="purposeOfVisit"
                  control={control}
                  render={({ field }) => (
                    <PurposePills 
                      selected={field.value} 
                      onSelect={(val) => field.onChange(val)} 
                    />
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
                <label className={`flex items-start gap-3 bg-[#FFFBF0] rounded-xl border p-4 cursor-pointer transition-colors ${
                  errors.consent ? "border-red" : "border-accent/30"
                }`}>
                  <input
                    type="checkbox"
                    {...register("consent")}
                    disabled={isSubmitting}
                    className="mt-0.5 w-5 h-5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="font-body text-sm text-primary leading-relaxed select-none">
                    I agree to the <span className="text-accent font-bold">Terms & Privacy Policy</span> and consent to be contacted regarding my application. *
                  </span>
                </label>
                <AnimatePresence>
                  {errors.consent && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ui-red text-xs font-bold mt-2">
                      {errors.consent.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Legal Disclaimer Box */}
              <div className="bg-[#FFFBF0] border border-accent/30 rounded-lg p-3 flex gap-3 text-primary mt-6">
                <Shield className="w-5 h-5 shrink-0 text-accent" />
                <p className="font-body text-[13px] leading-relaxed">
                  Independent service. Not affiliated with the Government of India.
                </p>
              </div>

              {/* Submit CTA */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                animate={hasSubmitError ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                whileHover={!isSubmitting ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isSubmitting ? { scale: 0.97 } : {}}
                className={`w-full bg-accent text-primary font-bold text-[16px] px-7 py-[15px] rounded-btn hover:shadow-btn-hover flex justify-center items-center transition-all ${
                  isSubmitting ? "bg-slate-300 shadow-none cursor-not-allowed transform-none" : ""
                }`}
                style={{ transitionDuration: shouldReduceMotion ? "0.01s" : "0.2s" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating your case...
                  </>
                ) : (
                  "Continue to Payment →"
                )}
              </motion.button>
            </form>

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 font-body text-[11px] sm:text-xs text-muted font-bold tracking-wide">
              <span>🔒 Secure & encrypted</span>
              <span>📧 Instant file number</span>
              <span>💬 WhatsApp updates</span>
              <span>✅ Expert review</span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
