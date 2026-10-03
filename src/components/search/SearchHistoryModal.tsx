import type { SearchHistoryEntry } from "../../types";
import { Icon } from "../common/Icon";

const categoryIcon = (category?: string | null) => {
  const value = category?.toLowerCase() ?? "";
  if (value.includes("restaurant")) return "restaurant" as const;
  if (value.includes("accommodation")) return "accommodation" as const;
  if (value.includes("convenience") || value.includes("store")) return "store" as const;
  if (value.includes("landmark")) return "landmark" as const;
  if (value.includes("tourist")) return "compass" as const;
  return "search" as const;
};

export default function SearchHistoryModal({
  history,
  onClose,
}: {
  history: SearchHistoryEntry[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div className="my-auto flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8ca0c2]">
                <Icon name="history" size={13} /> Travel activity
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-[#0b1f5c]">Search History</h2>
              <p className="mt-1 text-sm text-slate-400">A record of the destinations and filters you searched.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close search history"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <Icon name="x" size={17} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="rounded-full bg-[#0b1f5c] px-3 py-1.5 text-[11px] font-bold text-white">
              {history.length} {history.length === 1 ? "search" : "searches"}
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              Private to your account
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 sm:px-7 sm:py-6">
          {history.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#0b1f5c] shadow-sm ring-1 ring-slate-100">
                  <Icon name="search" size={27} />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-[#0b1f5c]">No search history yet</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">Your searches will appear here as you explore countries, cities, and destination categories.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => {
                const dateText = item.search_date_time
                  ? new Date(item.search_date_time).toLocaleString()
                  : "Unknown date";
                const keyword = item.search_keyword?.trim();
                const locationParts = [item.country_name, item.city_name].filter(Boolean);
                const category = item.search_category?.trim();
                const details = locationParts.join(" · ");

                return (
                  <div
                    key={item.search_id}
                    className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0b1f5c]">
                        <Icon name={categoryIcon(category)} size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-[#0b1f5c] sm:text-[15px]">
                              {keyword || "Search with filters"}
                            </p>
                            {details && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <Icon name="location" size={12} className="shrink-0" />
                                <span className="truncate">{details}</span>
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                            #{history.length - index}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {category && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-600">
                              <Icon name={categoryIcon(category)} size={11} />
                              {category}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                            <Icon name="calendar" size={11} />
                            {dateText}
                          </span>
                        </div>
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
