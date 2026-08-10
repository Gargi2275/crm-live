"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { GitBranch, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  createAdminRoutingRule,
  deleteAdminRoutingRule,
  listAdminRoutingRules,
  updateAdminRoutingRule,
  type TaskRoutingMeta,
  type TaskRoutingRule,
  type TaskRoutingRuleInput,
} from "@/lib/admin-auth";

const fieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

type FormState = {
  name: string;
  staff_id: string;
  service_id: string;
  category_id: string;
  express_mode: string;
  task_type: string;
  case_type: string;
  auto_assign: boolean;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  staff_id: "",
  service_id: "",
  category_id: "",
  express_mode: "any",
  task_type: "",
  case_type: "",
  auto_assign: true,
  is_active: true,
});

function ruleToForm(rule: TaskRoutingRule): FormState {
  return {
    name: rule.name || "",
    staff_id: String(rule.staff_id || ""),
    service_id: rule.service_id ? String(rule.service_id) : "",
    category_id: rule.category_id ? String(rule.category_id) : "",
    express_mode: rule.express_mode || "any",
    task_type: rule.task_type || "",
    case_type: rule.case_type || "",
    auto_assign: Boolean(rule.auto_assign),
    is_active: Boolean(rule.is_active),
  };
}

function formToPayload(form: FormState): TaskRoutingRuleInput {
  return {
    name: form.name.trim(),
    staff_id: Number(form.staff_id),
    service_id: form.service_id ? Number(form.service_id) : null,
    category_id: form.category_id ? Number(form.category_id) : null,
    express_mode: form.express_mode || "any",
    task_type: form.task_type || "",
    case_type: form.case_type || "",
    pricing_country_slug: "",
    auto_assign: form.auto_assign,
    is_active: form.is_active,
    priority: 100,
  };
}

function matchSummary(rule: TaskRoutingRule) {
  const parts: string[] = [];
  if (rule.service_name) parts.push(rule.service_name);
  if (rule.category_name) parts.push(rule.category_name);
  if (rule.express_mode === "express_only") parts.push("Express");
  if (rule.express_mode === "standard_only") parts.push("Standard");
  if (rule.task_type) parts.push(rule.task_type.replace(/_/g, " "));
  if (rule.case_type) parts.push(rule.case_type);
  return parts.length ? parts.join(" · ") : "Any match";
}

export default function AdminRoutingPage() {
  const { adminUser } = useAdminAuth();
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/routing");
  const canView = canAccess;

  const [rules, setRules] = useState<TaskRoutingRule[]>([]);
  const [meta, setMeta] = useState<TaskRoutingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const payload = await listAdminRoutingRules();
      setRules(payload.rules);
      setMeta(payload.meta);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load routing rules.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (adminUser && canView) void loadData();
  }, [adminUser, canView, loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (rule: TaskRoutingRule) => {
    setEditingId(rule.id);
    setForm(ruleToForm(rule));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const onSave = async () => {
    if (!form.staff_id) {
      toast.error("Select a staff member.");
      return;
    }
    setSaving(true);
    try {
      const body = formToPayload(form);
      if (editingId) {
        const result = await updateAdminRoutingRule(editingId, body);
        const n = Number(result?.backfill?.assigned_count || 0);
        toast.success(n > 0 ? `Rule updated · assigned ${n} open task(s).` : "Rule updated.");
      } else {
        const result = await createAdminRoutingRule(body);
        const n = Number(result?.backfill?.assigned_count || 0);
        toast.success(n > 0 ? `Rule created · assigned ${n} open task(s).` : "Rule created.");
      }
      closeForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save rule.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteAdminRoutingRule(deleteId);
      toast.success("Rule deleted.");
      setDeleteId(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete rule.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (rule: TaskRoutingRule, key: "auto_assign" | "is_active") => {
    try {
      await updateAdminRoutingRule(rule.id, { [key]: !rule[key] });
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const activeCount = useMemo(() => rules.filter((r) => r.is_active && r.auto_assign).length, [rules]);

  useSetAdminPageChrome(
    canView
      ? {
          title: "Case routing",
          subtitle: "Pin service, express, or stage to staff",
          icon: GitBranch,
          syncKey: `${loading}|${rules.length}|${formOpen}|${editingId || 0}`,
          meta: loading ? "Loading…" : `${rules.length} rules · ${activeCount} auto-assign`,
          actions: (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#006F57]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add rule
              </button>
            </div>
          ),
        }
      : null,
  );

  if (!adminUser) return null;

  if (!accessReady) {
    return (
      <div className="mx-auto mt-16 max-w-lg text-center">
        <p className="text-sm text-[#627D98]">Checking access…</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto mt-16 max-w-lg space-y-3 text-center">
        <p className="font-heading font-semibold text-[#102A43]">Access restricted</p>
        <p className="text-sm text-[#627D98]">Ask an admin to grant the Case routing module.</p>
        <Link href="/admin" className="inline-flex text-sm font-semibold text-[#009877] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 font-body">
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 text-sm text-[#486581]">
        Pick staff, choose what to match (service, express, stage, or case type), then turn on{" "}
        <span className="font-semibold text-[#102A43]">Auto-assign</span>. Matching cases go to that
        person. If they are on full-day or sick leave today, routing skips them until they are back.
      </div>

      {formOpen ? (
        <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold text-[#102A43]">
              {editingId ? "Edit routing rule" : "New routing rule"}
            </h2>
            <button type="button" onClick={closeForm} className="rounded-md p-1 text-[#627D98] hover:bg-[#F5F7FA]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-semibold text-[#486581]">Label (optional)</span>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Express → Juhi"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Staff *</span>
              <select
                className={fieldClass}
                value={form.staff_id}
                onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}
              >
                <option value="">Select staff</option>
                {(meta?.staff || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role_label || s.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Service</span>
              <select
                className={fieldClass}
                value={form.service_id}
                onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
              >
                <option value="">Any service</option>
                {(meta?.services || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Category</span>
              <select
                className={fieldClass}
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">Any category</option>
                {(meta?.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Express</span>
              <select
                className={fieldClass}
                value={form.express_mode}
                onChange={(e) => setForm((f) => ({ ...f, express_mode: e.target.value }))}
              >
                {(meta?.express_modes || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Stage / field</span>
              <select
                className={fieldClass}
                value={form.task_type}
                onChange={(e) => setForm((f) => ({ ...f, task_type: e.target.value }))}
              >
                {(meta?.task_types || []).map((t) => (
                  <option key={t.value || "any"} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold text-[#486581]">Case type</span>
              <select
                className={fieldClass}
                value={form.case_type}
                onChange={(e) => setForm((f) => ({ ...f, case_type: e.target.value }))}
              >
                {(meta?.case_types || []).map((t) => (
                  <option key={t.value || "any"} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-[#102A43]">
              <input
                type="checkbox"
                checked={form.auto_assign}
                onChange={(e) => setForm((f) => ({ ...f, auto_assign: e.target.checked }))}
                className="h-4 w-4 rounded border-[#D9E1EA] text-[#009877]"
              />
              Auto-assign matching cases to this staff
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[#102A43]">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-[#D9E1EA] text-[#009877]"
              />
              Active
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-[8px] border border-[#D9E1EA] px-3 py-1.5 text-xs font-semibold text-[#486581]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="rounded-[8px] bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create rule"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[12px] border border-[#D9E1EA] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-3 py-3 font-medium">Matches</th>
                <th className="px-3 py-3 font-medium">Staff</th>
                <th className="px-3 py-3 font-medium text-center">Auto</th>
                <th className="px-3 py-3 font-medium text-center">Active</th>
                <th className="px-3 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading && rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#627D98]">
                    Loading rules…
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#627D98]">
                    No routing rules yet. Click Add rule to pin a service or express plan to staff.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#102A43]">
                      {rule.name || `Rule #${rule.id}`}
                    </td>
                    <td className="px-3 py-3 text-[#486581]">{matchSummary(rule)}</td>
                    <td className="px-3 py-3 text-[#102A43]">
                      {rule.staff_name}
                      <span className="ml-1 text-[11px] text-[#627D98]">{rule.staff_role}</span>
                      {rule.staff_on_leave_today ? (
                        <span className="ml-2 inline-flex rounded-full border border-[#F8B4B4] bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#9B1C1C]">
                          On leave today
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleFlag(rule, "auto_assign")}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          rule.auto_assign
                            ? "border-[#B7EBD8] bg-[#E6F7F2] text-[#006F57]"
                            : "border-[#E5EAF0] bg-[#F8FAFC] text-[#627D98]"
                        }`}
                      >
                        {rule.auto_assign ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleFlag(rule, "is_active")}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          rule.is_active
                            ? "border-[#B7EBD8] bg-[#E6F7F2] text-[#006F57]"
                            : "border-[#F8B4B4] bg-[#FEE2E2] text-[#9B1C1C]"
                        }`}
                      >
                        {rule.is_active ? "Active" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(rule)}
                          className="rounded-md p-1.5 text-[#486581] hover:bg-[#F0F4F8]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(rule.id)}
                          className="rounded-md p-1.5 text-[#B42318] hover:bg-[#FEE2E2]"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete routing rule?"
        description="Matching cases will fall back to least-loaded auto-assign."
        confirmLabel="Delete"
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleteId(null)}
        loading={saving}
      />
    </div>
  );
}
