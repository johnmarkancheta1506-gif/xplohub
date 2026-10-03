import type { Category, Country, City, Destination, ReviewEntry } from "../../types";
import type { ComponentType } from "react";
import Stars from "../common/Stars";
import BackBtn from "../common/BackBtn";
import { CategoryIcon, Icon } from "../common/Icon";
import UserAvatar from "../common/UserAvatar";
import { getDestinationImage, DESTINATION_IMAGE_CREDITS } from "../../data/destinationImages";
import { CATEGORIES } from "../../data/constants";

interface Props {
  dest: Destination;
  destCat: Category;
  country: Country;
  city: City;
  destReviews: ReviewEntry[];
  destsForCity: Destination[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  onBack: () => void;
  onRegister: () => void;
  onWriteReview: () => void;
  onOpenPlan: () => void;
  onPickDestination: (destination: Destination) => void;
  onEditReview: (review: ReviewEntry) => void;
  onDeleteReview: (review: ReviewEntry) => Promise<void>;
  Navbar: ComponentType;
  Modals: ComponentType;
}

export default function DestinationDetailsScreen({
  dest,
  destCat,
  country,
  city,
  destReviews,
  destsForCity,
  isLoggedIn,
  currentUserId,
  onBack,
  onRegister,
  onWriteReview,
  onOpenPlan,
  onPickDestination,
  onEditReview,
  onDeleteReview,
  Navbar,
  Modals,
}: Props) {
  const image = getDestinationImage(dest);
  const credit = DESTINATION_IMAGE_CREDITS[dest.Destination_ID];
  const averageRating = destReviews.length
    ? destReviews.reduce((sum, review) => sum + Number(review.Rating || 0), 0) / destReviews.length
    : Number(dest.Rating || 0);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      <main className="pt-14">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#07184f]">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.25fr_.75fr] min-h-[460px]">
            <div className="relative min-h-[360px] lg:min-h-[460px] overflow-hidden">
              <img src={image} alt={dest.Destination_Name} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#07184f]/45 via-[#07184f]/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07184f]/80 via-transparent to-transparent" />
            </div>

            <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-white/55">
                <button onClick={() => onBack()} className="hover:text-white">{country.Country_Name}</button>
                <span>/</span>
                <button onClick={() => onBack()} className="hover:text-white">{city.City_Name}</button>
                <span>/</span>
                <span>{destCat.Category_Name}</span>
              </div>

              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-white/90">
                <CategoryIcon type={destCat.Category_Type} size={14} />
                {destCat.Category_Type}
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                {dest.Destination_Name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
                <Stars n={averageRating} />
                <span>{destReviews.length || "No"} {destReviews.length === 1 ? "review" : "reviews"}</span>
              </div>

              <div className="mt-5 flex items-start gap-2 text-sm leading-6 text-white/70">
                <Icon name="location" size={18} className="mt-1 shrink-0 text-white/55" />
                <span>{dest.Address || "Address not available"}</span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={isLoggedIn ? onOpenPlan : onRegister}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0b1f5c] shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <Icon name="folder" size={17} />
                  {isLoggedIn ? "Add to Travel Plan" : "Sign in to save"}
                </button>
                <button
                  onClick={isLoggedIn ? onWriteReview : onRegister}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <Icon name="star" size={17} />
                  {isLoggedIn ? "Write a Review" : "Sign in to review"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <BackBtn onClick={onBack} label={`Back to ${city.City_Name}`} />
            {credit && (
              <a
                href={credit.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
              >
                Photo: {credit.author} · {credit.license}
              </a>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-8">
              {/* Overview */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f5c]/8 text-[#0b1f5c]">
                    <Icon name="notes" size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Overview</p>
                    <h2 className="text-xl font-black text-[#0b1f5c]">About this place</h2>
                  </div>
                </div>
                <p className="text-[15px] leading-7 text-slate-600">{dest.Destination_Description}</p>
              </section>

              {/* Details */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f5c]/8 text-[#0b1f5c]">
                    <Icon name="tag" size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Details</p>
                    <h2 className="text-xl font-black text-[#0b1f5c]">Good to know</h2>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: "location" as const, label: "Address", value: dest.Address || "Not available" },
                    { icon: "clock" as const, label: "Operating hours", value: dest.Operating_Hours || "Not available" },
                    { icon: "phone" as const, label: "Contact", value: dest.Contact_Number || "Not available" },
                    { icon: "tag" as const, label: "Category", value: destCat.Category_Type },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Icon name={item.icon} size={17} className="mt-0.5 shrink-0 text-[#0b1f5c]/60" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{item.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Reviews */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Traveler feedback</p>
                    <h2 className="mt-1 text-2xl font-black text-[#0b1f5c]">Reviews</h2>
                  </div>
                  <button
                    onClick={isLoggedIn ? onWriteReview : onRegister}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0b1f5c]/15 px-4 py-2.5 text-sm font-bold text-[#0b1f5c] hover:bg-[#0b1f5c]/5"
                  >
                    <Icon name="star" size={16} />
                    {isLoggedIn ? "Write a review" : "Sign in to review"}
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-5">
                  <div className="text-4xl font-black text-[#0b1f5c]">{averageRating.toFixed(1)}</div>
                  <div>
                    <Stars n={averageRating} />
                    <p className="mt-1 text-xs text-slate-400">Based on {destReviews.length} review{destReviews.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                {destReviews.length === 0 ? (
                  <div className="py-12 text-center">
                    <Icon name="notes" size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">No reviews yet.</p>
                    <p className="mt-1 text-sm text-slate-400">Be the first traveler to share an experience.</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {destReviews.map((review) => {
                      const own = Boolean(isLoggedIn && currentUserId && review.user_id === currentUserId);
                      return (
                        <article key={review.Review_ID} className="rounded-2xl border border-slate-100 p-5">
                          <div className="flex items-start gap-3">
                            <UserAvatar avatarUrl={review.reviewer_avatar} name={review.reviewer_name} sizeClass="h-[42px] w-[42px]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-[#0b1f5c]">{review.reviewer_name}</p>
                                <span className="text-xs text-slate-400">{review.Review_Date}</span>
                              </div>
                              <div className="mt-1"><Stars n={review.Rating} /></div>
                            </div>
                            {own && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => onEditReview(review)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0b1f5c] hover:bg-slate-50">Edit</button>
                                <button onClick={() => onDeleteReview(review)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </div>

                          <p className="mt-4 text-sm leading-6 text-slate-600">“{review.Review_Comment}”</p>

                          <div className="mt-4 rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                              <CategoryIcon type={destCat.Category_Type} size={13} />
                              {destCat.Category_Type} feedback
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-700">{review.subtype_rating}/5</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{review.subtype_feedback}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <section className="rounded-3xl bg-[#0b1f5c] p-6 text-white shadow-xl">
                <p className="text-[11px] font-bold uppercase tracking-[.12em] text-cyan-300">Plan your trip</p>
                <h3 className="mt-2 text-2xl font-black">Keep this place in your itinerary.</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">Save the destination to one of your existing travel plans and keep your trip organized.</p>
                <button
                  onClick={isLoggedIn ? onOpenPlan : onRegister}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#0b1f5c] hover:bg-slate-100"
                >
                  <Icon name="folder" size={17} />
                  {isLoggedIn ? "Save to a plan" : "Sign in to save"}
                </button>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Explore nearby</p>
                    <h3 className="mt-1 text-lg font-black text-[#0b1f5c]">More in {city.City_Name}</h3>
                  </div>
                  <Icon name="arrow-right" size={18} className="text-slate-300" />
                </div>

                <div className="mt-5 space-y-2">
                  {destsForCity.filter((item) => item.Destination_ID !== dest.Destination_ID).slice(0, 5).map((item) => {
                    const category = CATEGORIES.find((c) => c.Category_ID === item.Category_ID);
                    return (
                      <button
                        key={item.Destination_ID}
                        onClick={() => onPickDestination(item)}
                        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50"
                      >
                        <img src={getDestinationImage(item)} alt={item.Destination_Name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#0b1f5c]">{item.Destination_Name}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                            {category ? <CategoryIcon type={category.Category_Type} size={12} /> : <Icon name="compass" size={12} />}
                            {category?.Category_Type ?? "Destination"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Modals />
    </div>
  );
}
