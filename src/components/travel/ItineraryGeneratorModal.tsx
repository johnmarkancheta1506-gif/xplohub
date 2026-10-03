import { useMemo, useState } from "react";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";
import { CategoryIcon, Icon } from "../common/Icon";
import { CATEGORIES } from "../../data/constants";
import type { City, Country, Destination } from "../../types";
import supabase from "../../config/supabaseClient";
import { normId } from "../../services/idUtils";

const THEMATIC_OPTIONS = [
  { id: 2, label: "Nature" },
  { id: 3, label: "Religious" },
  { id: 4, label: "Recreational" },
  { id: 5, label: "Beach" },
  { id: 6, label: "Historical" },
] as const;

type ItineraryItem = {
  id: string;
  destination: Destination;
  day: number;
};

function normalizeCityName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\bcity\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDbCityId(city: City, dbCities: any[]) {
  const targetName = normalizeCityName(city.City_Name);
  const match = dbCities.find((item) => {
    const name = item.city_name ?? item.City_Name ?? "";
    return normalizeCityName(name) === targetName;
  });

  return match?.city_id ?? match?.City_ID ?? null;
}

function categoryType(destination: Destination) {
  return CATEGORIES.find(
    (category) => category.Category_ID === (destination.Place_Type_ID ?? 0),
  )?.Category_Type ?? "Tourist Destination";
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function distributeDestinations(
  candidates: Destination[],
  days: number,
  interests: number[],
): ItineraryItem[] {
  const scored = [...candidates]
    .map((destination) => {
      const interestMatch = interests.includes(Number(destination.Category_ID)) ? 8 : 0;
      const ratingScore = Math.max(0, Number(destination.Rating || 0)) * 2;
      return { destination, score: interestMatch + ratingScore };
    })
    .sort((a, b) => b.score - a.score || a.destination.Destination_ID - b.destination.Destination_ID);

  // Start with one destination per requested day; extra places can still be added manually.
  const targetCount = Math.min(scored.length, days);
  const selected = scored.slice(0, targetCount).map((entry) => entry.destination);

  return selected.map((destination, index) => ({
    id: `${destination.Destination_ID}-${index}`,
    destination,
    day: (index % days) + 1,
  }));
}

export default function ItineraryGeneratorModal({
  countries,
  cities,
  dbCities,
  destinations,
  onClose,
  onSaved,
}: {
  countries: Country[];
  cities: City[];
  dbCities: any[];
  destinations: Destination[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const liveCountries = countries.filter((country) => country.interactable);
  const liveCities = cities.filter((city) => {
    const country = liveCountries.find((item) => item.Country_ID === city.Country_ID);
    const dbCityId = getDbCityId(city, dbCities);
    return Boolean(country && dbCityId && destinations.some((destination) => normId(destination.City_ID) === normId(dbCityId)));
  });

  const [countryId, setCountryId] = useState(liveCountries[0]?.Country_ID ?? 1);
  const [cityId, setCityId] = useState(liveCities[0]?.City_ID ?? 1);
  const [days, setDays] = useState("3");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<number[]>([4, 5]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);

  const citiesForCountry = useMemo(
    () => liveCities.filter((city) => city.Country_ID === countryId),
    [liveCities, countryId],
  );

  const selectedCity = citiesForCountry.find((city) => city.City_ID === cityId) ?? citiesForCountry[0] ?? null;
  const selectedCountry = liveCountries.find((country) => country.Country_ID === countryId) ?? null;

  const candidates = useMemo(() => {
    if (!selectedCity) return [];
    const dbCityId = getDbCityId(selectedCity, dbCities);
    if (!dbCityId) return [];
    return destinations.filter((destination) =>
      normId(destination.City_ID) === normId(dbCityId) &&
      Number.isFinite(Number(destination.Category_ID))
    );
  }, [selectedCity, dbCities, destinations]);

  const toggleInterest = (id: number) => {
    setInterests((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const generate = () => {
    if (!selectedCity || candidates.length === 0) {
      alert("No live destinations are available for this city yet.");
      return;
    }

    const safeDays = Math.min(7, Math.max(1, Number(days) || 1));
    setDays(String(safeDays));
    setItems(distributeDestinations(candidates, safeDays, interests));
    setGenerated(true);
  };

  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  const moveItem = (id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((item, itemIndex) => ({ ...item, day: (itemIndex % Math.max(1, Number(days) || 1)) + 1 }));
    });
  };

  const addDestination = (destination: Destination) => {
    if (items.some((item) => item.destination.Destination_ID === destination.Destination_ID)) return;
    const nextIndex = items.length;
    setItems((current) => [
      ...current,
      { id: `${destination.Destination_ID}-${Date.now()}`, destination, day: (nextIndex % Math.max(1, Number(days) || 1)) + 1 },
    ]);
    setGenerated(true);
  };

  const handleSave = async () => {
    if (!selectedCity || !selectedCountry || items.length === 0) {
      alert("Generate at least one itinerary item first.");
      return;
    }

    if (!startDate) {
      alert("Please choose a start date for the itinerary.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to save an itinerary.");

      const { data: existingPlans, error: idError } = await supabase
        .from("TRAVEL_PLAN")
        .select("travelplan_id")
        .order("travelplan_id", { ascending: false })
        .limit(1);

      if (idError) throw idError;

      let nextId = existingPlans?.length ? Number(existingPlans[0].travelplan_id) + 1 : 1;
      const overallBudget = budget ? Number(budget) : null;
      const perItemBudget = overallBudget && items.length ? Math.round(overallBudget / items.length) : null;

      const rows = items.map((item) => {
        const row = {
          travelplan_id: nextId++,
          category_id: Number(item.destination.Category_ID),
          destination_id: item.destination.Destination_ID,
          plan_name: (name.trim() || `${selectedCity.City_Name} Custom Itinerary`) + ` · Day ${item.day}`,
          start_date: startDate,
          number_of_days: Number(days),
          budget: perItemBudget,
          travel_status: "Planned",
          created_date: new Date().toISOString(),
          notes: [
            `Generated itinerary for ${selectedCountry.Country_Name} → ${selectedCity.City_Name}.`,
            `Day ${item.day}: ${item.destination.Destination_Name}`,
            overallBudget ? `Overall itinerary budget target: ₱${overallBudget.toLocaleString("en-PH")}.` : "",
            "Users can edit each saved trip item from My Trips.",
          ].filter(Boolean).join(" "),
          user_id: user.id,
        };
        return row;
      });

      const { error: insertError } = await supabase.from("TRAVEL_PLAN").insert(rows);
      if (insertError) throw insertError;

      await onSaved();
      alert("Custom itinerary saved to My Trips!");
      onClose();
    } catch (error: any) {
      console.error("Itinerary save error:", error);
      alert(error.message || "Failed to save itinerary.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Custom Itinerary Generator" onClose={onClose} />
      <div className="space-y-5 px-6 pb-6 pt-3">
        <div className="rounded-2xl bg-[#0b1f5c] p-5 text-white">
          <div className="flex items-center gap-2 text-sky-300">
            <Icon name="spark" size={17} />
            <span className="text-[10px] font-black uppercase tracking-[.18em]">TravelMate Planner</span>
          </div>
          <h3 className="mt-2 text-xl font-black">Build a trip, then make it yours.</h3>
          <p className="mt-1 text-xs leading-5 text-white/60">The generator uses live destination records, your interests, and destination ratings to create a starting itinerary. You can edit it before saving.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500">Country
            <select value={countryId} onChange={(event) => { const value = Number(event.target.value); setCountryId(value); const firstCity = liveCities.find((item) => item.Country_ID === value); if (firstCity) setCityId(firstCity.City_ID); setGenerated(false); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
              {liveCountries.map((country) => <option key={country.Country_ID} value={country.Country_ID}>{country.Country_Name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">City
            <select value={selectedCity?.City_ID ?? ""} onChange={(event) => { setCityId(Number(event.target.value)); setGenerated(false); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
              {citiesForCountry.map((city) => <option key={city.City_ID} value={city.City_ID}>{city.City_Name}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-500">Itinerary name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Baguio Weekend Adventure" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">Start date
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-500">Number of days
            <input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              onBlur={() => setDays(String(Math.min(7, Math.max(1, Number(days) || 1))))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">Budget target (optional)
            <input type="number" min={0} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="₱10,000" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">What are you interested in?</p>
          <div className="flex flex-wrap gap-2">
            {THEMATIC_OPTIONS.map((option) => {
              const active = interests.includes(option.id);
              return <button key={option.id} type="button" onClick={() => toggleInterest(option.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-[#0b1f5c] bg-[#0b1f5c] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>{option.label}</button>;
            })}
          </div>
        </div>

        <button onClick={generate} type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f5c] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#162d7a]">
          <Icon name="spark" size={17} /> Generate itinerary
        </button>

        {generated && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">Generated plan</p>
                <h4 className="text-lg font-black text-[#0b1f5c]">{selectedCity?.City_Name}</h4>
              </div>
              <span className="text-xs font-semibold text-slate-400">{Number(days) || 1} days · {items.length} places</span>
            </div>

            {items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">No destinations remain. Add one below.</div> : items.map((item, index) => {
              const type = categoryType(item.destination);
              return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex gap-3">
                  <img src={item.destination.Destination_Image} alt="" className="h-16 w-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">DAY {item.day}</span>
                      <CategoryIcon type={type} size={13} className="text-slate-400" />
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-[#0b1f5c]">{item.destination.Destination_Name}</p>
                    <p className="truncate text-[11px] text-slate-400">{item.destination.Address}</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button type="button" disabled={index === 0} onClick={() => moveItem(item.id, -1)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(item.id, 1)} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50">Remove</button>
                </div>
              </div>;
            })}

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">Add another destination</p>
              <select defaultValue="" onChange={(event) => { const value = Number(event.target.value); const destination = candidates.find((item) => item.Destination_ID === value); if (destination) addDestination(destination); event.target.value = ""; }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <option value="">Choose a place…</option>
                {candidates.filter((candidate) => !items.some((item) => item.destination.Destination_ID === candidate.Destination_ID)).map((candidate) => <option key={candidate.Destination_ID} value={candidate.Destination_ID}>{candidate.Destination_Name}</option>)}
              </select>
            </div>

            <p className="text-[11px] leading-4 text-slate-400">Budget is saved as your overall target and allocated across the saved itinerary items. The current database does not contain destination cost data, so TravelMate does not invent cost estimates.</p>

            <button onClick={handleSave} disabled={saving || items.length === 0} className="w-full rounded-xl bg-[#0b1f5c] px-4 py-3 text-sm font-black text-white transition hover:bg-[#162d7a] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving itinerary…" : "Save customizable itinerary to My Trips"}
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
