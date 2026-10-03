import type { ComponentType } from "react";
import type { BusinessPartner } from "../../types";
import { CategoryIcon, Icon } from "../common/Icon";

const categories = ["Restaurant", "Accommodation", "Convenience Store", "Landmark", "Tourist Destination"] as const;

export default function MyBusinessesScreen({
  businesses,
  onSelectBusiness,
  onAddBusiness,
  onBack,
  Modals,
}: {
  businesses: BusinessPartner[];
  onSelectBusiness: (business: BusinessPartner) => void;
  onAddBusiness: () => void;
  onBack: () => void;
  Modals: ComponentType;
}) {
  const categoryCounts = categories.map((category) => ({
    category,
    count: businesses.filter((business) => business.businessCategory === category).length,
  }));

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur border-b border-slate-100 z-50">
        <div className="h-full max-w-6xl mx-auto px-5 lg:px-7 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b1f5c] text-white">
              <Icon name="globe" size={17} />
            </div>
            <span className="font-extrabold text-[#0b1f5c] text-base" style={{ fontFamily: "Outfit, sans-serif" }}>TravelMate</span>
          </div>
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0b1f5c] transition-colors">
            <Icon name="arrow-left" size={15} /> Back to Explore
          </button>
        </div>
      </header>

      <main className="pt-24 max-w-6xl mx-auto px-5 lg:px-7 pb-16">
        <section className="rounded-3xl bg-[#0b1f5c] text-white p-6 sm:p-8 mb-7 overflow-hidden relative">
          <div className="absolute -right-16 -top-20 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute right-20 -bottom-28 w-64 h-64 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Business Partner</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>My Businesses</h1>
              <p className="text-sm sm:text-base text-blue-100/80 mt-2 max-w-2xl">Manage each registered establishment from one place. Every business remains its own Business Partner record.</p>
            </div>
            <button onClick={onAddBusiness} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0b1f5c] text-sm font-extrabold hover:bg-slate-50 transition-all whitespace-nowrap">
              <span className="text-lg leading-none">+</span> Add Business
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-2xl font-extrabold text-[#0b1f5c] mt-1">{businesses.length}</p>
            <p className="text-xs text-slate-400 mt-1">Registered businesses</p>
          </div>
          {categoryCounts.map(({ category, count }) => (
            <div key={category} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-50 text-[#0b1f5c] flex items-center justify-center">
                  <CategoryIcon type={category} size={15} />
                </div>
                <span className="text-lg font-extrabold text-[#0b1f5c]">{count}</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-3 leading-tight">{category}</p>
            </div>
          ))}
        </section>

        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Your listings</p>
            <h2 className="text-xl font-extrabold text-[#0b1f5c] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Registered businesses</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">{businesses.length} {businesses.length === 1 ? "business" : "businesses"}</span>
        </div>

        {businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map((business) => (
              <button
                key={business.partnerId ?? `${business.businessName}-${business.email}`}
                onClick={() => onSelectBusiness(business)}
                className="group w-full text-left bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#0b1f5c]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-[#0b1f5c] text-white flex items-center justify-center">
                      <CategoryIcon type={business.businessCategory as any} size={21} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-[#0b1f5c] text-base truncate">{business.businessName}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{business.businessCategory}</p>
                    </div>
                  </div>
                  <span className="h-9 w-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-[#0b1f5c] group-hover:text-white transition-colors">
                    <Icon name="arrow-right" size={15} />
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact person</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{business.contactPerson}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{business.contactNumber}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">{business.email}</span>
                  {business.registrationDate && <span className="whitespace-nowrap ml-3">Registered {new Date(business.registrationDate).toLocaleDateString()}</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
              <Icon name="business" size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b1f5c] mt-4">No businesses yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Register your first travel-related establishment to start managing it here.</p>
            <button onClick={onAddBusiness} className="mt-5 px-5 py-2.5 bg-[#0b1f5c] text-white text-sm font-bold rounded-xl hover:bg-[#162d7a] transition-all">Register a Business</button>
          </div>
        )}
      </main>
      <Modals />
    </div>
  );
}
