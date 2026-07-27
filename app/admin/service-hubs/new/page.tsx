"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HubCountryForm } from "@/components/admin/HubCountryForm";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  createAdminHubCountry,
  isAdminStaffRole,
  listAdminServices,
  type AdminService,
} from "@/lib/admin-auth";

export default function NewServiceHubPage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const [services, setServices] = useState<AdminService[]>([]);
  const [saving, setSaving] = useState(false);

  useSetAdminPageChrome({
    title: "Add hub country",
    subtitle: "Create a service-hub country and optional cities",
  });

  useEffect(() => {
    if (!isAdminStaffRole(adminUser?.role)) return;
    listAdminServices()
      .then((res) => setServices(res.services || []))
      .catch(() => setServices([]));
  }, [adminUser?.role]);

  if (!isAdminStaffRole(adminUser?.role)) {
    return (
      <div className="rounded-xl border border-[#E1E7EF] bg-white p-6 text-sm text-[#627D98]">
        Only admins can manage service hubs.
      </div>
    );
  }

  return (
    <HubCountryForm
      services={services}
      saving={saving}
      submitLabel="Create country"
      onSubmit={async (input) => {
        setSaving(true);
        try {
          const created = await createAdminHubCountry(input);
          toast.success("Country created");
          router.push(created?.id ? `/admin/service-hubs/${created.id}` : "/admin/service-hubs");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Create failed");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
