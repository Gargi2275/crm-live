"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, children, count, color }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-[#F8FAFF] rounded-xl border border-blue-100 overflow-hidden h-full">
      <div className="p-3 bg-white border-b border-blue-100 flex justify-between items-center sticky top-0">
        <h3 className={cn("font-semibold text-xs tracking-wide px-2 py-1 rounded border", color)}>{title}</h3>
        <span className="bg-[#F0F4FF] border border-blue-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
          {count}
        </span>
      </div>
      
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 overflow-y-auto min-h-[150px] transition-colors",
          isOver ? "bg-[#33A1FD]/10" : ""
        )}
      >
        {children}
        
        {/* Empty state or padding at bottom */}
        {count === 0 && !isOver && (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-blue-200 rounded-lg m-2">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}
