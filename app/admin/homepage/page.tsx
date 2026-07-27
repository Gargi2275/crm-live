"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, LayoutTemplate, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  listAdminHomepageModules,
  reorderAdminHomepageModules,
  updateAdminHomepageModule,
  type AdminHomepageModule,
} from "@/lib/admin-auth";

function SortableModuleRow({
  row,
  saving,
  onToggle,
}: {
  row: AdminHomepageModule;
  saving: boolean;
  onToggle: (row: AdminHomepageModule) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: saving,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-[#F8FCFF] ${
        isDragging ? "bg-[#EFF7FF] shadow-sm relative z-10" : ""
      } ${saving ? "" : "cursor-grab active:cursor-grabbing"}`}
      title="Drag anywhere on the row to reorder homepage sections"
      {...attributes}
      {...listeners}
    >
      <td className="px-2 py-2.5 w-10">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#829AB1]" aria-hidden="true">
          <GripVertical className="h-4 w-4" />
        </span>
      </td>
      <td className="px-3 py-2.5">
        <p className="font-semibold text-[#102A43]">{row.label}</p>
        <p className="text-xs font-mono text-[#829AB1]">{row.key}</p>
      </td>
      <td className="px-3 py-2.5 text-[#486581] tabular-nums">{row.display_order}</td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            row.is_active ? "bg-[#E6F7F2] text-[#006F57]" : "bg-[#F1F5F9] text-[#627D98]"
          }`}
        >
          {row.is_active ? "Visible" : "Hidden"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(row);
          }}
          disabled={saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] px-2.5 text-xs font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-50"
        >
          {row.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {row.is_active ? "Hide" : "Show"}
        </button>
      </td>
    </tr>
  );
}

export default function AdminHomepageModulesPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = adminUser?.role === "admin";

  const [rows, setRows] = useState<AdminHomepageModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const modules = await listAdminHomepageModules();
      setRows(modules);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load homepage modules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSetAdminPageChrome({
    title: "Homepage modules",
    subtitle: "Drag to set public homepage section order",
    actions: (
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading || saving}
        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#D9E1EA] bg-white px-3 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    ),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isAdmin || saving) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);
    setSaving(true);
    try {
      const saved = await reorderAdminHomepageModules(next.map((row) => row.id));
      setRows(saved);
      toast.success("Homepage order updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save order.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: AdminHomepageModule) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const updated = await updateAdminHomepageModule(row.id, { is_active: !row.is_active });
      if (updated) {
        setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      toast.success(row.is_active ? "Section hidden on homepage." : "Section shown on homepage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update section.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#E8F7F3] text-[#006F57]">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[#102A43]">Homepage section order</h2>
            <p className="mt-0.5 text-sm text-[#627D98]">
              Drag rows to change the public homepage sequence. Changes save automatically. Hidden
              sections stay in the list but are not rendered on the site.
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <p className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
            Only admins can reorder or show/hide homepage modules.
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[#E4ECF4]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#829AB1]">
                <tr>
                  <th className="px-2 py-2.5 w-10" />
                  <th className="px-3 py-2.5 font-semibold">Section</th>
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Visibility</th>
                </tr>
              </thead>
              <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-[#EEF2F6] bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[#829AB1]">
                        Loading modules…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-[#829AB1]">
                        No homepage modules found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <SortableModuleRow
                        key={row.id}
                        row={row}
                        saving={saving || !isAdmin}
                        onToggle={handleToggle}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
