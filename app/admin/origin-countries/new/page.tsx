"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  OriginCountryForm,
  emptyOriginCountryForm,
  toOriginCountryInput,
  type OriginCountryFormState,
} from "@/components/admin/OriginCountryForm";
import {
  createAdminOriginCountry,
  isAdminStaffRole,
  listAdminServices,
  type AdminService,
} from "@/lib/admin-auth";

export default function NewOriginCountryPage() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const isAdmin = isAdminStaffRole(adminUser?.role);
  const [form, setForm] = useState<OriginCountryFormState>(emptyOriginCountryForm);
  const [services, setServices] = useState<AdminService[]>([]);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useSetAdminPageChrome({
    title: "Add origin country",
    subtitle: "Create a nationality card and landing page",
  });

  useEffect(() => {
    if (!isAdmin) return;
    void listAdminServices({ active: "true", page_size: 100 })
      .then((payload) => setServices(payload.services || []))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load services."));
  }, [isAdmin]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const created = await createAdminOriginCountry(toOriginCountryInput(form));
      toast.success("Country created.");
      router.push(created?.id ? `/admin/origin-countries/${created.id}` : "/admin/origin-countries");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-[12px] border border-[#E1E7EF] bg-white p-6 text-sm text-[#486581]">
        Admin access required.
      </div>
    );
  }

  return (
    <OriginCountryForm
      mode="create"
      form={form}
      setForm={setForm}
      services={services}
      saving={saving}
      onSubmit={() => void handleSubmit()}
      slugTouched={slugTouched}
      setSlugTouched={setSlugTouched}
    />
  );
}
