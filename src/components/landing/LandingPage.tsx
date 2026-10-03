import { COUNTRIES } from "../../data/countries";
import { CITIES } from "../../data/cities";
import { DESTINATIONS } from "../../data/destinations";
import { REVIEWS } from "../../data/reviews";
import { getCityImage } from "../../data/cityImages";

type Props = {
  onLogin: () => void;
  onRegister: () => void;
};

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    className,
  };

  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if (name === "pin") return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3.5v3M17 3.5v3M3.5 9h17"/></svg>;
  if (name === "star") return <svg {...common}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9L12 3Z"/></svg>;
  if (name === "building") return <svg {...common}><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H15v18M15 8h4a1.5 1.5 0 0 1 1.5 1.5V21M8 7h3M8 11h3M8 15h3M8 19h3M17 12h1M17 16h1M2.5 21h19"/></svg>;
  if (name === "heart") return <svg {...common}><path d="M20.8 8.8c0 5.4-8.8 10.5-8.8 10.5S3.2 14.2 3.2 8.8A4.8 4.8 0 0 1 8 4c1.6 0 3.1.8 4 2 0.9-1.2 2.4-2 4-2a4.8 4.8 0 0 1 4.8 4.8Z"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
}

const featureCards = [
  {
    icon: "search",
    title: "Discover places",
    text: "Browse destinations, cities, restaurants, accommodations, landmarks, and more in one place.",
  },
  {
    icon: "star",
    title: "Read real reviews",
    text: "See traveler ratings and experiences before deciding where to go or what to visit.",
  },
  {
    icon: "calendar",
    title: "Plan your trips",
    text: "Save destinations into travel plans with your dates, budget, status, and notes.",
  },
  {
    icon: "heart",
    title: "Keep your history",
    text: "Your searches and saved plans stay connected to your account for a more personal experience.",
  },
  {
    icon: "building",
    title: "For business partners",
    text: "Register and manage your travel-related business information from your account.",
  },
  {
    icon: "pin",
    title: "Explore by city",
    text: "Move from country to city to specific places with a simple, focused browsing flow.",
  },
];

const showcase = [
  {
    eyebrow: "01 · DISCOVER",
    title: "Start with a place that interests you.",
    text: "Explore countries and cities, then narrow your search down to the places that matter to your trip.",
    icon: "search",
  },
  {
    eyebrow: "02 · COMPARE",
    title: "See the details before you go.",
    text: "Open a destination to see its description, location, contact details, operating hours, ratings, and traveler reviews.",
    icon: "star",
  },
  {
    eyebrow: "03 · PLAN",
    title: "Turn discoveries into a trip.",
    text: "Save a destination to a travel plan and keep the important trip details together in one place.",
    icon: "calendar",
  },
];

const reviewEntries = [
  ...Object.entries(REVIEWS).flatMap(([destinationId, reviews]) =>
    reviews.slice(0, 1).map((review) => ({ ...review, destinationId: Number(destinationId) }))
  ),
].slice(0, 8);

function ProductPreview({ variant }: { variant: 1 | 2 | 3 }) {
  const city = variant === 1 ? "Baguio City" : variant === 2 ? "Kyoto" : "Tokyo";
  const places = DESTINATIONS.filter((d) => d.Destination_Name).filter((d) =>
    variant === 1 ? d.City_ID === 1 : variant === 2 ? d.City_ID === 4 : d.City_ID === 5
  ).slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-25px_rgba(11,31,92,0.28)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0b1f5c] text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16"/></svg>
          </div>
          <span className="text-sm font-extrabold text-[#0b1f5c]">TRAVELMATE</span>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">Preview</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
        <div className="p-5 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Explore</p>
              <h3 className="mt-1 text-xl font-extrabold text-[#0b1f5c]">{city}</h3>
            </div>
            <div className="rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-500">5 categories</div>
          </div>

          <div className="mt-5 grid gap-3">
            {places.map((place) => (
              <div key={place.Destination_ID} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                <img src={place.Destination_Image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0b1f5c]">{place.Destination_Name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{place.Address}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-amber-400" fill="currentColor"><path d="m10 2 2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2-3.8-3.7 5.3-.8L10 2Z"/></svg>
                    {place.Rating.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden bg-[#e8eef9]">
          <img
            src={(places[0]?.Destination_Image) ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f5c]/50 via-[#0b1f5c]/10 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/40 bg-white/85 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b1f5c]/55">TRAVELMATE preview</p>
            <p className="mt-1 text-sm font-extrabold text-[#0b1f5c]">Explore {city} with less friction.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Discover places, read reviews, and build a trip from the destinations you find.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLogin, onRegister }: Props) {
  const cities = CITIES.slice(0, 5);
  const countries = COUNTRIES.slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1f5c] text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8.7"/><path d="M3.5 12h17M12 3.3c-4 4.4-4 13 0 17.4M12 3.3c4 4.4 4 13 0 17.4" strokeLinecap="round"/></svg>
            </div>
            <span className="text-base font-extrabold tracking-tight text-[#0b1f5c]">XPLO<span className="text-sky-400">HUB</span></span>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-500 md:flex">
            <a href="#features" className="transition hover:text-[#0b1f5c]">Features</a>
            <a href="#showcase" className="transition hover:text-[#0b1f5c]">How it works</a>
            <a href="#destinations" className="transition hover:text-[#0b1f5c]">Destinations</a>
            <a href="#reviews" className="transition hover:text-[#0b1f5c]">Reviews</a>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={onLogin} className="rounded-full px-4 py-2 text-sm font-semibold text-[#0b1f5c] transition hover:bg-slate-100">Log in</button>
            <button onClick={onRegister} className="rounded-full bg-[#0b1f5c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162d7a]">Sign up</button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_55%)]" />
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b1f5c] shadow-sm">
                Your travel, connected
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-[#0b1f5c] sm:text-5xl lg:text-6xl">
                Explore the world.<br />Plan it your way.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                TRAVELMATE brings destination discovery, traveler reviews, and trip planning together so your next journey starts with one simple place.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button onClick={onRegister} className="rounded-full bg-[#0b1f5c] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-[#162d7a]">Start exploring</button>
                <button onClick={onLogin} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">I already have an account</button>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-5xl sm:mt-16">
              <ProductPreview variant={1} />
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0b1f5c]" />
                A glimpse of the TRAVELMATE experience
              </div>
            </div>
          </div>
        </section>

        <section id="reviews" className="bg-slate-50 px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Traveler feedback</p>
              <h2 className="mt-3 text-3xl font-black text-[#0b1f5c] sm:text-4xl">What travelers are talking about</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">A review-first experience helps you see what other travelers discovered before you make a plan.</p>
            </div>

            <div className="mt-10 columns-1 gap-4 md:columns-2 xl:columns-4">
              {reviewEntries.map((review, index) => (
                <article key={`${review.Review_ID}-${review.destinationId}`} className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <img src={review.reviewer_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#0b1f5c]">{review.reviewer_name}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                        <Icon name="star" />
                        <span>{review.Rating}/5</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">“{review.Review_Comment}”</p>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Verified review · {index + 1}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Everything in one place</p>
              <h2 className="mt-3 text-3xl font-black text-[#0b1f5c] sm:text-4xl">The tools behind your next trip</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Designed around the features already available in TRAVELMATE — without making the interface feel complicated.</p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature) => (
                <article key={feature.title} className="group rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f5c]/8 text-[#0b1f5c]">
                    <div className="h-5 w-5"><Icon name={feature.icon} /></div>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-[#0b1f5c]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="showcase" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">How it works</p>
              <h2 className="mt-3 text-3xl font-black text-[#0b1f5c] sm:text-4xl">From discovery to itinerary</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">A scrollable product story inspired by modern travel apps — adapted to TRAVELMATE's actual features and data.</p>
            </div>

            <div className="mt-14 space-y-24 sm:space-y-28">
              {showcase.map((item, index) => (
                <div key={item.eyebrow} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="max-w-lg">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">{item.eyebrow}</p>
                    <h3 className="mt-3 text-3xl font-black leading-tight text-[#0b1f5c] sm:text-4xl">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-slate-500">{item.text}</p>
                    <button onClick={onRegister} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0b1f5c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#162d7a]">Try TRAVELMATE <span>→</span></button>
                  </div>
                  <div>
                    <ProductPreview variant={(index + 1) as 1 | 2 | 3} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="destinations" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Explore</p>
              <h2 className="mt-3 text-3xl font-black text-[#0b1f5c] sm:text-4xl">Places to get you started</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Our current discovery experience begins with countries and cities, then opens into the places inside them.</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {countries.map((country) => (
                <button key={country.Country_ID} onClick={onRegister} className="group relative h-72 overflow-hidden rounded-3xl text-left shadow-sm ring-1 ring-black/5">
                  <img src={country.Country_Image} alt={country.Country_Name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071231]/90 via-[#071231]/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">Country</p>
                    <h3 className="mt-1 text-xl font-extrabold">{country.Country_Name}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/70">{country.Country_Specialty}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {cities.map((city) => (
                <button key={city.City_ID} onClick={onRegister} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                  <img src={getCityImage(city)} alt={city.City_Name} className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="p-4">
                    <h3 className="text-sm font-extrabold text-[#0b1f5c]">{city.City_Name}</h3>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{city.City_Specialty}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 pt-10 sm:pb-32">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[#0b1f5c] px-6 py-14 text-center shadow-2xl shadow-blue-950/15 sm:px-10 sm:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200">Your next trip starts here</p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black text-white sm:text-4xl">Discover places. Save what matters. Build the trip.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/65">Create your account to unlock the full TRAVELMATE experience and keep your plans, history, reviews, and profile connected.</p>
            <button onClick={onRegister} className="mt-7 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0b1f5c] transition hover:bg-slate-100">Create your account</button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 px-5 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0b1f5c] text-white"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8.7"/><path d="M3.5 12h17M12 3.3c-4 4.4-4 13 0 17.4M12 3.3c4 4.4 4 13 0 17.4" strokeLinecap="round"/></svg></div>
              <span className="text-sm font-extrabold text-[#0b1f5c]">XPLO<span className="text-sky-400">HUB</span></span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-5 text-slate-400">A travel discovery and planning experience built for exploring places, learning from travelers, and organizing your next trip.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Explore</p>
            <a href="#destinations" className="mt-3 block text-sm text-slate-500 hover:text-[#0b1f5c]">Destinations</a>
            <a href="#reviews" className="mt-2 block text-sm text-slate-500 hover:text-[#0b1f5c]">Reviews</a>
            <a href="#features" className="mt-2 block text-sm text-slate-500 hover:text-[#0b1f5c]">Features</a>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Account</p>
            <button onClick={onLogin} className="mt-3 block text-sm text-slate-500 hover:text-[#0b1f5c]">Log in</button>
            <button onClick={onRegister} className="mt-2 block text-sm text-slate-500 hover:text-[#0b1f5c]">Sign up</button>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">TRAVELMATE</p>
            <p className="mt-3 text-xs leading-5 text-slate-400">Explore · Reviews · Travel Plans · Search History · Profile · Business Partners</p>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-slate-200 pt-5 text-[11px] text-slate-400">© 2026 TRAVELMATE · TravelMate</div>
      </footer>
    </div>
  );
}
