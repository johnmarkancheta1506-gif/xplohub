import { useState, type ComponentType, type ChangeEvent } from "react";
import Field from "../common/Field";
import type { BusinessPartner } from "../../types";

export default function PartnerDashboard({
  partner,
  onUpdate,
  onBack,
  Navbar,
  Modals,
}: {
  partner: BusinessPartner;
  onUpdate: (updated: BusinessPartner) => Promise<void>;
  onBack: () => void;
  Navbar: ComponentType;
  Modals: ComponentType;
}) {
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(partner.businessName);
  const [businessCategory, setBusinessCategory] = useState(partner.businessCategory);
  const [contactPerson, setContactPerson] = useState(partner.contactPerson);
  const [contactNumber, setContactNumber] = useState(partner.contactNumber);
  const [email, setEmail] = useState(partner.email);
  const [username, setUsername] = useState(partner.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Restaurant",
    "Accommodation",
    "Convenience Store",
    "Landmark",
    "Tourist Destination",
  ];

  const resetForm = () => {
    setBusinessName(partner.businessName);
    setBusinessCategory(partner.businessCategory);
    setContactPerson(partner.contactPerson);
    setContactNumber(partner.contactNumber);
    setEmail(partner.email);
    setUsername(partner.username);
    setError("");
  };

  const handleSave = async () => {
    if (
      !businessName.trim() ||
      !businessCategory ||
      !contactPerson.trim() ||
      !contactNumber.trim() ||
      !email.trim() ||
      !username.trim()
    ) {
      setError("Please fill in all business information.");
      return;
    }

    if (!partner.partnerId) {
      setError("This business does not have a valid partner ID.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedPartner: BusinessPartner = {
        ...partner,
        businessName: businessName.trim(),
        businessCategory,
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        username: username.trim(),
      };

      await onUpdate(updatedPartner);
      setEditing(false);
    } catch (saveError: any) {
      console.error("Business update error:", saveError);
      setError(saveError?.message || "Failed to update the business.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setEditing(false);
  };

  const businessIcon =
    partner.businessCategory === "Restaurant"
      ? "🍽️"
      : partner.businessCategory === "Accommodation"
      ? "🏨"
      : partner.businessCategory === "Convenience Store"
      ? "🏪"
      : partner.businessCategory === "Landmark"
      ? "🏛️"
      : "🌿";

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      <div className="pt-20 max-w-3xl mx-auto px-5 pb-16">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#0b1f5c] mb-5 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to My Businesses
        </button>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[#0b1f5c] flex items-center justify-center text-2xl flex-shrink-0">
                  {businessIcon}
                </div>
                <div className="min-w-0">
                  <h1
                    className="text-2xl font-extrabold text-[#0b1f5c] truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {partner.businessName}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">{partner.businessCategory}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Business Partner ID: {partner.partnerId}
                  </p>
                </div>
              </div>

              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#0b1f5c] text-white text-sm font-semibold hover:bg-[#162d7a] transition-all whitespace-nowrap"
                >
                  ✏️ Edit Business
                </button>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="p-6 space-y-3">
              <h2 className="text-sm font-extrabold text-[#0b1f5c]">Business Information</h2>

              {[
                ["Business Name", partner.businessName],
                ["Business Category", partner.businessCategory],
                ["Contact Person", partner.contactPerson],
                ["Contact Number", partner.contactNumber],
                ["Email", partner.email],
                ["Username", partner.username],
                [
                  "Registration Date",
                  partner.registrationDate
                    ? new Date(partner.registrationDate).toLocaleDateString()
                    : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-6 py-3 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 text-right break-words">
                    {value}
                  </span>
                </div>
              ))}

              <div className="pt-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-500">Current business role</p>
                  <p className="text-sm text-slate-600 mt-1">
                    This Business Partner record represents one business. To manage another business,
                    return to My Businesses and choose “+ Add Another Business”.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-extrabold text-[#0b1f5c]">Edit Business</h2>

              <Field
                label="Business Name"
                placeholder="e.g. Lio Beach Resort"
                value={businessName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)}
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Business Category
                </label>
                <select
                  value={businessCategory}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setBusinessCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <Field
                label="Contact Person"
                placeholder="Manager's full name"
                value={contactPerson}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setContactPerson(e.target.value)}
              />

              <Field
                label="Contact Number"
                placeholder="+63 9XX XXX XXXX"
                value={contactNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setContactNumber(e.target.value)}
              />

              <Field
                label="Email"
                type="email"
                placeholder="business@email.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />

              <Field
                label="Username"
                placeholder="Business username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#0b1f5c] text-white font-semibold py-2.5 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modals />
    </div>
  );
}

