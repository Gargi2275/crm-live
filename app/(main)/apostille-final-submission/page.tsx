"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FileDropZone } from "@/components/FileDropZone";

const progress = ["Pre-Check Submitted", "Approved", "Payment Received", "Final Submission", "Processing", "Completed"];

export default function ApostilleFinalSubmissionPage() {
  const router = useRouter();
  const [deliveryName, setDeliveryName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deliveryName || !line1 || !city || !postcode || !country || !confirmed) {
      setError("Please complete required fields and confirm declaration.");
      return;
    }

    setError("");
    router.push("/track-apostille/status?file=FLY-APO-1048&stage=processing");
  };

  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_75%)]">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-heading font-bold text-primary">Complete Your Apostille Submission</h1>
        <p className="mt-3 text-lg text-textMuted">
          Your payment has been received. Please provide any final information required to move your case into processing.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
          {progress.map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1.5 ${item === "Final Submission" ? "bg-[#1d6fd1] text-white" : "bg-[#eef5ff] text-[#365c89]"}`}
            >
              {item}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-[#d8e6fc] bg-white p-6 shadow-[0_12px_30px_rgba(20,60,106,0.1)] space-y-6">
          <h2 className="text-xl font-heading font-bold text-primary">Delivery Details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Full Delivery Name" value={deliveryName} onChange={setDeliveryName} placeholder="Enter recipient name" />
            <InputField label="Delivery Address Line 1" value={line1} onChange={setLine1} placeholder="Enter address line 1" />
            <InputField label="Delivery Address Line 2" value={line2} onChange={setLine2} placeholder="Enter address line 2" />
            <InputField label="City" value={city} onChange={setCity} placeholder="Enter city" />
            <InputField label="Postcode / ZIP Code" value={postcode} onChange={setPostcode} placeholder="Enter postcode" />
            <InputField label="Country" value={country} onChange={setCountry} placeholder="Enter country" />
          </div>

          <h2 className="text-xl font-heading font-bold text-primary">Additional Uploads</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FileDropZone
              label="Upload Supporting Document (Optional)"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMsg="Upload any additional document requested by our team"
              onUpload={setSupportingDoc}
              file={supportingDoc}
            />
            <FileDropZone
              label="Upload Identification Document (If Requested)"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMsg="Upload only if requested during review"
              onUpload={setIdDoc}
              file={idDoc}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#23466f]">Special Instructions (Optional)</label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={4}
              placeholder="Add any final notes relevant to your Apostille request"
              className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
            />
          </div>

          <div className="rounded-xl border border-[#dce9fb] bg-[#f8fbff] p-4">
            <label className="flex items-start gap-2 text-sm text-[#23466f]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I confirm that the details submitted are correct to the best of my knowledge.
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto">Submit Final Details</Button>
            <Link href="/track-apostille/status?file=FLY-APO-1048&stage=processing">
              <Button variant="outline" className="w-full sm:w-auto">Refresh Status</Button>
            </Link>
          </div>

          <p className="text-xs text-[#5f7698]">Once submitted, your request will move into processing.</p>
        </form>
      </div>
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#23466f]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[#d7e4f8] px-3 py-2.5"
      />
    </div>
  );
}
