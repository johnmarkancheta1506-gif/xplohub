import { useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";
import { CAT_ICON } from "../../data/constants";
import type { CategoryType, Destination, ReviewEntry } from "../../types";

export default function EditReviewModal({
  review,
  dest,
  catType,
  onClose,
  onSaved,
}: {
  review: ReviewEntry;
  dest: Destination;
  catType: CategoryType;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [rating, setRating] = useState(review.Rating);
  const [comment, setComment] = useState(review.Review_Comment);
  const [subRating, setSubRating] = useState(review.subtype_rating);
  const [subFeedback, setSubFeedback] = useState(review.subtype_feedback);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (!comment.trim()) {
      alert("Please enter a review comment.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to edit a review.");

      // Ownership is enforced by the UPDATE RLS policy below.
      // Do not perform a separate SELECT ownership check here because
      // SELECT RLS can prevent the row from being returned even when the
      // authenticated user is the owner.

      const { data: updatedReview, error: reviewError } = await supabase
        .from("REVIEW")
        .update({ Rating: rating, Review_Comment: comment.trim() })
        .eq("Review_ID", review.Review_ID)
        .eq("user_id", user.id)
        .select();

      if (reviewError) throw reviewError;
      if (!updatedReview || updatedReview.length === 0) throw new Error("Your review could not be updated.");

      let childTable = "";
      let childRatingColumn = "";
      let childFeedbackColumn = "";

      if (catType === "Restaurant") {
        childTable = "RESTAURANT_REVIEW";
        childRatingColumn = "Restaurant_Rating";
        childFeedbackColumn = "Restaurant_Feedback";
      } else if (catType === "Accommodation") {
        childTable = "ACCOMMODATIONS_REVIEW";
        childRatingColumn = "Accommodation_Rating";
        childFeedbackColumn = "Accom_Feedback";
      } else if (catType === "Convenience Store") {
        childTable = "CONVENIENCE_STORE_REVIEW";
        childRatingColumn = "Store_Rating";
        childFeedbackColumn = "Store_Feedback";
      } else if (catType === "Landmark") {
        childTable = "LANDMARK_REVIEW";
        childRatingColumn = "Landmark_Rating";
        childFeedbackColumn = "Landmark_Feedback";
      } else {
        childTable = "TOURIST_DESTINATION_REVIEW";
        childRatingColumn = "Tourist_Destination_Rating";
        childFeedbackColumn = "Tourist_Destination_Feedback";
      }

      const { data: updatedChild, error: childError } = await supabase
        .from(childTable)
        .update({
          [childRatingColumn]: subRating,
          [childFeedbackColumn]: subFeedback.trim() || null,
        })
        .eq("Review_ID", review.Review_ID)
        .eq("user_id", user.id)
        .select();

      if (childError) throw childError;
      if (!updatedChild || updatedChild.length === 0) {
        throw new Error("The category-specific part of your review could not be updated.");
      }

      await onSaved();
      alert("Review updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error updating review:", error);
      alert(error.message || "Failed to update review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Edit Review" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-4">
        <p className="text-xs text-slate-400">{dest.Destination_Name}</p>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? "text-amber-400" : "text-gray-200"}`}>★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Review Comment</label>
          <textarea rows={3} value={comment} onChange={(e: any) => setComment(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{CAT_ICON[catType]} {catType}-Specific Feedback</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating</label>
            <select value={subRating} onChange={(e: any) => setSubRating(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v}/5</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Detailed Feedback</label>
            <textarea rows={2} value={subFeedback} onChange={(e: any) => setSubFeedback(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleUpdate} disabled={saving || !comment.trim()} className="flex-1 bg-[#0b1f5c] text-white font-semibold py-2.5 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-40">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </Overlay>
  );
}

