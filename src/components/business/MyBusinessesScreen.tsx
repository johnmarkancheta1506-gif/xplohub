import type { ComponentType } from "react";
import type { BusinessPartner } from "../../types";
import { CategoryIcon, Icon } from "../common/Icon";

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
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 z-50">
        <div className="h-full max-w-5xl mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1f5c] text-white"><Icon name="globe" size={15} /></div>
            <span className="font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>TravelMate</span>
          </div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:text-[#0b1f5c]"
          >
            Back to Explore
          </button>
        </div>
      </header>

      <div className="pt-24 max-w-3xl mx-auto px-5 pb-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">For Business</p>
            <h1 className="text-2xl font-extrabold text-[#0b1f5c] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              My Businesses
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Each business is managed as its own Business Partner record.
            </p>
          </div>
          <button
            onClick={onAddBusiness}
            className="px-4 py-2.5 rounded-xl bg-[#0b1f5c] text-white text-sm font-semibold hover:bg-[#162d7a] transition-all whitespace-nowrap"
          >
            + Add Another Business
          </button>
        </div>

        <div className="space-y-3">
          {businesses.map((business) => (
            <button
              key={business.partnerId ?? `${business.businessName}-${business.email}`}
              onClick={() => onSelectBusiness(business)}
              className="w-full text-left bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#0b1f5c]/20 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b1f5c] text-white">
                  <CategoryIcon type={business.businessCategory as any} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-[#0b1f5c] text-sm truncate">{business.businessName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{business.businessCategory}</p>
                  <p className="text-xs text-slate-400 mt-1">{business.contactPerson} · {business.email}</p>
                </div>
                <Icon name="arrow-right" size={16} className="text-slate-400" />
              </div>
            </button>
          ))}
        </div>

        {businesses.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <Icon name="business" size={34} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-semibold text-sm">No businesses registered yet</p>
            <button
              onClick={onAddBusiness}
              className="mt-4 px-5 py-2 bg-[#0b1f5c] text-white text-sm font-semibold rounded-xl hover:bg-[#162d7a] transition-all"
            >
              Register a Business
            </button>
          </div>
        )}
      </div>
      <Modals />
    </div>
  );
}

