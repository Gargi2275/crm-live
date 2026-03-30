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
    <div className="flex flex-col flex-shrink-0 w-80 bg-[#F8FAFC] rounded-[12px] border-[0.5px] border-[#D9E1EA] overflow-hidden h-full">
      <div className="p-3 bg-white border-b border-[0.5px] border-[#D9E1EA] flex justify-between items-center sticky top-0 z-10">
        <h3 className={cn("font-heading font-semibold text-[11px] tracking-wide px-2.5 py-1 rounded-full border", color)}>{title}</h3>
        <span className="bg-[#F5F7FA] border-[0.5px] border-[#D9E1EA] text-[#334E68] text-xs font-heading font-semibold px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2.5 overflow-y-auto min-h-[150px] transition-colors space-y-2",
          isOver ? "bg-[#009877]/10" : ""
        )}
      >
        {children}
        
        {/* Empty state or padding at bottom */}
        {count === 0 && !isOver && (
          <div className="h-full flex items-center justify-center text-[#627D98] text-sm border border-dashed border-[#D9E1EA] rounded-[10px] m-2 bg-white">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}
