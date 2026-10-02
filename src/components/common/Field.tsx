import type { ChangeEvent } from "react";

export default function Field({ label, type = "text", placeholder, value, onChange }: { label: string; type?: string; placeholder: string; value?: string; onChange?: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" />
    </div>
  );
}

