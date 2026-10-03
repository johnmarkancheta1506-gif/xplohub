import { useState, type ComponentType, type ChangeEvent } from "react";
import Field from "../common/Field";
import type { BusinessPartner } from "../../types";
import { CategoryIcon, Icon } from "../common/Icon";

export default function PartnerDashboard({
  partner,
  onUpdate,
  onDelete,
  onBack,
  Navbar,
  Modals,
}: {
  partner: BusinessPartner;
  onUpdate: (updated: BusinessPartner) => Promise<void>;
  onDelete: (business: BusinessPartner) => Promise<void>;
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
  const [deleting, setDeleting] = useState(false);

  const categories = ["Restaurant", "Accommodation", "Convenience Store", "Landmark", "Tourist Destination"];

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
    if (!businessName.trim() || !businessCategory || !contactPerson.trim() || !contactNumber.trim() || !email.trim() || !username.trim()) {
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
      await onUpdate({ ...partner, businessName: businessName.trim(), businessCategory, contactPerson: contactPerson.trim(), contactNumber: contactNumber.trim(), email: email.trim(), username: username.trim() });
      setEditing(false);
    } catch (saveError: any) {
      console.error("Business update error:", saveError);
      setError(saveError?.message || "Failed to update the business.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { resetForm(); setEditing(false); };

  const infoRows = [
    { label: "Contact person", value: partner.contactPerson, icon: "user" as const },
    { label: "Contact number", value: partner.contactNumber, icon: "phone" as const },
    { label: "Email", value: partner.email, icon: "user" as const },
    { label: "Username", value: partner.username, icon: "hash" as const },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      <main className="pt-20 max-w-5xl mx-auto px-5 lg:px-7 pb-16">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[#0b1f5c] mb-5 transition-colors">
          <Icon name="arrow-left" size={16} /> Back to My Businesses
        </button>

        <section className="rounded-3xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <div className="bg-[#0b1f5c] text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -right-12 -top-24 w-64 h-64 rounded-full bg-white/5" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon type={partner.businessCategory as any} size={29} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] font-bold text-blue-200">Business Partner</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{partner.businessName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-xs font-semibold text-blue-50">
                      <CategoryIcon type={partner.businessCategory as any} size={13} /> {partner.businessCategory}
                    </span>
                    {partner.partnerId && <span className="text-xs text-blue-100/60">ID {partner.partnerId}</span>}
                  </div>
                </div>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0b1f5c] text-sm font-extrabold hover:bg-slate-50 transition-all whitespace-nowrap">
                  <Icon name="edit" size={15} /> Edit Business
                </button>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Business profile</p>
                  <h2 className="text-xl font-extrabold text-[#0b1f5c] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Business information</h2>
                </div>
                {partner.registrationDate && <span className="text-xs font-semibold text-slate-400">Registered {new Date(partner.registrationDate).toLocaleDateString()}</span>}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {infoRows.map((row) => (
                  <div key={row.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white text-[#0b1f5c] flex items-center justify-center border border-slate-100 flex-shrink-0">
                      <Icon name={row.icon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{row.label}</p>
                      <p className="text-sm font-semibold text-slate-700 mt-1 break-words">{row.value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#0b1f5c]/5 text-[#0b1f5c] flex items-center justify-center flex-shrink-0"><Icon name="business" size={16} /></div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Business name</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{partner.businessName}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                  <Icon name="edit" size={15} /> Edit Business
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true); setError("");
                    try { await onDelete(partner); }
                    catch (deleteError: any) { console.error("Business delete error:", deleteError); setError(deleteError?.message || "Failed to delete the business."); }
                    finally { setDeleting(false); }
                  }}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Icon name="trash" size={15} /> {deleting ? "Deleting..." : "Delete Business"}
                </button>
              </div>

              {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

              <div className="mt-7 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-bold text-[#0b1f5c]">Managing multiple businesses?</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Return to My Businesses to switch between your registered establishments or add another business under the same authenticated account.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Edit listing</p>
                <h2 className="text-xl font-extrabold text-[#0b1f5c] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Update business information</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Field label="Business Name" placeholder="e.g. Lio Beach Resort" value={businessName} onChange={(e: ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)} /></div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Business Category</label>
                  <select value={businessCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => setBusinessCategory(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <Field label="Contact Person" placeholder="Manager's full name" value={contactPerson} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactPerson(e.target.value)} />
                <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={contactNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setContactNumber(e.target.value)} />
                <Field label="Email" type="email" placeholder="business@email.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
                <Field label="Username" placeholder="Business username" value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 mt-2 border-t border-slate-100">
                <button onClick={handleCancel} disabled={saving} className="flex-1 border border-gray-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#0b1f5c] text-white font-bold py-3 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Modals />
    </div>
  );
}
