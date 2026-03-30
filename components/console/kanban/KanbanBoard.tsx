"use client";

import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { SlideOverPanel } from "./SlideOverPanel";
import { KANBAN_COLUMNS, type PipelineCase } from "@/lib/data/mockConsoleData";
import { useConsole } from "../ConsoleContext";
import toast from "react-hot-toast";

export function KanbanBoard() {
  const { cases, moveCase } = useConsole();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<PipelineCase | null>(null);
  const [serviceFilter, setServiceFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [ageingFilter, setAgeingFilter] = useState("Any");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id && active.data.current?.originalColumnId !== over.id) {
      moveCase(active.id as string, over.id as PipelineCase["stage"]);
      const columnTitle = KANBAN_COLUMNS.find((col) => col.id === over.id)?.title;
      toast.success(`${active.id} moved to ${columnTitle}`);
    }
  };

  const filteredCases = cases.filter((item) => {
    const byService = serviceFilter === "All" || item.serviceType === serviceFilter;
    const byCountry = countryFilter === "All" || item.country === countryFilter;
    const byStaff = staffFilter === "All" || (staffFilter === "Unassigned" ? !item.assignedTo : item.assignedTo === staffFilter);
    const byAgeing =
      ageingFilter === "Any" ||
      (ageingFilter === "3 days+" && (item.slaBreached || item.slaTimer.startsWith("-"))) ||
      (ageingFilter === "5 days+" && item.slaBreached) ||
      (ageingFilter === "7 days+" && item.slaBreached);
    return byService && byCountry && byStaff && byAgeing;
  });

  return (
    <>
      <SlideOverPanel 
        isOpen={!!selectedCase} 
        onClose={() => setSelectedCase(null)} 
        caseData={selectedCase} 
      />

      <div className="flex flex-wrap gap-3 mb-4">
        {[
          ["Service Type", ["All", "OCI", "Passport Renewal", "E-Visa"], serviceFilter, setServiceFilter],
          ["Country", ["All", "India", "USA", "UK", "Canada"], countryFilter, setCountryFilter],
          ["Staff Member", ["All", "Nimit", "Riya", "Karan", "Unassigned"], staffFilter, setStaffFilter],
          ["Ageing", ["Any", "3 days+", "5 days+", "7 days+"], ageingFilter, setAgeingFilter],
        ].map(([label, options, value, setter]) => (
          <select
            key={label as string}
            value={value as string}
            onChange={(e) => (setter as (value: string) => void)(e.target.value)}
            className="bg-white border-[0.5px] border-[#D9E1EA] text-sm rounded-[10px] px-3 py-2 text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/25 focus:border-[#009877] min-w-[150px]"
            aria-label={label as string}
          >
            {(options as string[]).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ))}
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-[560px] max-h-[64vh] min-h-[420px] overflow-x-auto pb-2 custom-scrollbar">
          {KANBAN_COLUMNS.map((column) => {
            const columnCases = filteredCases.filter((c) => c.stage === column.id);
            return (
              <KanbanColumn key={column.id} id={column.id} title={column.title} color={column.color} count={columnCases.length}>
                {columnCases.map((c) => (
                  <KanbanCard 
                    key={c.id} 
                    {...c} 
                    onClick={() => setSelectedCase(c)}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeId && cases.find((c) => c.id === activeId) ? (() => {
            const activeCase = cases.find((c) => c.id === activeId)!;
            return (
              <div className="opacity-90 shadow-2xl scale-105 border-2 border-[#009877] rotate-2 z-50 rounded-[12px]">
                <KanbanCard 
                  {...activeCase}
                  onClick={() => {}}
                />
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
