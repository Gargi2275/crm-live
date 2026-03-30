"use client";

import { useEffect, useState } from "react";
import { FadeInUp } from "@/components/FadeInUp";

interface Cookie {
  name: string;
  category: string;
  purpose: string;
  duration: string;
  type: string;
  required: boolean;
  description: string;
}

interface CookiePolicy {
  version: string;
  last_updated: string;
  cookies: Cookie[];
  categories: Record<string, { title: string; description: string; required: boolean }>;
  user_rights: string[];
  contact: string;
}

export default function CookiesPage() {
  const [policy, setPolicy] = useState<CookiePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/cookies/policy/`
        );
        if (!response.ok) throw new Error("Failed to fetch cookie policy");
        const data = await response.json();
        setPolicy(data.data || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading policy");
        // Set fallback data
        setPolicy({
          version: "1.0",
          last_updated: "2026-03-30",
          cookies: [],
          categories: {},
          user_rights: [],
          contact: "privacy@flyoci.com",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (isLoading) {
    return (
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-300 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-2">
            Cookies Policy
          </h1>
          <p className="text-textMuted text-sm mb-8">
            Last updated: {policy?.last_updated} (v{policy?.version})
          </p>
        </FadeInUp>

        <div className="space-y-8 text-textMuted font-body leading-relaxed">
          {/* Introduction */}
          <FadeInUp>
            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">What are Cookies?</h2>
              <p>
                Cookies are small text files stored on your device when you visit our website. They help us
                provide you with better service, maintain your login session, and understand how you use our
                platform. We use cookies in accordance with applicable privacy laws.
              </p>
            </section>
          </FadeInUp>

          {/* Cookie Categories */}
          {policy?.categories && Object.entries(policy.categories).length > 0 && (
            <FadeInUp>
              <section>
                <h2 className="text-2xl font-bold text-primary mb-4">Cookie Categories</h2>
                <div className="space-y-4">
                  {Object.entries(policy.categories).map(([key, category]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-primary">{category.title}</h3>
                        {category.required && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{category.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </FadeInUp>
          )}

          {/* Individual Cookies */}
          {policy?.cookies && policy.cookies.length > 0 && (
            <FadeInUp>
              <section>
                <h2 className="text-2xl font-bold text-primary mb-4">Our Cookies</h2>
                <div className="space-y-4">
                  {policy.cookies.map((cookie, idx) => (
                    <div key={idx} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-primary">{cookie.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Type:</span> {cookie.type} •{" "}
                            <span className="font-medium">Category:</span> {cookie.category}
                          </p>
                        </div>
                        {cookie.required && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium shrink-0">
                            Essential
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-3">{cookie.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Purpose:</span> {cookie.purpose}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {cookie.duration}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </FadeInUp>
          )}

          {/* User Rights */}
          {policy?.user_rights && policy.user_rights.length > 0 && (
            <FadeInUp>
              <section>
                <h2 className="text-2xl font-bold text-primary mb-4">Your Rights</h2>
                <ul className="space-y-2 list-disc list-inside">
                  {policy.user_rights.map((right, idx) => (
                    <li key={idx}>{right}</li>
                  ))}
                </ul>
              </section>
            </FadeInUp>
          )}

          {/* Contact */}
          <FadeInUp>
            <section className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-primary mb-2">Questions?</h2>
              <p>
                If you have any questions about our cookie policy or how we use cookies, please contact us at:{" "}
                <a href={`mailto:${policy?.contact}`} className="text-primary hover:underline font-medium">
                  {policy?.contact}
                </a>
              </p>
            </section>
          </FadeInUp>

          {/* Divider */}
          <div className="border-t border-gray-300 pt-8">
            <FadeInUp>
              <p className="text-xs text-gray-500">
                This cookie policy is subject to change. We will update this page whenever our cookie practices
                change. Last updated: {policy?.last_updated}
              </p>
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
}
