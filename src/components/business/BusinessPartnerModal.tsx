import { useState, type ChangeEvent } from "react";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import { CategoryIcon, Icon } from "../common/Icon";
import type { BusinessPartner } from "../../types";

const categories = ["Restaurant", "Accommodation", "Convenience Store", "Landmark", "Tourist Destination"];

export default function BusinessPartnerModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: BusinessPartner) => Promise<void> }) {
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Restaurant");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = businessName.trim() && businessCategory.trim() && contactPerson.trim() && contactNumber.trim() && email.trim() && username.trim();

  const handleSubmit = async () => {
    if (!valid) { setError("Please fill in all fields."); return; }
    setSaving(true); setError("");
    try {
      await onRegister({ businessName: businessName.trim(), businessCategory: businessCategory.trim(), contactPerson: contactPerson.trim(), contactNumber: contactNumber.trim(), email: email.trim(), username: username.trim() });
    } catch (error: any) {
      console.error("Business Partner registration error:", error);
      setError(error?.message || "Failed to register as a business partner.");
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <ModalHeader title="Register as Business Partner" onClose={onClose} />
        <div className="p-6 sm:p-7">
          <div className="rounded-2xl bg-[#0b1f5c] text-white p-5 mb-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/5" />
            <div className="relative flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Icon name="business" size={19} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-200">Business Partner</p>
                <h2 className="text-lg font-extrabold mt-1">List your establishment</h2>
                <p className="text-xs text-blue-100/75 mt-1 leading-relaxed">Register one business at a time. You can manage multiple businesses from My Businesses.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Business Name" placeholder="e.g. Lio Beach Resort" value={businessName} onChange={(e: ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)} />
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Business Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => {
                  const active = businessCategory === category;
                  return (
                    <button key={category} type="button" onClick={() => setBusinessCategory(category)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all ${active ? "border-[#0b1f5c] bg-[#0b1f5c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#0b1f5c]/30"}`}>
                      <CategoryIcon type={category as any} size={15} />
                      <span className="text-xs font-bold leading-tight">{category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Contact Person" placeholder="Manager's full name" value={contactPerson} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactPerson(e.target.value)} />
              <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={contactNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactNumber(e.target.value)} />
              <Field label="Email" type="email" placeholder="business@email.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
              <Field label="Username" placeholder="Business username" value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex gap-2.5">
            <Icon name="user" size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-500 leading-relaxed">Your existing TravelMate account handles authentication through Supabase Auth. No separate Business Partner password is stored here.</p>
          </div>
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
          <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
            <button onClick={onClose} disabled={saving} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 text-sm disabled:opacity-50">Cancel</button>
            <button onClick={handleSubmit} disabled={!valid || saving} className="flex-1 bg-[#0b1f5c] text-white font-bold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">{saving ? "Registering..." : "Register Business"}</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
