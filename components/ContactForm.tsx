"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  country: z.enum(["UK", "US", "Other"], { message: "Please select a country" }),
  service: z.enum([
    "New OCI", 
    "OCI Renewal/Transfer", 
    "OCI Update", 
    "Indian e-Visa", 
    "Passport Renewal", 
    "Not Sure"
  ], { message: "Please select a service" }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Form submitted:", data);
      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Submission error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Using standard form submission

  const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-navy mb-2">
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
          className="flex items-center gap-1.5 text-red-600 text-sm mt-1.5"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const inputClass = "w-full rounded-xl border-border bg-gray-50/50 px-4 py-3.5 text-textPrimary focus:bg-white focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all outline-none";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(15,31,61,0.08)] border border-border">
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <CheckCircle className="w-16 h-16 text-success mb-6" />
          <h3 className="text-2xl font-heading font-bold text-navy mb-2">Message Sent!</h3>
          <p className="text-textMuted font-body">
            We&apos;ve received your inquiry and will get back to you shortly.
          </p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="mt-8 text-saffron font-medium hover:underline"
          >
            Send another message
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              >
                <option value="" disabled selected>Select a country...</option>
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
              >
                <option value="" disabled selected>Select a service...</option>
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
            ></textarea>
            <ErrorMessage message={errors.message?.message} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy text-white font-medium py-4 px-6 rounded-xl shadow-[0_8px_24px_rgba(15,31,61,0.2)] hover:bg-opacity-90 transition-all flex justify-center items-center disabled:opacity-70 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending Message...
              </>
            ) : (
              "Send Message"
            )}
          </motion.button>

          <p className="text-xs text-center text-gray-500 mt-4">
            * Please do not share card details or bank information via this form. We only use secure payment links for any fees.
          </p>
        </form>
      )}
    </div>
  );
}
