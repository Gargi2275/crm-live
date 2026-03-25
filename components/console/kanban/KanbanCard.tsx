"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Clock3, AlertCircle, MoreHorizontal } from "lucide-react";
import { type PipelineCase } from "@/lib/data/mockConsoleData";

interface KanbanCardProps extends PipelineCase {
  onClick: () => void;
}

export function KanbanCard({ 
  id, 
  customer, 
  serviceType,
  flag,
  assignedTo,
  paymentStatus,
  slaTimer,
  slaBreached,
  stage,
  onClick 
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      id,
      originalColumnId: stage,
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-white p-3 rounded-lg border border-blue-100 cursor-grab active:cursor-grabbing hover:border-[#33A1FD]/50 transition-colors mb-2 z-10",
        isDragging && "opacity-90 shadow-lg scale-105 border-[#33A1FD] rotate-2",
        slaBreached && !isDragging && "border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-slate-500">{id}</span>
        <button className="text-slate-500 hover:text-slate-900">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      <h4 className="font-semibold text-slate-900 text-sm">{customer}</h4>
      <p className="text-xs text-slate-400 mt-1">{flag} {assignedTo ?? "Unassigned"}</p>
      
      <div className="flex items-center justify-between mt-3 gap-2">
        <span className="text-xs font-medium bg-[#33A1FD]/15 text-[#33A1FD] border border-[#33A1FD]/30 px-2 py-0.5 rounded text-[10px]">
          {serviceType}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded",
            paymentStatus === "Paid" && "bg-green-500/20 text-green-300",
            paymentStatus === "Pending" && "bg-red-500/20 text-red-300",
            paymentStatus === "Prepaid" && "bg-amber-500/20 text-amber-300",
          )}
        >
          {paymentStatus}
        </span>
      </div>

      <div className={cn("mt-3 flex items-center gap-1 text-xs", slaBreached ? "text-red-300" : "text-slate-400")}>
        {slaBreached ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
        <span>{slaBreached ? `Overdue ${slaTimer}` : `SLA ${slaTimer}`}</span>
      </div>
    </div>
  );
}
