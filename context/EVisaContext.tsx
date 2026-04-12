"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { EVISA_DEFAULTS } from "@/lib/evisa-config";

interface TravelDetails {
  arrivalDate: string;
  portOfEntry: string;
  addressInIndia: string;
  emergencyContact: string;
  additionalNotes: string;
}

interface EVisaState {
  fileNumber: string | null;
  visaDuration: "1-Year" | "5-Year" | null;
  email: string;
  phone: string;
  countryCode: string;
  fullName: string;
  nationality: string;
  countryOfResidence: string;
  purposeOfVisit: string;
  consentAccepted: boolean;
  otpExpiresInMinutes: number;
  resendCooldownSeconds: number;
  maxResends: number;
  
  // Progression
  isEmailConfirmed: boolean;
  hasPaid: boolean;
  hasUploaded: boolean;
  
  travelDetails: TravelDetails;
}

interface EVisaContextType {
  data: EVisaState;
  updateData: (updates: Partial<EVisaState>) => void;
  resetData: () => void;
}

const initialState: EVisaState = {
  fileNumber: null,
  visaDuration: null,
  email: "",
  phone: "",
  countryCode: "+44",
  fullName: "",
  nationality: "",
  countryOfResidence: "",
  purposeOfVisit: "",
  consentAccepted: false,
  otpExpiresInMinutes: EVISA_DEFAULTS.otpExpiresInMinutes,
  resendCooldownSeconds: EVISA_DEFAULTS.resendCooldownSeconds,
  maxResends: EVISA_DEFAULTS.maxResends,
  isEmailConfirmed: false,
  hasPaid: false,
  hasUploaded: false,
  travelDetails: {
    arrivalDate: "",
    portOfEntry: "",
    addressInIndia: "",
    emergencyContact: "",
    additionalNotes: "",
  }
};

const EVisaContext = createContext<EVisaContextType | undefined>(undefined);
const EVISA_STORAGE_KEY = "flyoci:evisa-state";

export function EVisaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EVisaState>(initialState);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    try {
      const raw = localStorage.getItem(EVISA_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EVisaState>;
      setData((prev) => ({
        ...prev,
        ...parsed,
        travelDetails: {
          ...prev.travelDetails,
          ...(parsed.travelDetails || {}),
        },
      }));
    } catch {
      // Ignore invalid persisted payloads.
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(EVISA_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota/storage errors.
    }
  }, [data, isClient]);

  const updateData = (updates: Partial<EVisaState>) => {
    setData((prev) => ({
      ...prev,
      ...updates,
      travelDetails: {
        ...prev.travelDetails,
        ...(updates.travelDetails || {}),
      },
    }));
  };

  const resetData = () => {
    setData(initialState);
    if (typeof window !== "undefined") {
      localStorage.removeItem(EVISA_STORAGE_KEY);
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch if relying on localstorage later

  return (
    <EVisaContext.Provider value={{ data, updateData, resetData }}>
      {children}
    </EVisaContext.Provider>
  );
}

export function useEVisa() {
  const context = useContext(EVisaContext);
  if (context === undefined) {
    throw new Error("useEVisa must be used within an EVisaProvider");
  }
  return context;
}
