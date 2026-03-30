"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2,Check } from "lucide-react";

import { useEVisa } from "@/context/EVisaContext";
import { Reveal } from "@/components/Reveal";
import { ProgressStepper } from "@/components/ProgressStepper";
import { FileDropZone } from "@/components/FileDropZone";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
import { eVisaApi } from "@/lib/api-client";

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateData } = useEVisa();
  const caseNumber = searchParams.get("case") || data.fileNumber || "";

  const [passportRef, setPassportRef] = useState<File | null>(null);
  const [photoRef, setPhotoRef] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [applicantEmail, setApplicantEmail] = useState(data.email || "");
  
  const [arrivalDate, setArrivalDate] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [addressInIndia, setAddressInIndia] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [notes, setNotes] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const fileNumber = caseNumber || "FO-EV-...";

  // Validate Required Fields
  const isFormValid = passportRef && photoRef && arrivalDate && portOfEntry && addressInIndia && applicantEmail && caseNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("case_number", caseNumber);
      formData.append("email", applicantEmail.toLowerCase());
      formData.append("passport_bio_page", passportRef as File);
      formData.append("applicant_photograph", photoRef as File);
      formData.append("intended_arrival_date", arrivalDate);
      formData.append("port_of_entry", portOfEntry);
      formData.append("address_in_india", addressInIndia);
      formData.append("emergency_contact", emergencyContact);

      supportingFiles.forEach((file) => formData.append("supporting_documents", file));

      setUploadProgress(55);
      await eVisaApi.uploadDocuments(formData);
      setUploadProgress(100);
      setIsSuccess(true);
      updateData({
        hasUploaded: true,
        fileNumber: caseNumber,
        email: applicantEmail,
        travelDetails: {
          arrivalDate,
          portOfEntry,
          addressInIndia,
          emergencyContact,
          additionalNotes: notes,
        },
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 w-full bg-bg relative pb-32">
        <div className="w-full bg-white py-2 px-4 shadow-sm sticky top-[72px] z-30">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="font-mono text-primary text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-muted">File No:</span> {fileNumber}
            </div>
            <div className="text-accent font-bold text-sm flex gap-2 items-center">
              ✓ Documents Complete
            </div>
          </div>
        </div>

        <div className="w-full">
          <ProgressStepper currentStep={5} />
        </div>

        <div className="max-w-[500px] mx-auto px-4 mt-16 text-center">
          <Reveal direction="up">
            <div className="mb-6 flex justify-center h-24">
              <AnimatedCheckmark size={96} color="#16A34A" />
            </div>
            <h2 className="font-heading font-extrabold text-[#16A34A] text-[36px] sm:text-[44px] mb-4">
              Documents Received <span className="inline-block translate-y-[-4px]">✅</span>
            </h2>
            <p className="font-body text-primary text-[17px] mb-10 max-w-[400px] mx-auto leading-relaxed">
              We&apos;ll proceed with submission shortly. Check back to track your case status.
            </p>
            <div className="space-y-4">
              <motion.button
                onClick={() => router.push("/track")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-accent text-white font-bold text-[16px] px-7 py-[16px] rounded-btn shadow-btn-hover"
              >
                Track Application
              </motion.button>
              <button
                onClick={() => setIsSuccess(false)}
                className="w-full bg-transparent border-2 border-primary text-primary font-bold text-[16px] px-7 py-[16px] rounded-btn hover:bg-primary hover:text-white transition-colors"
              >
                Upload more documents
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 border-[1.5px] border-border rounded-input font-body text-[15px] bg-white outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] transition-all duration-200";

  return (
    <div className="flex-1 w-full bg-bg relative pb-32">
      {/* Sticky White Header Bar */}
     <div className="w-full bg-white py-3 px-4  z-30">
  <div className="max-w-[1200px] mx-auto flex items-center gap-6">
    
    {/* File Number */}
    <div className="font-mono text-primary text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2">
      <span className="text-muted">File No:</span> {fileNumber}
    </div>

    {/* Stepper */}
    <div className="flex-1">
      <ProgressStepper currentStep={4} />
    </div>

  </div>
</div>
      <div className="sm:hidden w-full">
         <ProgressStepper currentStep={4} />
      </div>

      <div className="max-w-[640px] mx-auto px-4 mt-10">
        <Reveal direction="up" delay={0.1}>
          <div className="mb-8">
            <h2 className="font-heading font-extrabold text-primary text-[32px] sm:text-[42px] mb-2 text-center tracking-tight">
              Upload Required Documents
            </h2>
            <p className="font-body text-muted text-[16px] text-center max-w-[440px] mx-auto">
              Application cannot be submitted until uploads are complete.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Passport Card */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-[10px] bg-accent/10 text-xl flex items-center justify-center shrink-0">
                  🛂
                </div>
                <div>
                  <h3 className="font-body font-bold text-primary text-xl">Passport Bio Page *</h3>
                  <p className="font-mono text-xs text-muted font-bold tracking-wide mt-1">JPG / PNG / PDF — Max 5MB</p>
                </div>
              </div>
              <FileDropZone
                label="Upload Passport Photo Page"
                accept=".pdf,image/jpeg,image/png"
                maxSizeMsg="Upload a clear photo or scan of the photo page of your passport."
                file={passportRef}
                onUpload={(f) => setPassportRef(f)}
              />
            </div>

            {/* Photo Card */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-[10px] bg-accent/10 text-xl flex items-center justify-center shrink-0">
                  📸
                </div>
                <div>
                  <h3 className="font-body font-bold text-primary text-xl">Applicant Photograph *</h3>
                  <p className="font-mono text-xs text-muted font-bold tracking-wide mt-1">JPG / PNG only — Max 2MB</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-6 font-body text-sm font-medium text-primary bg-[#FAF9F5] p-5 rounded-xl border border-border">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> White background only</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> No glasses</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> Taken within 6 months</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green" /> Face clearly visible</div>
              </div>

              <FileDropZone
                label="Upload Applicant Photo"
                accept="image/jpeg,image/png"
                maxSizeMsg="Ensure your photo meets the requirements above to avoid delays."
                file={photoRef}
                onUpload={(f) => setPhotoRef(f)}
              />
            </div>

            {/* Additional Details Form */}
            <div className="bg-card rounded-card shadow-card overflow-hidden">
               <div className="bg-primary px-6 py-5 border-b border-border">
                  <h3 className="font-body font-bold text-white text-xl">Arrival & Additional Details</h3>
               </div>
               
               <div className="p-6 sm:p-8 space-y-5">
                 <div className="grid sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Email Used for Registration *</label>
                     <input
                       type="email"
                       required
                       value={applicantEmail}
                       onChange={(e) => setApplicantEmail(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Intended Arrival Date *</label>
                     <input
                       type="date"
                       required
                       value={arrivalDate}
                       onChange={(e) => setArrivalDate(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                   <div>
                     <label className="block font-body font-bold text-primary text-sm mb-2">Port of Entry *</label>
                     <input
                       type="text"
                       placeholder="e.g. New Delhi"
                       required
                       value={portOfEntry}
                       onChange={(e) => setPortOfEntry(e.target.value)}
                       className={inputClasses}
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block font-body font-bold text-primary text-sm mb-2">Address in India *</label>
                   <textarea
                     placeholder="Hotel name or complete residential address"
                     required
                     rows={3}
                     value={addressInIndia}
                     onChange={(e) => setAddressInIndia(e.target.value)}
                     className={`${inputClasses} resize-none`}
                   />
                 </div>
                 <div>
                   <label className="block font-body font-bold text-primary text-sm mb-2">Emergency Contact (Optional)</label>
                   <input
                     type="text"
                     placeholder="Name and phone number"
                     value={emergencyContact}
                     onChange={(e) => setEmergencyContact(e.target.value)}
                     className={inputClasses}
                   />
                 </div>
               </div>
            </div>

            {/* Optional Section */}
            <div className="bg-card rounded-card shadow-card p-6 sm:p-8 border border-border">
               <h3 className="font-body font-bold text-primary text-xl mb-3">Optional Information</h3>
               <p className="font-body text-sm text-muted mb-6">If you have extra supporting documents, upload them below.</p>
               
               <label className="block font-body font-bold text-primary text-sm mb-2">Supporting Documents</label>
               <input 
                  type="file" 
                  multiple 
                onChange={(e) => setSupportingFiles(Array.from(e.target.files || []))}
                  className="block w-full font-body text-sm text-muted
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-btn file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/5 file:text-primary
                  hover:file:bg-primary/10 file:transition-colors mb-6"
               />

               <label className="block font-body font-bold text-primary text-sm mb-2">Notes to FlyOCI team</label>
               <textarea
                 placeholder="Any specific information our team should know..."
                 rows={3}
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className={`${inputClasses} resize-none`}
               />
            </div>

            <motion.button
              type="submit"
              disabled={!isFormValid || isUploading}
              whileHover={isFormValid && !isUploading ? { scale: 1.02, y: -2 } : {}}
              whileTap={isFormValid && !isUploading ? { scale: 0.98 } : {}}
              className={`w-full font-bold text-[16px] px-7 py-[18px] rounded-btn shadow-[0_4px_16px_rgba(245,166,35,0.28)] flex justify-center items-center transition-all duration-300 mt-8 ${
                isFormValid && !isUploading 
                  ? "bg-accent text-white shadow-btn hover:shadow-btn-hover" 
                  : "bg-slate-300 text-white-500 shadow-none cursor-not-allowed transform-none"
              }`}
            >
              Submit Documents
            </motion.button>

            {uploadError && (
              <p className="text-center text-sm text-red-600 font-semibold">{uploadError}</p>
            )}
          </form>
        </Reveal>
      </div>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-[360px] w-full text-center"
            >
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 relative">
                <span className="text-4xl translate-x-1">
  <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
</span>
              </div>
              
              <h3 className="font-heading font-extrabold text-primary text-2xl mb-2">Uploading Files</h3>
              
              <div className="w-full h-2.5 bg-border rounded-full overflow-hidden mb-3 relative mt-8">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-primary"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              <div className="font-mono text-xl font-bold text-primary">
                {Math.round(uploadProgress)}%
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
