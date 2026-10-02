import { useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";

export default function EditTravelPlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [planName, setPlanName] = useState(plan.plan_name ?? "");
  const [startDate, setStartDate] = useState(plan.start_date ?? "");
  const [numberOfDays, setNumberOfDays] = useState(
    plan.number_of_days ? String(plan.number_of_days) : ""
  );
  const [budget, setBudget] = useState(
    plan.budget !== null && plan.budget !== undefined
      ? String(plan.budget)
      : ""
  );
  const [status, setStatus] = useState(plan.travel_status ?? "Planned");
  const [notes, setNotes] = useState(plan.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to edit a travel plan.");
      }

      const { data, error } = await supabase
        .from("TRAVEL_PLAN")
        .update({
          plan_name: planName.trim(),
          start_date: startDate,
          number_of_days: Number(numberOfDays),
          budget: budget ? Number(budget) : null,
          travel_status: status,
          notes: notes.trim() || null,
        })
        .eq("travelplan_id", plan.travelplan_id)
        .eq("user_id", user.id)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Travel plan could not be updated. Make sure this plan belongs to your account."
        );
      }

      await onSaved();

      alert("Travel plan updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error updating travel plan:", error);
      alert(error.message || "Failed to update travel plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Edit Travel Plan" onClose={onClose} />

      <div className="px-6 pb-6 pt-3 space-y-3">

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Plan Name
          </label>
          <input
            value={planName}
            onChange={(e: any) => setPlanName(e.target.value)}
            placeholder="e.g. Baguio Weekend Trip"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e: any) => setStartDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Number of Days
          </label>
          <input
            type="number"
            min="1"
            value={numberOfDays}
            onChange={(e: any) => setNumberOfDays(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Budget
          </label>
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(e: any) => setBudget(e.target.value)}
            placeholder="₱0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Travel Status
          </label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="Planned">Planned</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex-1 bg-[#0b1f5c] text-white font-semibold py-2.5 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
    </Overlay>
  );
}

