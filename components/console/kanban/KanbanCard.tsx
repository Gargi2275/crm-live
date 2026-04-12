"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Clock3, AlertCircle, MoreHorizontal } from "lucide-react";
import { type PipelineCase } from "@/lib/kanban";

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
        "bg-white p-3 rounded-[12px] border-[0.5px] border-[#D9E1EA] cursor-grab active:cursor-grabbing hover:border-[#009877]/45 transition-all mb-2 z-10",
        isDragging && "opacity-90 shadow-lg scale-105 border-[#009877] rotate-1",
        slaBreached && !isDragging && "border-[#B42318]/45 shadow-[0_0_0_1px_rgba(180,35,24,0.08)]"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-heading font-semibold text-[#627D98]">{id}</span>
        <button className="text-[#627D98] hover:text-[#102A43]">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      <h4 className="font-heading font-semibold text-[#102A43] text-sm">{customer}</h4>
      <p className="text-xs text-[#627D98] mt-1">{flag} {assignedTo ?? "Unassigned"}</p>
      
      <div className="flex items-center justify-between mt-3 gap-2">
        <span className="text-xs font-medium bg-[#33A1FD]/12 text-[#0B69B7] border-[0.5px] border-[#33A1FD]/35 px-2 py-0.5 rounded-full text-[10px]">
          {serviceType}
        </span>
        <span
          className={cn(
            "text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full",
            paymentStatus === "Paid" && "bg-[#009877]/12 text-[#006F57]",
            paymentStatus === "Pending" && "bg-[#B87333]/12 text-[#9C4F17]",
            paymentStatus === "Prepaid" && "bg-[#33A1FD]/12 text-[#0B69B7]",
          )}
        >
          {paymentStatus}
        </span>
      </div>

      <div className={cn("mt-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full", slaBreached ? "text-[#B42318] bg-[#B42318]/12" : "text-[#486581] bg-[#F5F7FA]")}>
        {slaBreached ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
        <span>{slaBreached ? `Overdue ${slaTimer}` : `SLA ${slaTimer}`}</span>
      </div>
    </div>
  );
}
