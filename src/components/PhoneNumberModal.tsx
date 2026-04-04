"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { validatePhone, cn } from "@/lib/chatHelpers";

interface PhoneNumberModalProps {
  currentPhone: string;
  onSave: (phone: string) => Promise<void>;
  onClose: () => void;
}

export default function PhoneNumberModal({
  currentPhone,
  onSave,
  onClose,
}: PhoneNumberModalProps) {
  const [phone, setPhone] = useState(currentPhone);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = phone.trim();
    if (trimmed && !validatePhone(trimmed)) {
      setError("Enter a valid number with country code, e.g. +91 98765 43210");
      return;
    }
    setSaving(true);
    setError("");
    await onSave(trimmed);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
            <Phone size={18} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Mobile Number
          </h2>
        </div>

        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Visible only to people you chat with. Include your country code.
        </p>

        <input
          type="tel"
          placeholder="+91 98765 43210"
          className="w-full p-4 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border dark:border-slate-700 focus:ring-2 ring-blue-500 outline-none text-sm"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />

        {error && (
          <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all text-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}