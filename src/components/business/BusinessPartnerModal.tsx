import { useState, type ChangeEvent } from "react";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import type { BusinessPartner } from "../../types";

export default function BusinessPartnerModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: BusinessPartner) => Promise<void> }) {
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Restaurant");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const valid =
    businessName.trim() &&
    businessCategory.trim() &&
    contactPerson.trim() &&
    contactNumber.trim() &&
    email.trim() &&
    username.trim();

  const handleSubmit = async () => {
    if (!valid) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onRegister({
        businessName: businessName.trim(),
        businessCategory: businessCategory.trim(),
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        username: username.trim(),
      });
    } catch (error: any) {
      console.error("Business Partner registration error:", error);
      setError(error?.message || "Failed to register as a business partner.");
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Register as Business Partner" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Per BR-030, registered users may register as a Business Partner to list and manage travel-related establishments.
        </p>
        <Field label="Business Name" placeholder="e.g. Lio Beach Resort" value={businessName} onChange={(e: ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)} />
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Business Category</label>
          <select
            value={businessCategory}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setBusinessCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option>Restaurant</option>
            <option>Accommodation</option>
            <option>Convenience Store</option>
            <option>Landmark</option>
            <option>Tourist Destination</option>
          </select>
        </div>
        <Field label="Contact Person" placeholder="Manager's full name" value={contactPerson} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactPerson(e.target.value)} />
        <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={contactNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactNumber(e.target.value)} />
        <Field label="Email" type="email" placeholder="business@email.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        <Field label="Username" placeholder="Business username" value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Your XploHub account already handles authentication through Supabase Auth, so no separate business-partner password is stored here.
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!valid || saving}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Registering..." : "Register Business"}
        </button>
      </div>
    </Overlay>
  );
}

