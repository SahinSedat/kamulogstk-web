"use client";
import React from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

/** Strips +90 prefix if present, returns raw 10-digit part */
export function stripPhonePrefix(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("90") && cleaned.length > 10) return cleaned.slice(2);
  if (cleaned.startsWith("0") && cleaned.length === 11) return cleaned.slice(1);
  return cleaned.slice(0, 10);
}

/** Prepends +90 to raw digits for API submission */
export function formatPhoneForAPI(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  return digits ? `+90${digits}` : "";
}

export default function PhoneInput({ value, onChange, required, className }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(digits);
  };

  return (
    <div className="flex">
      <span className="inline-flex items-center px-3 py-2.5 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium select-none">+90</span>
      <input
        type="tel"
        inputMode="numeric"
        maxLength={10}
        required={required}
        value={value}
        onChange={handleChange}
        placeholder="5XX XXX XX XX"
        className={className || "w-full px-4 py-2.5 rounded-r-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"}
      />
    </div>
  );
}
