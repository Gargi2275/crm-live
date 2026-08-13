"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";
import {
  formatTaskStatusLabel,
  getTaskEffectiveStatus,
  isTaskCompleted,
  isTaskPending,
  taskStatusBadgeClass,
  type AdminStaffInternalMessage,
  type AdminTaskItem,
} from "@/lib/admin-auth";
import { parseTaskDescription } from "@/lib/task-description";
import { ExpressBadge } from "@/components/console/ExpressBadge";
import { compareExpressFirst, taskIsExpress } from "@/lib/kanban";

export type StaffWorkloadSummary = {
  id: number;
  name: string;
  role: string;
  assigned: number;
  pending: number;
  completed: number;
  loadStatus: string;
  slaBreach: number;
};

type StaffWorkloadSlideOverProps = {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffWorkloadSummary | null;
  /** Tasks for this staff (respects page-level KPI/search filters). */
  tasks: AdminTaskItem[];
  /** All tasks for this staff (for sidebar KPI counts). */
  allTasks?: AdminTaskItem[];
  internalNotes?: AdminStaffInternalMessage[];
};

type PanelTab = "tasks" | "notes";
type SidebarListFilter = "all" | "assigned" | "pending" | "completed";

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function formatTaskName(task: AdminTaskItem) {
  return String(task.task_type || "task")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function staffActivitySummary(task: AdminTaskItem) {
  const status = getTaskEffectiveStatus(task);
  if (status === "completed") {
    const when = task.completed_at || task.updated_at;
    return when ? `Completed ${formatDateTime(when)}` : "Marked complete";
  }
  if (status === "in_progress") {
    return task.updated_at ? `In progress · updated ${formatDateTime(task.updated_at)}` : "In progress";
  }
  if (status === "blocked") return "Waiting / needs follow-up";
  if (status === "cancelled") return "Cancelled";
  return task.created_at ? `Assigned ${formatDateTime(task.created_at)}` : "Assigned";
}

function loadStatusStyles(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "on leave") return "bg-[#FEE2E2] text-[#9B1C1C] border-[#F8B4B4]";
  if (normalized === "overloaded") return "bg-[#FEE4E2] text-[#B42318] border-[#FECDCA]";
  if (normalized === "busy") return "bg-[#FFF4E5] text-[#9C4F17] border-[#F9DBAF]";
  return "bg-[#E6F7F2] text-[#006F57] border-[#B7EBD8]";
}

function isPending(task: AdminTaskItem) {
  return isTaskPending(task);
}

function isCompleted(task: AdminTaskItem) {
  return isTaskCompleted(task);
}

export function StaffWorkloadSlideOver({
  isOpen,
  onClose,
  staff,
  tasks,
  allTasks,
  internalNotes = [],
}: StaffWorkloadSlideOverProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [listFilter, setListFilter] = useState<SidebarListFilter>("all");
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const sourceTasks = allTasks ?? tasks;

  const kpiCounts = useMemo(() => {
    return {
      assigned: sourceTasks.length,
      pending: sourceTasks.filter(isPending).length,
      completed: sourceTasks.filter(isCompleted).length,
    };
  }, [sourceTasks]);

  const filteredListTasks = useMemo(() => {
    let list = tasks;
    if (listFilter === "pending") list = tasks.filter(isPending);
    else if (listFilter === "completed") list = tasks.filter(isCompleted);
    return [...list].sort((a, b) => {
      const pendingA = isPending(a) ? 0 : 1;
      const pendingB = isPending(b) ? 0 : 1;
      if (pendingA !== pendingB) return pendingA - pendingB;
      return compareExpressFirst(a, b);
    });
  }, [listFilter, tasks]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedTaskId(null);
      setActiveTab("tasks");
      setListFilter("all");
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedTaskId(null);
    setActiveTab("tasks");
    setListFilter("all");
    scrollToTop();
  }, [staff?.id]);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(null);
      scrollToTop();
    }
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedTaskId) {
        handleBackToList();
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, selectedTaskId]);

  if (!mounted || !isOpen || !staff) return null;

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? sourceTasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const backLabel = selectedTaskId ? `Back to ${staff.name}'s tasks` : "Back to workload";
  const pending = filteredListTasks.filter(isPending);
  const done = filteredListTasks.filter(isCompleted);
  const other = filteredListTasks.filter((t) => !isPending(t) && !isCompleted(t));

  const handleClose = () => {
    setSelectedTaskId(null);
    onClose();
  };

  const handleBackToList = () => {
    setSelectedTaskId(null);
    scrollToTop();
  };

  const handleBack = () => {
    if (selectedTaskId) {
      handleBackToList();
    } else {
      handleClose();
    }
  };

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    scrollToTop();
  };

  const handleListFilter = (filter: SidebarListFilter) => {
    setListFilter((current) => (current === filter ? "all" : filter));
    setSelectedTaskId(null);
    scrollToTop();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex font-body">
      <button
        type="button"
        aria-label="Close panel"
        className="hidden sm:block flex-1 bg-[#102A43]/40"
        onClick={handleClose}
      />
      <aside className="ml-auto w-full max-w-full sm:max-w-[520px] shrink-0 h-[100dvh] max-h-[100dvh] min-h-0 bg-white shadow-2xl flex flex-col border-l border-[#D9E1EA] overflow-hidden">
        <div className="shrink-0 sticky top-0 z-30 bg-white border-b border-[#E5EAF0] px-4 pt-4 pb-3 shadow-sm">
          <button
            type="button"
            onClick={handleBack}
            className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#009877] px-4 py-3 text-sm font-heading font-semibold text-white hover:bg-[#007B61] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            <span className="truncate">{backLabel}</span>
          </button>
        </div>

        <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-5 py-4">
          <div className="min-w-0">
            <p
              className={`font-heading font-semibold text-[#102A43] leading-snug ${
                selectedTask ? "text-xl" : "text-lg"
              }`}
            >
              {selectedTask ? formatTaskName(selectedTask) : staff.name}
            </p>
            <p className="text-sm text-[#627D98] capitalize mt-1.5 break-all">
              {selectedTask
                ? selectedTask.application_reference || `Task #${selectedTask.id}`
                : String(staff.role).replace(/_/g, " ")}
            </p>
            {!selectedTask ? (
              <span
                className={`inline-block mt-2.5 text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${loadStatusStyles(staff.loadStatus)}`}
              >
                {staff.loadStatus}
              </span>
            ) : null}
          </div>
        </div>

        {!selectedTask ? (
          <>
            <div className="shrink-0 grid grid-cols-3 gap-2 px-5 py-3 border-b border-[#E5EAF0] bg-white">
              {(
                [
                  { key: "assigned" as const, label: "Assigned", value: kpiCounts.assigned, tone: "text-[#0B69B7]" },
                  { key: "pending" as const, label: "Pending", value: kpiCounts.pending, tone: "text-[#9C4F17]" },
                  { key: "completed" as const, label: "Done", value: kpiCounts.completed, tone: "text-[#006F57]" },
                ] as const
              ).map((kpi) => {
                const active =
                  listFilter === kpi.key || (listFilter === "all" && kpi.key === "assigned");
                return (
                  <button
                    key={kpi.key}
                    type="button"
                    onClick={() => handleListFilter(kpi.key)}
                    className={`rounded-[10px] border px-3 py-2 text-center transition-colors ${
                      active
                        ? "border-[#009877] bg-[#009877]/10 ring-1 ring-[#009877]/25"
                        : "border-[#D9E1EA] bg-[#F8FAFC] hover:border-[#33A1FD]/40"
                    }`}
                  >
                    <p className="text-[10px] text-[#627D98]">{kpi.label}</p>
                    <p className={`text-lg font-semibold leading-tight ${kpi.tone}`}>{kpi.value}</p>
                  </button>
                );
              })}
            </div>

            {staff.slaBreach > 0 ? (
              <p className="shrink-0 px-5 py-2 text-xs font-medium text-[#B42318] bg-[#FEE4E2]/50">
                {staff.slaBreach} overdue task(s)
              </p>
            ) : null}

            <div className="shrink-0 flex border-b border-[#E5EAF0] bg-white">
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
                  activeTab === "tasks"
                    ? "border-[#009877] text-[#006F57]"
                    : "border-transparent text-[#627D98]"
                }`}
              >
                Tasks ({filteredListTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
                  activeTab === "notes"
                    ? "border-[#009877] text-[#006F57]"
                    : "border-transparent text-[#627D98]"
                }`}
              >
                Notes ({internalNotes.length})
              </button>
            </div>
          </>
        ) : null}

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-8 [scrollbar-gutter:stable]"
        >
          {selectedTask ? (
            <TaskDetailView task={selectedTask} staffName={staff.name} />
          ) : activeTab === "notes" ? (
            internalNotes.length === 0 ? (
              <p className="text-sm text-[#627D98]">No internal notes for this staff member.</p>
            ) : (
              <div className="space-y-2">
                {internalNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] px-3 py-2">
                    <p className="text-xs font-semibold text-[#102A43]">{note.application_reference}</p>
                    <p className="text-[11px] text-[#627D98] mt-0.5">
                      {note.sender_name} · {note.created_at ? formatDateTime(note.created_at) : ""}
                    </p>
                    <p className="text-sm text-[#334E68] mt-1 whitespace-pre-wrap">{note.message_text}</p>
                  </div>
                ))}
              </div>
            )
          ) : filteredListTasks.length === 0 ? (
            <p className="text-sm text-[#627D98]">
              No tasks match this filter for {staff.name}.
              {listFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => setListFilter("all")}
                  className="block mt-2 text-[#0B69B7] font-semibold hover:underline"
                >
                  Show all tasks
                </button>
              ) : null}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#627D98]">
                {listFilter !== "all"
                  ? `Showing ${listFilter} tasks · click KPI again to reset`
                  : "Click a task for full details"}
              </p>

              {pending.length > 0 ? (
                <TaskSection title={`Open (${pending.length})`} tasks={pending} onSelect={handleSelectTask} />
              ) : null}
              {other.length > 0 ? (
                <TaskSection title={`Other (${other.length})`} tasks={other} onSelect={handleSelectTask} />
              ) : null}
              {done.length > 0 ? (
                <TaskSection title={`Completed (${done.length})`} tasks={done} onSelect={handleSelectTask} />
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function TaskSection({
  title,
  tasks,
  onSelect,
}: {
  title: string;
  tasks: AdminTaskItem[];
  onSelect: (id: number) => void;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-[#627D98] uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskListRow key={task.id} task={task} onClick={() => onSelect(task.id)} />
        ))}
      </div>
    </section>
  );
}

function TaskListRow({ task, onClick }: { task: AdminTaskItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-[10px] border px-3 py-2.5 transition-colors ${
        taskIsExpress(task)
          ? "border-[#C2410C]/40 bg-[#FFF7ED] hover:border-[#C2410C]/70"
          : "border-[#D9E1EA] bg-white hover:border-[#33A1FD]/50 hover:bg-[#F8FAFC]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#102A43] truncate inline-flex items-center gap-1.5">
            {taskIsExpress(task) ? <ExpressBadge compact /> : null}
            {formatTaskName(task)}
          </p>
          <p className="text-xs text-[#0B69B7] font-medium truncate mt-0.5">
            {task.application_reference || `Task #${task.id}`}
          </p>
          <p className="text-xs text-[#627D98] truncate mt-0.5">{task.customer_name || "—"}</p>
        </div>
        <span
          className={`uppercase text-[10px] rounded-full border px-2 py-0.5 font-semibold shrink-0 ${taskStatusBadgeClass(getTaskEffectiveStatus(task))}`}
        >
          {formatTaskStatusLabel(getTaskEffectiveStatus(task))}
        </span>
      </div>
      <p className="text-[11px] text-[#627D98] mt-1.5">Deadline: {formatDateOnly(task.deadline)} · View details →</p>
    </button>
  );
}

function TaskDetailView({ task, staffName }: { task: AdminTaskItem; staffName: string }) {
  const parsedDescription = parseTaskDescription(task.description);
  const showAssignmentNote =
    Boolean(parsedDescription.assignmentNote) &&
    isTaskPending(task) &&
    !task.assigned_staff;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between gap-2 pt-1">
        <span
          className={`uppercase text-[11px] rounded-full border px-2.5 py-1 font-semibold ${taskStatusBadgeClass(getTaskEffectiveStatus(task))}`}
        >
          {formatTaskStatusLabel(getTaskEffectiveStatus(task))}
        </span>
        <span className="text-xs text-[#9C4F17] uppercase font-semibold">{task.priority} priority</span>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-[#627D98]">Task name</dt>
          <dd className="font-semibold text-[#102A43]">{formatTaskName(task)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#627D98]">Application</dt>
          <dd className="font-medium text-[#0B69B7]">{task.application_reference || `Task #${task.id}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#627D98]">Customer</dt>
          <dd className="text-[#102A43]">{task.customer_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#627D98]">Assigned to</dt>
          <dd className="text-[#102A43]">{staffName}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-[#627D98]">Created</dt>
            <dd className="text-[#102A43]">{formatDateTime(task.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#627D98]">Deadline</dt>
            <dd className="text-[#102A43]">{formatDateTime(task.deadline)}</dd>
          </div>
          {task.completed_at ? (
            <div>
              <dt className="text-xs text-[#627D98]">Completed</dt>
              <dd className="text-[#006F57]">{formatDateTime(task.completed_at)}</dd>
            </div>
          ) : null}
          {task.updated_at ? (
            <div>
              <dt className="text-xs text-[#627D98]">Last updated</dt>
              <dd className="text-[#102A43]">{formatDateTime(task.updated_at)}</dd>
            </div>
          ) : null}
        </div>
      </dl>

      {parsedDescription.summary ? (
        <div className="rounded-[10px] border border-[#D9E1EA] bg-[#F8FAFC] p-3 space-y-2">
          <p className="text-xs font-semibold text-[#627D98] uppercase">Task details</p>
          {parsedDescription.sentences.length > 1 ? (
            <ul className="text-sm text-[#334E68] leading-relaxed list-disc pl-4 space-y-1.5">
              {parsedDescription.sentences.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#334E68] leading-relaxed">{parsedDescription.summary}</p>
          )}
          {showAssignmentNote ? (
            <p className="text-xs text-[#627D98] border-t border-[#E5EAF0] pt-2">
              {parsedDescription.assignmentNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[10px] border border-[#E5EAF0] bg-[#F8FAFC] p-3">
        <p className="text-xs font-semibold text-[#627D98] uppercase">What {staffName} did</p>
        <p className="text-sm text-[#334E68] mt-1">{staffActivitySummary(task)}</p>
        {task.completion_notes?.trim() ? (
          <p className="text-sm text-[#486581] mt-2 whitespace-pre-wrap border-t border-[#E5EAF0] pt-2">
            {task.completion_notes.trim()}
          </p>
        ) : (
          <p className="text-xs text-[#627D98] mt-2 italic">No completion notes recorded yet.</p>
        )}
      </div>
    </div>
  );
}
