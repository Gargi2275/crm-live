"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { getAdminTokens } from "@/lib/admin-auth";

type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
};

export default function CustomerDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const endpoint = API_ENDPOINTS.ADMIN.CUSTOMER_DETAIL.replace(":id", id);

        const { access: token } = getAdminTokens();

        if (!token) {
          console.error("No admin token found");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCustomer(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[#486581]">
        Loading customer details...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-red-500">
        Customer not found
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#F5F7FA] min-h-screen">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#102A43]">
          Customer Profile
        </h1>
        <p className="text-sm text-[#486581]">
          Detailed information about the customer account
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E5EAF0] rounded-2xl shadow-sm overflow-hidden">

        {/* Top Section */}
        <div className="bg-gradient-to-r from-[#009877] to-[#00B38C] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {customer.first_name?.[0]}{customer.last_name?.[0]}
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {customer.first_name} {customer.last_name}
              </h2>
              <p className="text-sm opacity-90">{customer.role}</p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5EAF0]">
            <p className="text-xs text-[#486581] mb-1">Email</p>
            <p className="text-[#102A43] font-medium">{customer.email}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5EAF0]">
            <p className="text-xs text-[#486581] mb-1">Phone</p>
            <p className="text-[#102A43] font-medium">{customer.phone_number}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5EAF0]">
            <p className="text-xs text-[#486581] mb-1">Role</p>
            <p className="text-[#102A43] font-medium capitalize">{customer.role}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5EAF0]">
            <p className="text-xs text-[#486581] mb-1">Customer ID</p>
            <p className="text-[#102A43] font-medium">#{customer.id}</p>
          </div>

        </div>
      </div>
    </div>
  );
}