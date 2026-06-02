"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Clock3, AlertCircle } from "lucide-react";
import { type PipelineCase } from "@/lib/kanban";

interface KanbanCardProps extends PipelineCase {
  onClick: () => void;
  draggable?: boolean;
  nextAction?: string;
  ownerLabel?: string;
  dueLabel?: string;
  blockerLabel?: string;
  customerWaiting?: boolean;
}

type KanbanCardContentProps = KanbanCardProps & {
  isDragging?: boolean;
};

function KanbanCardContent({
  id,
  customer,
  serviceType,
  paymentStatus,
  slaTimer,
  slaBreached,
  onClick,
  draggable = true,
  nextAction,
  dueLabel,
  blockerLabel,
  customerWaiting,
  isDragging = false,
}: KanbanCardContentProps) {
  const hasStatusRow = Boolean(dueLabel || blockerLabel || customerWaiting);

  const handleOpenTaskClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
    <div
      className={cn(
        "bg-white p-3 rounded-[12px] border-[0.5px] border-[#D9E1EA] hover:border-[#009877]/45 transition-all mb-2 z-10",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "opacity-90 shadow-lg scale-105 border-[#009877] rotate-1",
        slaBreached && !isDragging && "border-[#B42318]/45 shadow-[0_0_0_1px_rgba(180,35,24,0.08)]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#627D98]">{id}</span>
        <span className="shrink-0 rounded-full border-[0.5px] border-[#33A1FD]/35 bg-[#33A1FD]/12 px-2 py-0.5 text-[10px] font-medium text-[#0B69B7]">
          {serviceType}
        </span>
      </div>

      <h4 className="mt-1 text-sm font-semibold text-[#102A43]">{customer}</h4>

      <div className="my-2 border-t border-[#E5EAF0]" />

      {nextAction ? (
        <p className="text-xs font-medium text-[#B45309]">Next: {nextAction}</p>
      ) : (
        <p className="text-xs text-[#9AA5B4]">Next action not assigned</p>
      )}

      {hasStatusRow && (
        <p className="mt-1 text-[11px] text-[#627D98]">
          {dueLabel ? <span>{dueLabel}</span> : null}
          {blockerLabel ? <span className="text-[#B42318]">{dueLabel ? " · " : ""}⚠ {blockerLabel}</span> : null}
          {customerWaiting ? <span className="text-[#0B69B7]">{dueLabel || blockerLabel ? " · " : ""}👤 Customer waiting</span> : null}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
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

        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px]", slaBreached ? "text-[#B42318] bg-[#B42318]/12" : "text-[#486581] bg-[#F5F7FA]")}>
          {slaBreached ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          <span>{slaBreached ? `Overdue ${slaTimer}` : `SLA ${slaTimer}`}</span>
        </span>

        <button
          type="button"
          onClick={handleOpenTaskClick}
          className="border-none bg-transparent px-0 text-[11px] font-semibold text-[#009877] hover:underline"
        >
          Open Task →
        </button>
      </div>
    </div>
  );
}

function DraggableKanbanCard({
  id, 
  stage,
  ...props
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
    >
      <KanbanCardContent id={id} stage={stage} isDragging={isDragging} {...props} />
    </div>
  );
}

export function KanbanCard({ draggable = true, ...props }: KanbanCardProps) {
  if (!draggable) {
    return <KanbanCardContent draggable={false} {...props} />;
  }

  return <DraggableKanbanCard draggable={draggable} {...props} />;
}
