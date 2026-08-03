"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HubCountryForm } from "@/components/admin/HubCountryForm";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import {
  getAdminHubCountry,
  listAdminServices,
  updateAdminHubCountry,
  type AdminHubCountry,
  type AdminService,
} from "@/lib/admin-auth";

export default function EditServiceHubPage() {
  const router = useRouter();
  const params = useParams();
  const countryId = Number(params?.id);
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/service-hubs");
  const [country, setCountry] = useState<AdminHubCountry | null>(null);
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useSetAdminPageChrome({
    title: country ? `Edit ${country.name}` : "Edit hub country",
    subtitle: "Cities drive footer links; offerings drive /service page pricing",
  });

  useEffect(() => {
    if (!canAccess) return;
    if (!Number.isFinite(countryId)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [row, svc] = await Promise.all([getAdminHubCountry(countryId), listAdminServices()]);
        if (cancelled) return;
        if (!row) {
          toast.error("Country not found");
          router.replace("/admin/service-hubs");
          return;
        }
        setCountry(row);
        setServices(svc.services || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load");
        router.replace("/admin/service-hubs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAccess, countryId, router]);

  if (!accessReady) {
    return (
      <div className="rounded-xl border border-[#E1E7EF] bg-white p-6 text-sm text-[#627D98]">
        Checking access…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-xl border border-[#E1E7EF] bg-white p-6 text-sm text-[#627D98]">
        Access restricted. Ask an admin to grant the Service hubs module for your role.
      </div>
    );
  }

  if (loading || !country) {
    return <div className="text-sm text-[#829AB1]">Loading…</div>;
  }

  return (
    <HubCountryForm
      initial={country}
      services={services}
      saving={saving}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        setSaving(true);
        try {
          const updated = await updateAdminHubCountry(country.id, input);
          toast.success("Saved");
          if (updated) setCountry(updated);
          router.push("/admin/service-hubs");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Save failed");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
