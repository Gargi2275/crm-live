"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import {
  OriginCountryForm,
  emptyOriginCountryForm,
  formFromCountry,
  toOriginCountryInput,
  type OriginCountryFormState,
} from "@/components/admin/OriginCountryForm";
import {
  getAdminOriginCountry,
  listAdminServices,
  updateAdminOriginCountry,
  type AdminService,
} from "@/lib/admin-auth";

export default function EditOriginCountryPage() {
  const params = useParams();
  const router = useRouter();
  const countryId = Number(params?.id);
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/origin-countries");
  const [form, setForm] = useState<OriginCountryFormState>(emptyOriginCountryForm);
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(true);

  useSetAdminPageChrome({
    title: "Edit origin country",
    subtitle: "Update page copy, image, and e-Visa options",
  });

  useEffect(() => {
    if (!canAccess || !Number.isFinite(countryId) || countryId <= 0) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      getAdminOriginCountry(countryId),
      listAdminServices({ active: "true", page_size: 100 }),
    ])
      .then(([country, servicePayload]) => {
        if (cancelled) return;
        if (!country) {
          toast.error("Country not found.");
          router.replace("/admin/origin-countries");
          return;
        }
        setForm(formFromCountry(country));
        setServices(servicePayload.services || []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load.");
        router.replace("/admin/origin-countries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccess, countryId, router]);

  const handleSubmit = async () => {
    if (!Number.isFinite(countryId) || countryId <= 0) return;
    setSaving(true);
    try {
      await updateAdminOriginCountry(countryId, toOriginCountryInput(form));
      toast.success("Country updated.");
      router.push("/admin/origin-countries");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (!accessReady) {
    return (
      <div className="rounded-[12px] border border-[#E1E7EF] bg-white p-6 text-sm text-[#486581]">
        Checking access…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-[12px] border border-[#E1E7EF] bg-white p-6 text-sm text-[#486581]">
        Access restricted. Ask an admin to grant the Origin countries module for your role.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-[#829AB1]">Loading country…</div>;
  }

  return (
    <OriginCountryForm
      mode="edit"
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
