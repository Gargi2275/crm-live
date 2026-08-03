"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Layers, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  deleteAdminService,
  listAdminServices,
  updateAdminService,
  type AdminService,
  type AdminServiceMeta,
} from "@/lib/admin-auth";
import { clearDocumentRequirementsCache } from "@/lib/document-requirements";
import { clearPublicPricingCache } from "@/lib/public-pricing";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-2 text-sm text-[#102A43]";

function money(value: string | number | undefined | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "£0";
  return `£${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

export default function AdminServicesPanel() {
  const router = useRouter();
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/services");

  const [services, setServices] = useState<AdminService[]>([]);
  const [meta, setMeta] = useState<AdminServiceMeta>({
    service_types: [],
    categories: [],
    code_keyed_types: [],
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inlineSavingId, setInlineSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const payload = await listAdminServices({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        active: activeFilter,
        page,
        page_size: pageSize,
      });
      setServices(payload.services || []);
      setMeta(payload.meta || { service_types: [], categories: [], code_keyed_types: [] });
      setTotal(payload.pagination?.total || 0);
      setTotalPages(payload.pagination?.total_pages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load services.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, canAccess, categoryFilter, page, pageSize, search]);

  useEffect(() => {
    if (!accessReady || !canAccess) return;
    void load();
  }, [accessReady, canAccess, load]);

  const categoryLabel = useMemo(() => {
    const map = new Map(meta.categories.map((row) => [row.id, row.label]));
    return (id: string) => map.get(id) || id;
  }, [meta.categories]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setInlineSavingId(deleteTarget.id);
    try {
      await deleteAdminService(deleteTarget.id);
      clearDocumentRequirementsCache();
      clearPublicPricingCache();
      setServices((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Service deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service.");
    } finally {
      setDeleting(false);
      setInlineSavingId(null);
    }
  };

  const patchInline = async (service: AdminService, patch: Record<string, unknown>) => {
    setInlineSavingId(service.id);
    try {
      const updated = await updateAdminService(service.id, patch);
      setServices((prev) => prev.map((row) => (row.id === service.id ? { ...row, ...updated } : row)));
      clearDocumentRequirementsCache();
      clearPublicPricingCache();
      toast.success("Saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update.");
      await load();
    } finally {
      setInlineSavingId(null);
    }
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (categoryFilter ? 1 : 0) + (activeFilter !== "all" ? 1 : 0);

  const clearFilters = useCallback(() => {
    setPage(1);
    setSearch("");
    setCategoryFilter("");
    setActiveFilter("all");
  }, []);

  useSetAdminPageChrome(
    canAccess
      ? {
          title: "Services catalog",
          subtitle: "Name, category, fees & status",
          icon: Layers,
          search: {
            value: search,
            onChange: (value) => {
              setPage(1);
              setSearch(value);
            },
            placeholder: "Search name…",
          },
          activeFilterCount,
          onClearFilters: clearFilters,
          meta: `${total} service${total === 1 ? "" : "s"} · page ${page}/${totalPages}`,
          syncKey: `${search}|${categoryFilter}|${activeFilter}|${page}|${total}|${loading}|${meta.categories.length}|${canAccess ? 1 : 0}`,
          actions: (
            <>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/services/new")}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
              >
                <Plus className="h-3.5 w-3.5" />
                New service
              </button>
            </>
          ),
          filtersContent: (
            <>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setPage(1);
                    setCategoryFilter(e.target.value);
                  }}
                  className={filterFieldClass}
                >
                  <option value="">All categories</option>
                  {meta.categories.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Status</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setPage(1);
                    setActiveFilter(e.target.value as "all" | "true" | "false");
                  }}
                  className={filterFieldClass}
                >
                  <option value="all">Active + inactive</option>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                </select>
              </label>
            </>
          ),
        }
      : { title: "Services", icon: Layers },
  );

  if (!accessReady) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <p className="text-sm text-[#627D98]">Checking access…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">Services</h1>
        <p className="mt-2 text-sm text-[#627D98]">
          Access restricted. Ask an admin to grant the Services or Categories module for your role.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 font-body">
      <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Service fee</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Active</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                    Loading services…
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                    No services match these filters.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-[#F8FCFF]">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[#102A43]">{service.service_name}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#334E68]">{categoryLabel(service.category)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={Number(service.base_fee ?? service.total_fee)}
                        key={`${service.id}-${service.base_fee}-${service.total_fee}`}
                        disabled={inlineSavingId === service.id}
                        onBlur={(e) => {
                          const next = e.target.value;
                          if (String(service.base_fee ?? service.total_fee) === next) return;
                          void patchInline(service, {
                            base_fee: next,
                            total_fee: next,
                            government_fee: "0",
                          });
                        }}
                        className="w-24 rounded-[6px] border border-[#D9E1EA] px-2 py-1 text-xs text-[#102A43]"
                        aria-label={`Service fee for ${service.service_name}`}
                      />
                      <span className="ml-2 text-[11px] text-[#8A9BB0]">
                        {money(service.base_fee ?? service.total_fee)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={inlineSavingId === service.id}
                        onClick={() => void patchInline(service, { is_active: !service.is_active })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          service.is_active
                            ? "bg-[#009877]/12 text-[#006F57]"
                            : "bg-[#F5F7FA] text-[#627D98]"
                        }`}
                      >
                        {service.is_active ? "Active" : "Off"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={inlineSavingId === service.id}
                          onClick={() => router.push(`/admin/services/${service.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D9E1EA] text-[#0B69B7] hover:bg-[#EFF7FF] disabled:opacity-50"
                          title="Edit"
                          aria-label={`Edit ${service.service_name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={inlineSavingId === service.id}
                          onClick={() => setDeleteTarget(service)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#F2C7C3] text-[#B42318] hover:bg-[#FFF1F0] disabled:opacity-50"
                          title="Delete"
                          aria-label={`Delete ${service.service_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#E5EAF0] px-3 py-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-[8px] border border-[#D9E1EA] px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-[8px] border border-[#D9E1EA] px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service?"
        description={
          deleteTarget
            ? `Permanently remove “${deleteTarget.service_name}” from the catalog. Existing applications stay in the pipeline but will no longer link to this catalog row.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
