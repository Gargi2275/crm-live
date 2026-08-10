"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryDialOption } from "@/lib/country-dial-codes";

type SearchableDialCodeProps = {
  value?: string;
  options: readonly CountryDialOption[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

export function SearchableDialCode({
  value,
  options,
  loading,
  disabled,
  className = "",
  onChange,
}: SearchableDialCodeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find((option) => option.dialCode === value && option.country === "United Kingdom") ||
      options.find((option) => option.dialCode === value) ||
      null
    );
  }, [options, value]);

  useEffect(() => {
    setQuery("");
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return options;
    return options.filter((option) => {
      const haystack = `${option.flag} ${option.dialCode} ${option.country} ${option.cca2}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [options, query]);

  const commitSelection = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setQuery("");
  };

  const showLoading = Boolean(loading && options.length === 0);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current);
        }}
      >
        <span className="truncate">
          {selectedOption
            ? `${selectedOption.flag} ${selectedOption.dialCode}`
            : value || (showLoading ? "…" : "Code")}
        </span>
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 z-30 mt-1 w-[260px] overflow-hidden rounded-[14px] border border-[#d9e4f7] bg-white shadow-[0_18px_40px_rgba(22,62,120,0.14)]">
          <input
            type="text"
            value={query}
            placeholder="Search country or code"
            autoComplete="off"
            className="w-full border-0 border-b border-[#edf2fb] px-3 py-2 text-[13px] outline-none"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-60 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {showLoading ? (
              <div className="px-3 py-2 text-[13px] text-[#7a8bab]">Loading…</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-[#7a8bab]">No matches found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={`${option.cca2}-${option.dialCode}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#102A43] hover:bg-[#EFF6FF]"
                  onClick={() => commitSelection(option.dialCode)}
                >
                  <span className="shrink-0">{option.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{option.country}</span>
                  <span className="shrink-0 font-semibold text-[#1A56DB]">{option.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
