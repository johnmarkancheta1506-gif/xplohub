import { useState } from "react";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";
import { CategoryIcon, Icon } from "../common/Icon";
import type { CategoryType, Destination, ReviewEntry } from "../../types";

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export default function WriteReviewModal({
  dest,
  catType,
  onClose,
  onSubmit,
}: {
  dest: Destination;
  catType: CategoryType;
  onClose: () => void;
  onSubmit: (r: ReviewEntry) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [subRating, setSubRating] = useState(5);
  const [subFeedback, setSubFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || saving) return;

    setSaving(true);
    try {
      const newReview: ReviewEntry = {
        Review_ID: 0,
        reviewer_name: "You",
        reviewer_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&auto=format",
        Rating: rating,
        Review_Comment: comment.trim(),
        Review_Date: new Date().toISOString().slice(0, 10),
        Review_Status: "Approved",
        subtype_rating: subRating,
        subtype_feedback: subFeedback.trim(),
      };

      await onSubmit(newReview);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={saving ? () => undefined : onClose}>
      <ModalHeader title="Write a Review" onClose={onClose} />
      <div className="px-6 pb-6 pt-2 sm:px-7">
        <div className="rounded-2xl bg-[#0b1f5c] p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Share your experience</p>
          <h3 className="mt-1 text-xl font-black leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{dest.Destination_Name}</h3>
          <p className="mt-1 text-xs text-white/60">Your review helps other travelers plan their visit.</p>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Overall rating</label>
                <p className="mt-1 text-sm font-semibold text-slate-600">How was your experience?</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">{ratingLabels[rating]}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  onClick={() => setRating(star)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition hover:scale-105 ${star <= rating ? "text-amber-400 hover:bg-white" : "text-slate-300 hover:bg-white hover:text-amber-300"}`}
                >
                  <Icon name="star" size={25} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Your review</label>
              <span className={`text-[11px] font-semibold ${comment.length > 900 ? "text-red-500" : "text-slate-400"}`}>{comment.length}/1000</span>
            </div>
            <textarea
              rows={5}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Tell other travelers what you liked, what stood out, or what they should know before visiting..."
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0b1f5c]/30 focus:ring-4 focus:ring-[#0b1f5c]/5"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b1f5c] shadow-sm">
                <CategoryIcon type={catType} size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0b1f5c]">{catType}-specific feedback</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">Add a little more detail about this type of place.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">Rating</label>
                <select value={subRating} onChange={(event) => setSubRating(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#0b1f5c]/30 focus:ring-4 focus:ring-[#0b1f5c]/5">
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} — {ratingLabels[value]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">Optional feedback</label>
                <input
                  value={subFeedback}
                  onChange={(event) => setSubFeedback(event.target.value)}
                  placeholder={`e.g. Great ${catType.toLowerCase()}...`}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#0b1f5c]/30 focus:ring-4 focus:ring-[#0b1f5c]/5"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!comment.trim() || saving} className="flex-1 rounded-xl bg-[#0b1f5c] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#162d7a] disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? "Saving..." : "Submit review"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
