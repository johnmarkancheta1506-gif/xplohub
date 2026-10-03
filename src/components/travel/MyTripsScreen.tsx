import { useMemo, useState } from "react";
import type { Destination } from "../../types";
import { Icon } from "../common/Icon";
import { getPlaceImage } from "../../data/placeImages";

type TravelPlanRecord = {
  travelplan_id: number | string;
  category_id?: number | null;
  destination_id?: number | null;
  plan_name?: string | null;
  start_date?: string | null;
  number_of_days?: number | null;
  budget?: number | null;
  travel_status?: "Planned" | "Ongoing" | "Completed" | string | null;
  created_date?: string | null;
  notes?: string | null;
  destination_name?: string | null;
  category_name?: string | null;
};

const statusMeta = {
  Planned: {
    label: "Planned",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-100",
    rail: "bg-amber-400",
  },
  Ongoing: {
    label: "Ongoing",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
    rail: "bg-blue-500",
  },
  Completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rail: "bg-emerald-500",
  },
} as const;

function formatDate(value?: string | null) {
  if (!value) return "Date not set";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEndDate(start?: string | null, days?: number | null) {
  if (!start || !days || days < 1) return null;

  const parsed = new Date(`${start}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setDate(parsed.getDate() + Number(days) - 1);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBudget(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not set";
  }

  return `₱${Number(value).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function getOverallBudget(plan: TravelPlanRecord) {
  const match = String(plan.notes ?? "").match(/Overall itinerary budget target:\s*₱([\d,]+)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TR";
}

export default function MyTripsScreen({
  plans,
  destinations,
  onBack,
  onExplore,
  onGenerateItinerary,
  onEdit,
  onDelete,
  onOpenDestination,
}: {
  plans: TravelPlanRecord[];
  destinations: Destination[];
  onBack: () => void;
  onExplore: () => void;
  onGenerateItinerary: () => void;
  onEdit: (plan: TravelPlanRecord) => void;
  onDelete: (plan: TravelPlanRecord) => Promise<void>;
  onOpenDestination: (destination: Destination) => void;
}) {
  const [activeTab, setActiveTab] = useState<"All" | "Planned" | "Ongoing" | "Completed">("All");

  const total = plans.length;
  const upcoming = plans.filter((plan) => plan.travel_status === "Planned").length;
  const ongoing = plans.filter((plan) => plan.travel_status === "Ongoing").length;
  const completed = plans.filter((plan) => plan.travel_status === "Completed").length;

  const filteredPlans = useMemo(() => {
    if (activeTab === "All") return plans;
    return plans.filter((plan) => plan.travel_status === activeTab);
  }, [activeTab, plans]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-800">
      <div className="pt-20 pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-7">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0b1f5c] transition-colors"
            >
              <Icon name="arrow-left" size={17} />
              Explore
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateItinerary}
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#0b1f5c]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#0b1f5c] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b1f5c]/30 hover:bg-slate-50"
              >
                <Icon name="spark" size={15} />
                Generate itinerary
              </button>
              <button
                onClick={onExplore}
                className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#0b1f5c] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#162d7a]"
              >
                <span className="text-base">+</span>
                Add destination
              </button>
            </div>
          </div>

          <section className="overflow-hidden rounded-[28px] bg-[#0b1f5c] shadow-[0_20px_55px_rgba(11,31,92,0.18)]">
            <div className="px-6 py-8 sm:px-9 sm:py-10 lg:px-12">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300">
                    Your journeys
                  </p>
                  <h1
                    className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    My Trips
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                    Keep the places you want to visit organized, track your plans,
                    and turn inspiration into your next trip.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    ["Trips", total],
                    ["Upcoming", upcoming],
                    ["Done", completed],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-[88px] rounded-2xl bg-white/8 px-4 py-3 text-center ring-1 ring-white/10">
                      <div className="text-xl font-extrabold text-white sm:text-2xl">{value}</div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
              {[
                ["All", total],
                ["Planned", upcoming],
                ["Ongoing", ongoing],
                ["Completed", completed],
              ].map(([label, value]) => {
                const tab = label as "All" | "Planned" | "Ongoing" | "Completed";
                const isActive = activeTab === tab;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={isActive}
                    className={`relative px-5 py-4 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 ${
                      tab !== "All" ? "border-l border-white/10" : ""
                    }`}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${isActive ? "text-sky-300" : "text-white/45"}`}>
                      {label === "All" ? "All trips" : label}
                    </div>
                    <div className="mt-1 text-base font-bold text-white">{value}</div>
                    {isActive && (
                      <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-sky-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Your itinerary collection</p>
              <h2
                className="mt-1 text-2xl font-extrabold text-[#0b1f5c]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {activeTab === "All" ? "Saved trips" : `${activeTab} trips`}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onGenerateItinerary}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#0b1f5c] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 sm:hidden"
              >
                <Icon name="spark" size={13} />
                Generate
              </button>
              {filteredPlans.length > 0 && (
                <div className="hidden text-sm font-medium text-slate-400 sm:block">
                  {filteredPlans.length} {filteredPlans.length === 1 ? "trip" : "trips"} {activeTab === "All" ? "saved" : `in ${activeTab.toLowerCase()}`}
                </div>
              )}
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
                <div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f5c] text-white shadow-sm"><Icon name="spark" size={19} /></div>
                  <h3
                    className="mt-5 text-2xl font-extrabold text-[#0b1f5c]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {activeTab === "All" ? "Your next adventure starts here." : `No ${activeTab.toLowerCase()} trips yet.`}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    {activeTab === "All"
                      ? "Explore TravelMate, open a destination you love, and save it to your first trip. Your plans will appear here as you build them."
                      : `You don't have any ${activeTab.toLowerCase()} travel plans right now. Choose another tab or create a new trip.`}
                  </p>
                  <button
                    onClick={onExplore}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b1f5c] px-5 py-3 text-sm font-bold text-white hover:bg-[#162d7a] transition-colors"
                  >
                    Explore destinations
                    <Icon name="arrow-right" size={16} />
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-[22px] bg-slate-50 p-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="h-3 w-24 rounded-full bg-slate-200" />
                    <div className="mt-4 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-3 w-20 rounded-full bg-slate-100" />
                      <div className="h-3 w-14 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="h-8 rounded-xl bg-slate-50" />
                      <div className="h-8 rounded-xl bg-slate-50" />
                      <div className="h-8 rounded-xl bg-slate-50" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="mt-5 space-y-5">
              {[...filteredPlans]
                .map((plan, originalIndex) => ({ plan, originalIndex }))
                .sort((a, b) => {
                  const dayNumber = (value?: string | null) => {
                    const match = String(value ?? "").match(/(?:^|[\s·-])day\s+(\d+)/i);
                    return match ? Number(match[1]) : null;
                  };

                  const aDay = dayNumber(a.plan.plan_name);
                  const bDay = dayNumber(b.plan.plan_name);

                  // Generated itineraries should always read Day 1 → Day 2 → Day 3.
                  if (aDay !== null && bDay !== null) return aDay - bDay;
                  if (aDay !== null) return -1;
                  if (bDay !== null) return 1;
                  return a.originalIndex - b.originalIndex;
                })
                .map(({ plan }, index) => {
                const destination = destinations.find(
                  (item) => item.Destination_ID === Number(plan.destination_id)
                );
                const meta = statusMeta[plan.travel_status as keyof typeof statusMeta] ?? statusMeta.Planned;
                const endDate = getEndDate(plan.start_date, plan.number_of_days);
                const dateText = endDate
                  ? `${formatDate(plan.start_date)} – ${endDate}`
                  : formatDate(plan.start_date);

                return (
                  <article
                    key={plan.travelplan_id}
                    className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className="grid lg:grid-cols-[280px_1fr]">
                      <button
                        onClick={() => destination && onOpenDestination(destination)}
                        disabled={!destination}
                        className="relative min-h-[220px] overflow-hidden bg-slate-200 text-left disabled:cursor-default"
                      >
                        {destination ? (
                          <img
                            src={getPlaceImage(
                              destination.Destination_Name,
                              destination.Destination_ID,
                              destination.Place_Type_ID === 1
                                ? "Restaurant"
                                : destination.Place_Type_ID === 2
                                  ? "Accommodation"
                                  : destination.Place_Type_ID === 3
                                    ? "Convenience Store"
                                    : destination.Place_Type_ID === 4
                                      ? "Landmark"
                                      : "Tourist Destination",
                              destination.Destination_Image
                            )}
                            alt={destination.Destination_Name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=900&h=600&fit=crop&auto=format";
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f5c] via-[#173b9a] to-sky-300" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                        {(() => {
                          const dayMatch = String(plan.plan_name ?? "").match(/(?:^|[\s·-])day\s+(\d+)/i);
                          const tripNumber = dayMatch ? Number(dayMatch[1]) : index + 1;
                          return (
                            <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#0b1f5c] backdrop-blur-sm">
                              Trip {String(tripNumber).padStart(2, "0")}
                            </div>
                          );
                        })()}
                        <div className="absolute bottom-5 left-5 right-5">
                          <div className="text-xl font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {destination?.Destination_Name ?? plan.destination_name ?? "Destination"}
                          </div>
                          <div className="mt-1 text-xs font-medium text-white/70">
                            {destination?.Address ?? "Saved destination"}
                          </div>
                        </div>
                      </button>

                      <div className="relative p-6 sm:p-7">
                        <div className={`absolute bottom-0 left-0 top-0 hidden w-1.5 lg:block ${meta.rail}`} />

                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className="text-2xl font-extrabold text-[#0b1f5c]"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {plan.plan_name || "Untitled trip"}
                              </h3>
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.pill}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-slate-500">
                              {plan.category_name || destination?.Destination_Name || "Travel plan"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                            TM-{String(plan.travelplan_id).padStart(3, "0")}
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dates</div>
                            <div className="mt-2 text-sm font-bold text-[#0b1f5c]">{dateText}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</div>
                            <div className="mt-2 text-sm font-bold text-[#0b1f5c]">
                              {plan.number_of_days ? `${plan.number_of_days} ${plan.number_of_days === 1 ? "day" : "days"}` : "Not set"}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</div>
                            <div className="mt-2 text-sm font-bold text-[#0b1f5c]">{formatBudget(getOverallBudget(plan) ?? plan.budget)}</div>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b1f5c] text-xs font-extrabold text-white">
                            {initials(plan.plan_name || "TravelMate")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-600">TravelMate itinerary</div>
                            <div className="text-[11px] text-slate-400">Created {formatDate(String(plan.created_date ?? "").slice(0, 10) || null)}</div>
                          </div>
                        </div>

                        {plan.notes && (
                          <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 ring-1 ring-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{plan.notes}</p>
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-2">
                          {destination && (
                            <button
                              onClick={() => onOpenDestination(destination)}
                              className="rounded-xl bg-[#0b1f5c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#162d7a] transition-colors"
                            >
                              View destination
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(plan)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Edit plan
                          </button>
                          <button
                            onClick={() => onDelete(plan)}
                            className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <button
            onClick={onExplore}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-4 text-sm font-bold text-[#0b1f5c] hover:border-[#0b1f5c]/25 hover:bg-slate-50 transition-all"
          >
            <span className="text-base">+</span>
            Explore more destinations
          </button>
        </div>
      </div>
    </div>
  );
}
