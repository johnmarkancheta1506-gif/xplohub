import type { CategoryType, Country, City, Destination, ReviewEntry } from "../../types";
import { useState } from "react";
import BackBtn from "../common/BackBtn";
import Stars from "../common/Stars";
import UserAvatar from "../common/UserAvatar";
import { CategoryIcon, Icon } from "../common/Icon";
import { getPlaceImage } from "../../data/placeImages";

interface DestinationDetailScreenProps {
  destination: Destination;
  category: { Category_Name: string; Category_Type: CategoryType };
  city: City;
  country: Country;
  reviews: ReviewEntry[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  relatedDestinations: Destination[];
  onBack: () => void;
  onOpenReview: () => void;
  canReview: boolean;
  reviewEligibilityMessage: string;
  onOpenPlan: () => void;
  onSignInToReview: () => void;
  onEditReview: (review: ReviewEntry) => void;
  onDeleteReview: (review: ReviewEntry) => Promise<void>;
  onOpenDestination: (destination: Destination) => void;
  availableCountries: Country[];
  availableCities: City[];
  onSelectCountry: (country: Country) => void;
  onSelectCity: (city: City) => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=1400&h=900&fit=crop&auto=format";

const CATEGORY_STYLES: Record<CategoryType, string> = {
  Restaurant: "bg-orange-50 text-orange-700 border-orange-100",
  Accommodation: "bg-blue-50 text-blue-700 border-blue-100",
  "Convenience Store": "bg-emerald-50 text-emerald-700 border-emerald-100",
  Landmark: "bg-violet-50 text-violet-700 border-violet-100",
  "Tourist Destination": "bg-purple-50 text-purple-700 border-purple-100",
};

function formatRating(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function DestinationDetailScreen({
  destination,
  category,
  city,
  country,
  reviews,
  isLoggedIn,
  currentUserId,
  relatedDestinations,
  onBack,
  onOpenReview,
  canReview,
  reviewEligibilityMessage,
  onOpenPlan,
  onSignInToReview,
  onEditReview,
  onDeleteReview,
  onOpenDestination,
  availableCountries,
  availableCities,
  onSelectCountry,
  onSelectCity,
}: DestinationDetailScreenProps) {
  const [openSwitcher, setOpenSwitcher] = useState<"country" | "city" | null>(null);
  const image = getPlaceImage(
    destination.Destination_Name,
    destination.Destination_ID,
    category.Category_Type,
    destination.Destination_Image,
  );

  const baseRating = Number(destination.Rating || 0);
  const averageReviewRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.Rating || 0), 0) / reviews.length
    : baseRating;

  const heroRating = reviews.length ? averageReviewRating : baseRating;

  const infoItems = [
    { icon: "location" as const, label: "Address", value: destination.Address },
    { icon: "clock" as const, label: "Operating hours", value: destination.Operating_Hours },
    { icon: "phone" as const, label: "Contact", value: destination.Contact_Number },
    { icon: "tag" as const, label: "Category", value: category.Category_Name },
  ];

  const liveCountries = availableCountries.filter((item) => item.interactable);
  const citiesForCurrentCountry = availableCities.filter((item) => item.Country_ID === country.Country_ID);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Destination switcher replaces the empty top strip and gives users a fast way
          to move between the live countries/cities without returning to Explore. */}
      <div className="border-b border-slate-200 bg-white pt-0">
        <div className="mx-auto flex min-h-[58px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 sm:flex">
            <span className="text-[#0b1f5c]">Explore</span>
            <span>/</span>
            <span>{country.Country_Name}</span>
            <span>/</span>
            <span>{city.City_Name}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenSwitcher(openSwitcher === "country" ? null : "country")}
                className="inline-flex min-w-[150px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-xs font-bold text-[#0b1f5c] shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2"><Icon name="globe" size={15} />{country.Country_Name}</span>
                <Icon name="arrow-right" size={13} className="rotate-90 text-slate-400" />
              </button>
              {openSwitcher === "country" && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                  <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Country</p>
                  {liveCountries.map((item) => (
                    <button
                      key={item.Country_ID}
                      type="button"
                      onClick={() => { setOpenSwitcher(null); onSelectCountry(item); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${item.Country_ID === country.Country_ID ? "bg-[#0b1f5c]/8 text-[#0b1f5c]" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {item.Country_Name}
                      {item.Country_ID === country.Country_ID && <span className="text-xs text-sky-500">Current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenSwitcher(openSwitcher === "city" ? null : "city")}
                className="inline-flex min-w-[150px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-xs font-bold text-[#0b1f5c] shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2"><Icon name="location" size={15} />{city.City_Name}</span>
                <Icon name="arrow-right" size={13} className="rotate-90 text-slate-400" />
              </button>
              {openSwitcher === "city" && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                  <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">City in {country.Country_Name}</p>
                  {citiesForCurrentCountry.map((item) => (
                    <button
                      key={item.City_ID}
                      type="button"
                      onClick={() => { setOpenSwitcher(null); onSelectCity(item); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${item.City_ID === city.City_ID ? "bg-[#0b1f5c]/8 text-[#0b1f5c]" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {item.City_Name}
                      {item.City_ID === city.City_ID && <span className="text-xs text-sky-500">Current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#071438]">
        <div className="mx-auto grid min-h-[470px] max-w-7xl lg:grid-cols-[1.35fr_.65fr]">
          <div className="relative min-h-[360px] overflow-hidden lg:min-h-[470px]">
            <img
              src={image}
              alt={destination.Destination_Name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071438]/55 via-[#071438]/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071438]/75 via-transparent to-transparent" />
          </div>

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/55">
              <button onClick={onBack} className="transition hover:text-white">{country.Country_Name}</button>
              <span>/</span>
              <button onClick={onBack} className="transition hover:text-white">{city.City_Name}</button>
              <span>/</span>
              <span>{category.Category_Name}</span>
            </div>

            <div className={`mb-4 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] ${CATEGORY_STYLES[category.Category_Type]}`}>
              <CategoryIcon type={category.Category_Type} size={14} />
              {category.Category_Type}
            </div>

            <h1
              className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {destination.Destination_Name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Stars n={heroRating} />
                <span className="font-bold">{formatRating(heroRating)}</span>
              </div>
              <span className="h-1 w-1 rounded-full bg-white/35" />
              <span>{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
            </div>

            <div className="mt-5 flex items-start gap-2 text-sm leading-6 text-white/70">
              <Icon name="location" size={18} className="mt-1 shrink-0" />
              <span>{destination.Address || city.City_Name}</span>
            </div>

            {isLoggedIn && !canReview && (
              <p className="mt-3 max-w-md text-xs leading-5 text-white/55">
                {reviewEligibilityMessage}
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={onOpenPlan}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0b1f5c] shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <Icon name="folder" size={17} />
                {isLoggedIn ? "Add to Travel Plan" : "Sign in to save"}
              </button>
              <button
                onClick={isLoggedIn && canReview ? onOpenReview : (!isLoggedIn ? onSignInToReview : undefined)}
                disabled={isLoggedIn && !canReview}
                title={isLoggedIn && !canReview ? reviewEligibilityMessage : undefined}
                className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${
                  !isLoggedIn || canReview
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                    : "cursor-not-allowed border-white/10 bg-white/5 text-white/45"
                }`}
              >
                <Icon name="notes" size={17} />
                {isLoggedIn ? (canReview ? "Write a Review" : "Review unavailable") : "Sign in to review"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-6">
          <BackBtn onClick={onBack} label={`Back to ${city.City_Name}`} />
          <span className="rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-slate-400 shadow-sm">
            D-{String(destination.Destination_ID).padStart(3, "0")}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            {/* Overview */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Overview</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    About this place
                  </h2>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-[#0b1f5c]/5 px-4 py-3">
                  <Stars n={heroRating} />
                  <div>
                    <p className="text-lg font-black leading-none text-[#0b1f5c]">{formatRating(heroRating)}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">Traveler rating</p>
                  </div>
                </div>
              </div>
              <p className="text-[15px] leading-7 text-slate-600">
                {destination.Destination_Description || "No description is available for this destination yet."}
              </p>
            </section>

            {/* Information */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Useful information</p>
              <h2 className="mt-1 text-2xl font-black text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Plan your visit
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {infoItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                      <Icon name={item.icon} size={15} />
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                      {item.value || "Not available"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section id="destination-reviews" className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Traveler feedback</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <h2 className="text-2xl font-black text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>Reviews</h2>
                      <span className="text-sm font-semibold text-slate-400">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
                    </div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      See what travelers experienced here before planning your own visit.
                    </p>
                  </div>

                  {isLoggedIn ? (
                    <button
                      onClick={canReview ? onOpenReview : undefined}
                      disabled={!canReview}
                      title={!canReview ? reviewEligibilityMessage : undefined}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        canReview
                          ? "bg-[#0b1f5c] text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#162d7a]"
                          : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Icon name="notes" size={16} />
                      {canReview ? "Write a review" : "Review unavailable"}
                    </button>
                  ) : (
                    <button
                      onClick={onSignInToReview}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#0b1f5c] transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Icon name="user" size={16} />
                      Sign in to review
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-2xl bg-[#0b1f5c] p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">Overall rating</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-black leading-none">{formatRating(heroRating)}</span>
                      <span className="pb-0.5 text-sm font-semibold text-white/55">/ 5</span>
                    </div>
                    <div className="mt-3"><Stars n={heroRating} /></div>
                    <p className="mt-3 text-xs leading-5 text-white/60">
                      {reviews.length ? `Based on ${reviews.length} traveler review${reviews.length === 1 ? "" : "s"}.` : "No traveler reviews yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#0b1f5c]">Rating breakdown</p>
                      <span className="text-xs font-semibold text-slate-400">{reviews.length ? "Traveler ratings" : "Waiting for reviews"}</span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {[5, 4, 3, 2, 1].map((score) => {
                        const count = reviews.filter((review) => Math.round(Number(review.Rating || 0)) === score).length;
                        const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                        return (
                          <div key={score} className="grid grid-cols-[38px_minmax(0,1fr)_36px] items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-500">{score} star</span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-right font-semibold text-slate-400">{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isLoggedIn && !canReview && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                      <Icon name="calendar" size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700">Review access is not available yet</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{reviewEligibilityMessage}</p>
                    </div>
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                      <Icon name="notes" size={24} />
                    </div>
                    <p className="mt-4 text-sm font-bold text-[#0b1f5c]">No reviews yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-400">Be the first traveler to share an experience from this destination.</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {reviews.map((review) => {
                      const own = Boolean(isLoggedIn && currentUserId && review.user_id === currentUserId);
                      return (
                        <article key={review.Review_ID} className="rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-slate-200 hover:shadow-sm">
                          <div className="flex items-start gap-3">
                            <UserAvatar
                              userId={review.user_id}
                              name={review.reviewer_name}
                              avatarUrl={review.reviewer_avatar}
                              sizeClass="h-11 w-11 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-bold text-[#0b1f5c]">{review.reviewer_name}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-400">{review.Review_Date}</span>
                              </div>
                              <div className="mt-1.5"><Stars n={review.Rating} /></div>
                            </div>
                            {own && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => onEditReview(review)} className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50" aria-label="Edit review" title="Edit review">
                                  <Icon name="edit" size={16} />
                                </button>
                                <button onClick={() => onDeleteReview(review)} className="rounded-lg p-2 text-red-500 transition hover:bg-red-50" aria-label="Delete review" title="Delete review">
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="mt-4 text-sm leading-7 text-slate-600">“{review.Review_Comment}”</p>

                          {(review.subtype_feedback || Number(review.subtype_rating || 0) > 0) && (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                                  <CategoryIcon type={category.Category_Type} size={13} />
                                  {category.Category_Type} feedback
                                </p>
                                {Number(review.subtype_rating || 0) > 0 && (
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1f5c] shadow-sm">
                                    {Number(review.subtype_rating).toFixed(1)} / 5
                                  </span>
                                )}
                              </div>
                              {review.subtype_feedback && <p className="mt-2 text-xs leading-5 text-slate-500">{review.subtype_feedback}</p>}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Travel-plan CTA */}
            <section className="overflow-hidden rounded-3xl bg-[#0b1f5c] p-6 text-white shadow-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Icon name="calendar" size={22} />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Plan your trip</p>
              <h3 className="mt-2 text-2xl font-black leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                Keep this place in your itinerary.
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Save this destination to one of your Travel Plans and keep your trip organized.
              </p>
              <button
                onClick={onOpenPlan}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#0b1f5c] transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <Icon name="folder" size={17} />
                {isLoggedIn ? "Add to Travel Plan" : "Sign in to save"}
              </button>
            </section>

            {/* Quick facts */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">At a glance</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">City</span>
                  <span className="text-right text-sm font-bold text-[#0b1f5c]">{city.City_Name}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Country</span>
                  <span className="text-right text-sm font-bold text-[#0b1f5c]">{country.Country_Name}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Category</span>
                  <span className="text-right text-sm font-bold text-[#0b1f5c]">{category.Category_Type}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">Reviews</span>
                  <span className="text-right text-sm font-bold text-[#0b1f5c]">{reviews.length}</span>
                </div>
              </div>
            </section>

            {/* Related destinations */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Keep exploring</p>
                  <h3 className="mt-1 text-lg font-black text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    More in {city.City_Name}
                  </h3>
                </div>
                <Icon name="arrow-right" size={17} className="text-slate-300" />
              </div>

              <div className="mt-4 space-y-2">
                {relatedDestinations
                  .filter((item) => item.Destination_ID !== destination.Destination_ID)
                  .slice(0, 5)
                  .map((item) => {
                    const itemImage = getPlaceImage(
                      item.Destination_Name,
                      item.Destination_ID,
                      category.Category_Type,
                      item.Destination_Image,
                    );
                    return (
                      <button
                        key={item.Destination_ID}
                        onClick={() => onOpenDestination(item)}
                        className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50"
                      >
                        <img
                          src={itemImage}
                          alt={item.Destination_Name}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#0b1f5c] group-hover:text-blue-700">{item.Destination_Name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{formatRating(Number(item.Rating || 0))} rating</p>
                        </div>
                        <Icon name="arrow-right" size={15} className="text-slate-300 transition group-hover:text-[#0b1f5c]" />
                      </button>
                    );
                  })}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
