import { useState, type ChangeEvent } from "react";
import Overlay from "../common/Overlay";
import ModalHeader from "../common/ModalHeader";
import { CategoryIcon, Icon } from "../common/Icon";
import type { CategoryType, Destination, ReviewEntry } from "../../types";

export default function WriteReviewModal({ dest, catType, onClose, onSubmit }: { dest: Destination; catType: CategoryType; onClose: () => void; onSubmit: (r: ReviewEntry) => Promise<void> }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [subRating, setSubRating] = useState(5);
  const [subFeedback, setSubFeedback] = useState("");

  const handleSubmit = async () => {
    if (!comment.trim()) return;

    const newReview: ReviewEntry = {
      // Temporary value only. The real Review_ID is assigned by Supabase
      // and returned after the REVIEW record is inserted.
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
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Write a Review" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-4">
        <p className="text-xs text-slate-400">{dest.Destination_Name}</p>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Rating</label>
          <div className="flex gap-2">{[1,2,3,4,5].map((s) => <button key={s} type="button" aria-label={`${s} star${s === 1 ? "" : "s"}`} onClick={() => setRating(s)} className={`transition-transform hover:scale-110 ${s <= rating ? "text-amber-400" : "text-gray-200"}`}><Icon name="star" size={24} strokeWidth={1.6} /></button>)}</div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Review Comment</label>
          <textarea rows={3} value={comment} onChange={(e: any) => setComment(e.target.value)} placeholder="Share your experience..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"><CategoryIcon type={catType} size={13} className="mr-1 inline-block align-[-2px]" />{catType}-Specific Feedback</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating</label>
            <select value={subRating} onChange={(e: any) => setSubRating(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">{[5,4,3,2,1].map((v) => <option key={v} value={v}>{v} — {["","Poor","Fair","Good","Very Good","Excellent"][v]}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Detailed Feedback</label>
            <textarea rows={2} value={subFeedback} onChange={(e: any) => setSubFeedback(e.target.value)} placeholder={`Specific feedback about this ${catType.toLowerCase()}…`} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={!comment.trim()} className="flex-1 bg-[#0b1f5c] text-white font-semibold py-2.5 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-40 disabled:cursor-not-allowed">Submit Review</button>
        </div>
      </div>
    </Overlay>
  );
}

