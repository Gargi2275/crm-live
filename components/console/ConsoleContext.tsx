"use client";

import { createContext, useContext, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FLYOCI_ROLES,
  PIPELINE_CASES,
  type ConsoleRole,
  type KanbanStage,
  type PipelineCase,
} from "@/lib/data/mockConsoleData";

interface ConsoleContextValue {
  role: ConsoleRole;
  setRole: (role: ConsoleRole) => void;
  roles: ConsoleRole[];
  cases: PipelineCase[];
  moveCase: (caseId: string, stage: KanbanStage) => void;
  autoAssignTasks: () => void;
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<ConsoleRole>("Admin / CEO");
  const [cases, setCases] = useState<PipelineCase[]>(PIPELINE_CASES);

  const moveCase = (caseId: string, stage: KanbanStage) => {
    setCases((prev) => prev.map((item) => (item.id === caseId ? { ...item, stage } : item)));
  };

  const autoAssignTasks = () => {
    const roundRobin = ["Nimit", "Riya", "Karan"];
    let idx = 0;
    setCases((prev) =>
      prev.map((item) => {
        if (item.assignedTo) return item;
        const assignedTo = roundRobin[idx % roundRobin.length];
        idx += 1;
        return { ...item, assignedTo };
      }),
    );
    toast.success("Tasks distributed evenly");
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      roles: FLYOCI_ROLES,
      cases,
      moveCase,
      autoAssignTasks,
    }),
    [role, cases],
  );

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole() {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error("useConsole must be used within ConsoleProvider");
  }
  return context;
}

