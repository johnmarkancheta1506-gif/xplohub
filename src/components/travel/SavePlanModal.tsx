import { useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";
import { CATEGORIES } from "../../data/constants";
import type { Destination } from "../../types";

export default function SavePlanModal({
  dest,
  onClose,
}: {
  dest: Destination;
  onClose: () => void;
}) {
  const cat = CATEGORIES.find(
    (c) => c.Category_ID === (dest.Place_Type_ID ?? dest.Category_ID)
  );

  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!planName.trim()) {
      alert("Please enter a plan name.");
      return;
    }

    if (!startDate) {
      alert("Please select a start date.");
      return;
    }

    if (!numberOfDays || Number(numberOfDays) < 1) {
      alert("Please enter a valid number of days.");
      return;
    }

    setSaving(true);

    try {
      // Get currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to save a travel plan.");
      }

      // Get the actual database category for this destination.
      // IMPORTANT: Destination.Category_ID can represent the thematic Supabase
      // category for DB-loaded destinations, while static/demo destinations
      // may use the frontend UI category IDs (1-5). Travel plans must always
      // use the real CATEGORY.category_id foreign key from Supabase.
      const { data: dbDestination, error: destinationError } = await supabase
        .from("DESTINATION")
        .select("destination_id, category_id")
        .eq("destination_id", dest.Destination_ID)
        .single();

      if (destinationError || !dbDestination) {
        throw new Error(
          "This destination is not available in the Supabase database, so it cannot be saved to a travel plan."
        );
      }

      if (dbDestination.category_id === null || dbDestination.category_id === undefined) {
        throw new Error(
          "This destination does not have a database category assigned, so it cannot be saved to a travel plan."
        );
      }

      // Get the next TravelPlan_ID
      const { data: existingPlans, error: idError } = await supabase
        .from("TRAVEL_PLAN")
        .select("travelplan_id")
        .order("travelplan_id", { ascending: false })
        .limit(1);

      if (idError) {
        throw idError;
      }

      const nextTravelPlanId =
        existingPlans && existingPlans.length > 0
          ? Number(existingPlans[0].travelplan_id) + 1
          : 1;

      // Save the travel plan
      const { error: insertError } = await supabase
        .from("TRAVEL_PLAN")
        .insert({
          travelplan_id: nextTravelPlanId,
          // Use the actual CATEGORY.category_id from the database, not the
          // frontend UI category ID.
          category_id: Number(dbDestination.category_id),
          destination_id: dest.Destination_ID,
          plan_name: planName.trim(),
          start_date: startDate,
          number_of_days: Number(numberOfDays),
          budget: budget ? Number(budget) : null,
          travel_status: "Planned",
          created_date: new Date().toISOString(),
          notes: notes.trim() || null,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      alert("Travel plan saved successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error saving travel plan:", error);
      alert(error.message || "Failed to save travel plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Save to Travel Plan" onClose={onClose} />

      <div className="px-6 pb-6 pt-3 space-y-3">

        {/* Destination */}
        <div className="bg-blue-50 rounded-xl p-3 flex gap-3 items-center">
          <img
            src={dest.Destination_Image}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            alt={dest.Destination_Name}
          />

          <div>
            <div className="font-bold text-[#0b1f5c] text-sm">
              {dest.Destination_Name}
            </div>

            <div className="text-xs text-slate-400">
              {cat?.Category_Name}
            </div>
          </div>
        </div>

        {/* Plan Name */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Plan Name
          </label>

          <input
            type="text"
            value={planName}
            onChange={(e: any) => setPlanName(e.target.value)}
            placeholder="e.g. Palawan Nature Trip"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Start Date + Number of Days */}
        <div className="grid grid-cols-2 gap-3">

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e: any) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              No. of Days
            </label>

            <input
              type="number"
              min="1"
              value={numberOfDays}
              onChange={(e: any) => setNumberOfDays(e.target.value)}
              placeholder="7"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

        </div>

        {/* Budget */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Budget
          </label>

          <input
            type="number"
            min="0"
            value={budget}
            onChange={(e: any) => setBudget(e.target.value)}
            placeholder="e.g. 45000"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Notes
          </label>

          <textarea
            rows={2}
            value={notes}
            onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Packing list, reminders…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save to Plan"}
        </button>

      </div>
    </Overlay>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────


