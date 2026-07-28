"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, Mail, Pencil, Plus, RefreshCw, Star, Trash2, X } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  createAdminMailCredential,
  deleteAdminMailCredential,
  listAdminMailCredentials,
  setDefaultAdminMailCredential,
  updateAdminMailCredential,
  type AdminMailCredential,
} from "@/lib/admin-auth";

type FormState = {
  label: string;
  email: string;
  smtp_host: string;
  smtp_port: string;
  password: string;
  is_default: boolean;
};

const emptyForm = (): FormState => ({
  label: "Support",
  email: "support@flyoci.com",
  smtp_host: "",
  smtp_port: "",
  password: "",
  is_default: true,
});

const fieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D0D7E2] px-3 py-2.5 text-sm text-[#102A43] outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/15 disabled:bg-[#F5F7FA]";
const labelClass = "block text-xs font-semibold text-[#486581]";
const primaryBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#1A56DB] px-3 text-sm font-semibold text-white hover:bg-[#1648b8] disabled:opacity-50";
const secondaryBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#D9E1EA] bg-white px-3 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-50";

export default function AdminMailCredentialsPage() {
  const { adminUser } = useAdminAuth();
  const isAdmin = (adminUser?.role || "").toLowerCase() === "admin";

  const [rows, setRows] = useState<AdminMailCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMailCredential | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<AdminMailCredential | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const credentials = await listAdminMailCredentials();
      setRows(credentials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load mailboxes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSetAdminPageChrome({
    title: "Mail password",
    subtitle: "SMTP mailboxes (encrypted). Passwords are never shown after save.",
    actions: (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || saving}
          className={secondaryBtn}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm());
              setModalOpen(true);
            }}
            className={primaryBtn}
          >
            <Plus className="h-3.5 w-3.5" />
            Add mailbox
          </button>
        ) : null}
      </div>
    ),
  });

  const openEdit = (row: AdminMailCredential) => {
    setEditing(row);
    setForm({
      label: row.label || "",
      email: row.email || "",
      smtp_host: row.smtp_host || "",
      smtp_port: row.smtp_port != null ? String(row.smtp_port) : "",
      password: "",
      is_default: Boolean(row.is_default),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin || saving) return;
    const email = form.email.trim();
    if (!email) {
      toast.error("Mailbox email is required.");
      return;
    }
    if (!editing && !form.password.trim()) {
      toast.error("Password is required for a new mailbox.");
      return;
    }

    setSaving(true);
    try {
      const portRaw = form.smtp_port.trim();
      const smtp_port = portRaw === "" ? null : Number(portRaw);
      if (portRaw !== "" && (!Number.isFinite(smtp_port) || smtp_port! < 1 || smtp_port! > 65535)) {
        toast.error("SMTP port must be between 1 and 65535.");
        setSaving(false);
        return;
      }

      if (editing) {
        const payload: Parameters<typeof updateAdminMailCredential>[1] = {
          label: form.label.trim(),
          email,
          smtp_host: form.smtp_host.trim(),
          smtp_port,
          is_default: form.is_default,
          routing_key: "support",
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        await updateAdminMailCredential(editing.id, payload);
        toast.success("Mailbox updated.");
      } else {
        await createAdminMailCredential({
          label: form.label.trim(),
          email,
          smtp_host: form.smtp_host.trim(),
          smtp_port,
          password: form.password.trim(),
          is_default: form.is_default,
          routing_key: "support",
        });
        toast.success("Mailbox added.");
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save mailbox.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (row: AdminMailCredential) => {
    if (!isAdmin || saving || row.is_default) return;
    setSaving(true);
    try {
      await setDefaultAdminMailCredential(row.id);
      toast.success("Default outgoing mailbox updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set default.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !deleteTarget || saving) return;
    setSaving(true);
    try {
      await deleteAdminMailCredential(deleteTarget.id);
      toast.success("Mailbox deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete mailbox.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EFF6FF] text-[#1A56DB]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-[#102A43]">Support SMTP mailboxes</h2>
            <p className="mt-0.5 text-sm text-[#627D98]">
              Set the support mailbox password here. Outbound site emails use the default mailbox
              automatically — no server restart needed after you update the password.
            </p>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <p className="py-8 text-center text-sm text-[#627D98]">Loading mailboxes…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#627D98]">
              No mailboxes yet. Add the support mailbox to start.
            </p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-[10px] border border-[#E4ECF4] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#102A43]">{row.label || "Mailbox"}</p>
                    <p className="mt-0.5 break-all text-sm text-[#486581]">{row.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[11px] font-semibold text-[#486581]">
                        {row.routing_label || "Support"}
                      </span>
                      {row.is_default ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A56DB]">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </span>
                      ) : null}
                      {!row.has_password ? (
                        <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                          No password
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => openEdit(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#486581] hover:bg-[#F5F7FA]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#B42318] hover:bg-[#FEF3F2]"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {!row.is_default && isAdmin ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSetDefault(row)}
                    className="mt-3 text-sm font-semibold text-[#1A56DB] hover:underline disabled:opacity-50"
                  >
                    Set as default
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-[10px] border border-[#E4ECF4] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#627D98]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Label</th>
                <th className="px-3 py-2.5 font-semibold">Email</th>
                <th className="px-3 py-2.5 font-semibold">Routing</th>
                <th className="px-3 py-2.5 font-semibold">Default</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#627D98]">
                    Loading mailboxes…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#627D98]">
                    No mailboxes yet. Add the support mailbox to start.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-3 py-3 font-medium text-[#102A43]">{row.label || "—"}</td>
                    <td className="px-3 py-3 text-[#334E68]">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#829AB1]" />
                        <span className="break-all">{row.email}</span>
                      </span>
                      {!row.has_password ? (
                        <span className="ml-2 inline-block rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                          No password
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[#486581]">{row.routing_label || "Support"}</td>
                    <td className="px-3 py-3">
                      {row.is_default ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A56DB]">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Default
                        </span>
                      ) : isAdmin ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSetDefault(row)}
                          className="text-sm font-semibold text-[#1A56DB] hover:underline disabled:opacity-50"
                        >
                          Set default
                        </button>
                      ) : (
                        <span className="text-sm text-[#829AB1]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => openEdit(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setDeleteTarget(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-[#829AB1]">View only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[16px] border border-[#D9E1EA] bg-white shadow-xl sm:max-h-[90vh] sm:rounded-[14px]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E4ECF4] px-4 py-3.5 sm:px-5 sm:py-4">
              <h3 className="text-base font-semibold text-[#102A43] sm:text-lg">
                {editing ? "Edit mailbox" : "Add mailbox"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="rounded-[8px] p-1.5 text-[#627D98] hover:bg-[#F5F7FA]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              <label className="block">
                <span className={labelClass}>Label</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Support"
                  disabled={saving}
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Mailbox email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. support@flyoci.com"
                  disabled={saving}
                  className={fieldClass}
                />
                <span className="mt-1 block text-xs text-[#829AB1]">
                  Used for outbound site mail and shown in the site footer.
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className={labelClass}>SMTP host</span>
                  <input
                    value={form.smtp_host}
                    onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
                    placeholder="e.g. smtp.gmail.com"
                    disabled={saving}
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs text-[#829AB1]">
                    Blank uses server EMAIL_HOST.
                  </span>
                </label>

                <label className="block sm:col-span-1">
                  <span className={labelClass}>SMTP port</span>
                  <input
                    value={form.smtp_port}
                    onChange={(e) => setForm((f) => ({ ...f, smtp_port: e.target.value }))}
                    placeholder="465 or 587"
                    inputMode="numeric"
                    disabled={saving}
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs text-[#829AB1]">465 SSL · 587 STARTTLS</span>
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Leave blank to keep current" : "Mailbox password"}
                  disabled={saving}
                  className={fieldClass}
                  autoComplete="new-password"
                />
              </label>

              <label className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                  disabled={saving}
                  className="mt-0.5 h-4 w-4 rounded border-[#D9E1EA] text-[#1A56DB] focus:ring-[#1A56DB]"
                />
                <span className="text-sm font-semibold text-[#334E68]">
                  Use for outgoing mail (default sender)
                </span>
              </label>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#E4ECF4] px-4 py-3.5 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className={`${secondaryBtn} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className={`${primaryBtn} w-full sm:w-auto sm:min-w-[88px]`}
              >
                {saving ? "Saving…" : editing ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-[16px] border border-[#D9E1EA] bg-white p-4 shadow-xl sm:rounded-[14px] sm:p-5">
            <h3 className="text-lg font-semibold text-[#102A43]">Delete mailbox?</h3>
            <p className="mt-2 text-sm text-[#627D98]">
              Remove <span className="break-all font-semibold text-[#334E68]">{deleteTarget.email}</span>?
              Outbound mail will fall back to another default mailbox or server EMAIL_* settings.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
                className={`${secondaryBtn} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-[#B42318] px-3 text-sm font-semibold text-white hover:bg-[#912018] disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
