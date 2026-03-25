"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

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

export function EVisaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EVisaState>(initialState);
  const [isClient, setIsClient] = useState(false);

  // Use localStorage for persistence if desired, but for now memory state
  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateData = (updates: Partial<EVisaState>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(initialState);
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
