import React from "react";
import type { SearchHistoryEntry } from "../../types";
import { Icon } from "../common/Icon";

export default function SearchHistoryModal({ history, onClose }: { history: SearchHistoryEntry[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-[#0b1f5c]">Search History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your previous searches</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><Icon name="x" size={16} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="search" size={30} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No search history yet</p>
              <p className="text-xs text-slate-400 mt-1">Your searches will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const dateText = item.search_date_time ? new Date(item.search_date_time).toLocaleString() : "Unknown date";
                const keyword = item.search_keyword?.trim();
                const parts = [item.country_name, item.city_name, item.search_category].filter(Boolean);
                const searchDetails = parts.join(" - ");
                return (
                  <div key={item.search_id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white"><Icon name="search" size={16} className="text-slate-400" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{searchDetails || "Search with filters"}</p>
                        {keyword && <p className="text-xs text-slate-400 mt-0.5">Keyword: {keyword}</p>}
                        <p className="text-[11px] text-slate-400 mt-1">{dateText}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
