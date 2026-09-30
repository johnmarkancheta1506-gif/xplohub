/**
 * ============================================================================
 * TRAVELMATE — APPLICATION NOTES / DEVELOPMENT LOG
 * ============================================================================
 *
 * This App.tsx is the current Supabase-connected version of the TravelMate UI.
 *
 * WORK COMPLETED IN TODAY'S SESSION
 * ---------------------------------
 * 1. SEARCH HISTORY
 *    - Connected the Search History feature to the live MAIN Supabase database.
 *    - Added loading of the logged-in user's search history from SEARCH_HISTORY.
 *    - Added saving of searches when the user performs a search/filter action.
 *    - Search history is tied to the authenticated user's user_id, so users only
 *      see their own saved searches.
 *    - Keyword searches can resolve locations such as Baguio and Vigan.
 *    - Country, city, and category selections can be saved as search history.
 *    - Added the search_category field so the UI category (Restaurant,
 *      Accommodation, Convenience Store, Landmark, Tourist Destination) can be
 *      stored separately from the database's thematic CATEGORY records.
 *    - Added a Search History modal that displays previous searches and their
 *      location/category information.
 *    - Fixed the modal layout so it is rendered outside the fixed navbar and
 *      appears correctly as a full-screen overlay.
 *    - Added/used RLS policies so authenticated users can read and insert only
 *      their own SEARCH_HISTORY records.
 *    - Tested persistence by creating searches, refreshing the app, and
 *      confirming that previous searches still appear from Supabase.
 *
 * 2. TRAVEL PLANS
 *    - Travel Plans are connected to the live TRAVEL_PLAN table.
 *    - Implemented Create, Read, Update, and Delete operations through the UI.
 *    - Travel Plans are associated with the authenticated user.
 *    - Tested that edited/deleted plans are reflected in Supabase and remain
 *      correct after refreshing the application.
 *
 * 3. REVIEWS
 *    - Connected review creation and loading to the live REVIEW table and the
 *      category-specific review tables.
 *    - Supports Restaurant, Accommodation, Convenience Store, Landmark, and
 *      Tourist Destination reviews.
 *    - Implemented review Edit and Delete behavior with ownership checks.
 *    - Added/used RLS rules so users can modify only their own reviews.
 *    - Reviews persist after refresh and can be viewed by logged-out visitors.
 *
 * 4. AUTHENTICATION / SESSION
 *    - Supabase Auth is used for registration and login.
 *    - New Auth users are linked to USER_INFO through the database trigger.
 *    - Session restoration is handled with Supabase getSession/onAuthStateChange.
 *    - Sign Out uses supabase.auth.signOut() instead of only changing React state.
 *
 * 5. DATABASE CONNECTION
 *    - The application uses the MAIN Supabase project, not the old test_dB
 *      project.
 *    - Supabase data is loaded through src/config/supabaseClient.
 *    - The app uses the real database records for countries, cities,
 *      destinations, categories, reviews, travel plans, and search history.
 *
 * IMPORTANT DEVELOPMENT NOTE
 * ---------------------------
 * The numeric Category_ID values used by the frontend tabs (1–5) are a UI
 * category system. They must not be confused with the thematic CATEGORY table
 * values in Supabase (for example Nature, Religious, Recreational, Beach, and
 * HISTORICAL). Child tables such as RESTAURANT and LANDMARK determine the UI
 * category for destinations.
 *
 * CURRENT FEATURE STATUS
 * ----------------------
 * Supabase connection                 : DONE
 * Authentication / Login / Register   : DONE
 * Session persistence / Logout        : DONE
 * Travel Plans CRUD                   : DONE
 * Reviews CRUD                        : DONE
 * Public Review Reading               : DONE
 * Search History                      : DONE / TESTED
 * User Profile                        : NEXT
 * Business Partner features           : NEXT
 * Real rating aggregation             : NEXT
 * Mission 4 verification/validation   : LATER
 *
 * These comments are documentation only. They do not affect application logic.
 * ============================================================================
 */

import supabase from './config/supabaseClient'
import { useState, useRef, useCallback, useEffect } from "react";

console.log("APP.TSX LOADED")
console.log("SUPABASE FROM APP:", supabase)

type CategoryType = "Restaurant" | "Accommodation" | "Convenience Store" | "Landmark" | "Tourist Destination";

interface Category    { Category_ID: number; Category_Name: string; Category_Type: CategoryType; }
interface Country     { Country_ID: number; Country_Name: string; Country_Description: string; Country_Specialty: string; Country_Image: string; interactable: boolean; display_city_count?: number; }
interface City        { City_ID: number; Country_ID: number; Category_ID: number; City_Name: string; City_Description: string; City_Specialty: string; City_Image: string; }
interface Destination { Destination_ID: number; City_ID: string | number; Category_ID: number; Place_Type_ID?: number; Destination_Name: string; Destination_Description: string; Address: string; Contact_Number: string; Operating_Hours: string; Destination_Image: string; Rating: number; }
interface ReviewEntry { Review_ID: number; user_id?: string; reviewer_name: string; reviewer_avatar: string; Rating: number; Review_Comment: string; Review_Date: string; Review_Status: "Approved" | "Pending"; subtype_rating: number; subtype_feedback: string; }
interface TravelPlan  { TravelPlan_ID: number; Plan_Name: string; Start_Date: string; Number_of_Days: number; Budget: number; Travel_Status: "Planned" | "Ongoing" | "Completed"; Notes: string; destination_name: string; category_name: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const normId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';

  const str = String(id).trim().toLowerCase();

  const cleaned = str.replace(
    /^(ct|cat|city|category)[-_]?0*/i,
    ''
  );

  return cleaned || str;
};

const CATEGORIES: Category[] = [
  { Category_ID: 1, Category_Name: "Restaurants",          Category_Type: "Restaurant"          },
  { Category_ID: 2, Category_Name: "Accommodations",       Category_Type: "Accommodation"       },
  { Category_ID: 3, Category_Name: "Convenience Stores",   Category_Type: "Convenience Store"   },
  { Category_ID: 4, Category_Name: "Landmarks",            Category_Type: "Landmark"            },
  { Category_ID: 5, Category_Name: "Tourist Destinations", Category_Type: "Tourist Destination" },
];

const DB_TABLE: Record<CategoryType, string> = {
  "Restaurant":          "RESTAURANT",
  "Accommodation":       "ACCOMMODATIONS",
  "Convenience Store":   "CONVENIENCE_STORES",
  "Landmark":            "LANDMARK",
  "Tourist Destination": "TOURIST_DESTINATION",
};

const CAT_COLOR: Record<CategoryType, { card: string; badge: string }> = {
  "Restaurant":          { card: "bg-orange-600",  badge: "bg-orange-100 text-orange-700"  },
  "Accommodation":       { card: "bg-blue-600",    badge: "bg-blue-100 text-blue-700"      },
  "Convenience Store":   { card: "bg-green-600",   badge: "bg-green-100 text-green-700"    },
  "Landmark":            { card: "bg-violet-700",  badge: "bg-violet-100 text-violet-700"  },
  "Tourist Destination": { card: "bg-purple-700",  badge: "bg-purple-100 text-purple-700"  },
};

const CAT_ICON: Record<CategoryType, string> = {
  "Restaurant":          "🍽️",
  "Accommodation":       "🏨",
  "Convenience Store":   "🏪",
  "Landmark":            "🏛️",
  "Tourist Destination": "🗺️",
};

const FLAGS: Record<number, string> = { 1: "🇵🇭", 2: "🇯🇵", 3: "🇬🇷", 4: "🇮🇩", 5: "🇰🇷", 6: "🇹🇭", 7: "🇮🇹", 8: "🇫🇷", 9: "🇦🇺", 10: "🇺🇸" };

// ── Countries ─────────────────────────────────────────────────────────────────

const COUNTRIES: Country[] = [
  { Country_ID: 1,  Country_Name: "Philippines",  Country_Description: "An archipelago of 7,600+ islands — pristine beaches, colonial heritage, and world-class diving.",              Country_Specialty: "Island Hopping & Heritage", Country_Image: "https://images.unsplash.com/photo-1655748072817-1c97ad430ff1?w=800&h=500&fit=crop&auto=format",  interactable: true  },
  { Country_ID: 2,  Country_Name: "Japan",         Country_Description: "Ancient temples beside neon towers — a nation of breathtaking contrasts and obsessive craft.",                Country_Specialty: "Culture & Cuisine",         Country_Image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&h=500&fit=crop&auto=format",  interactable: true  },
  { Country_ID: 3,  Country_Name: "Greece",        Country_Description: "Volcanic islands, sun-bleached ruins, and sunsets that have inspired poets for three millennia.",              Country_Specialty: "Heritage & Islands",        Country_Image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 2 },
  { Country_ID: 4,  Country_Name: "Indonesia",     Country_Description: "The world's largest archipelago — a mosaic of cultures, temples, jungle, and turquoise sea.",                Country_Specialty: "Nature & Spirituality",     Country_Image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 1 },
  { Country_ID: 5,  Country_Name: "South Korea",   Country_Description: "K-pop, ancient palaces, hyper-modern cities, and street food markets that never close.",                    Country_Specialty: "Modern & Heritage",         Country_Image: "https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 2 },
  { Country_ID: 6,  Country_Name: "Thailand",      Country_Description: "Golden temples, electric street food, jungle waterfalls, and turquoise gulf islands.",                       Country_Specialty: "Temples & Beaches",         Country_Image: "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 3 },
  { Country_ID: 7,  Country_Name: "Italy",         Country_Description: "Renaissance art, Roman ruins, rolling Tuscan hills, and the planet's most beloved cuisine.",                Country_Specialty: "Art, Food & History",       Country_Image: "https://images.unsplash.com/photo-1476900164809-ff19b8ae5968?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 4 },
  { Country_ID: 8,  Country_Name: "France",        Country_Description: "Haute cuisine, Baroque châteaux, Mediterranean coastline, and the most visited city on Earth.",             Country_Specialty: "Culture & Gastronomy",      Country_Image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 3 },
  { Country_ID: 9,  Country_Name: "Australia",     Country_Description: "Outback red earth, Great Barrier Reef, world-class wine regions, and laid-back coastal cities.",            Country_Specialty: "Nature & Adventure",        Country_Image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 2 },
  { Country_ID: 10, Country_Name: "United States", Country_Description: "National parks of staggering scale, jazz-soaked cities, surf towns, and a coast-to-coast road trip culture.", Country_Specialty: "Landscapes & Cities",      Country_Image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&auto=format",  interactable: false, display_city_count: 4 },
];

// ── Cities ────────────────────────────────────────────────────────────────────

const CITIES: City[] = [
  { City_ID: 1, Country_ID: 1, Category_ID: 5, City_Name: "Baguio City", City_Description: "Highland city at 1,540 m, known for pine cover, cool climate and a compact walkable centre.",                       City_Specialty: "Mountain Retreat",      City_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 2, Country_ID: 1, Category_ID: 4, City_Name: "Vigan",       City_Description: "UNESCO-listed colonial town with cobblestone streets, ancestral houses, and horse-drawn kalesa.",                    City_Specialty: "Heritage & Colonial",    City_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 3, Country_ID: 1, Category_ID: 5, City_Name: "El Nido",     City_Description: "Dramatic limestone karsts and crystal lagoons — the crown jewel of Palawan.",                                        City_Specialty: "Island & Marine",        City_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 4, Country_ID: 2, Category_ID: 4, City_Name: "Kyoto",       City_Description: "Japan's ancient capital with 17 UNESCO World Heritage Sites and living geisha culture.",                              City_Specialty: "Temples & Tradition",   City_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 5, Country_ID: 2, Category_ID: 5, City_Name: "Tokyo",       City_Description: "Earth's most populous city — a seamless blend of ancient temples, neon districts, and Michelin-starred dining.",     City_Specialty: "Urban & Gastronomy",    City_Image: "https://images.unsplash.com/photo-1604928141064-207cea6f571f?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 6, Country_ID: 3, Category_ID: 5, City_Name: "Santorini",   City_Description: "Volcanic island with iconic whitewashed villages perched above a 300 m caldera.",                                    City_Specialty: "Island & Sunsets",      City_Image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 7, Country_ID: 3, Category_ID: 4, City_Name: "Athens",      City_Description: "Five thousand years of history anchored by the Acropolis — a vibrant modern city built on ancient foundations.",     City_Specialty: "Ancient Heritage",      City_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop&auto=format" },
  { City_ID: 8, Country_ID: 4, Category_ID: 5, City_Name: "Ubud",        City_Description: "Bali's cultural heart set among rice terraces and Hindu temple complexes.",                                           City_Specialty: "Culture & Wellness",    City_Image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&h=400&fit=crop&auto=format" },
];

// ── Destinations ──────────────────────────────────────────────────────────────
// Every city has: Restaurant (1), Accommodation (2), Convenience Store (3), Landmark (4), Tourist Destination (5)

const DESTINATIONS: Destination[] = [

  // ── Baguio City (1) ─────────────────────────────────────────────────────────
  { Destination_ID: 101, City_ID: 1, Category_ID: 1, Destination_Name: "Hill Station", Destination_Description: "Elegant heritage dining in a 1900s colonial building. Known for Filipino-European fusion and arguably the best coffee in Baguio.", Address: "Upper Session Rd., Baguio City", Contact_Number: "+63 74 424 2734", Operating_Hours: "9:00 AM – 10:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 102, City_ID: 1, Category_ID: 1, Destination_Name: "Oh My Gulay!", Destination_Description: "Artist-owned vegetarian restaurant with wild interiors covered in cascading plants, hanging installations, and upcycled art.", Address: "La Azotea Bldg., Session Rd., Baguio City", Contact_Number: "+63 74 442 3296", Operating_Hours: "10:00 AM – 9:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 103, City_ID: 1, Category_ID: 2, Destination_Name: "The Manor at Camp John Hay", Destination_Description: "Grand colonial hotel surrounded by pine forest inside Camp John Hay estate. Fireplaces in every room, impeccable service, and mountain views.", Address: "Camp John Hay, Baguio City", Contact_Number: "+63 74 424 0100", Operating_Hours: "Check-in 2:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 104, City_ID: 1, Category_ID: 2, Destination_Name: "Azalea Residences", Destination_Description: "Spacious apartment-style suites with full kitchens, warm wooden interiors, a garden pool, and sweeping mountain views.", Address: "Leonard Wood Rd., Baguio City", Contact_Number: "+63 74 446 9888", Operating_Hours: "Check-in 2:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 105, City_ID: 1, Category_ID: 3, Destination_Name: "Baguio Public Market", Destination_Description: "The city's soul — overflowing stalls of highland strawberries, woven Cordillera textiles, hand-carved woodwork, and ukay-ukay finds.", Address: "Magsaysay Ave., Baguio City", Contact_Number: "+63 74 442 5059", Operating_Hours: "5:00 AM – 8:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 106, City_ID: 1, Category_ID: 4, Destination_Name: "BenCab Museum", Destination_Description: "National Artist Benedicto Cabrera's museum in a stunning hilltop setting — his life's work alongside Filipino contemporary art, a café, and organic gardens.", Address: "Asin Rd., Tuba, Benguet", Contact_Number: "+63 74 442 7165", Operating_Hours: "9:00 AM – 6:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 107, City_ID: 1, Category_ID: 4, Destination_Name: "Mines View Park", Destination_Description: "Panoramic lookout over the ruins of the gold and copper mines of Itogon, with the full arc of the Cordillera peaks stretching into the distance.", Address: "Mines View Barangay, Baguio City", Contact_Number: "+63 74 442 3297", Operating_Hours: "7:00 AM – 7:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 108, City_ID: 1, Category_ID: 5, Destination_Name: "Burnham Park", Destination_Description: "A 32-hectare urban park at the heart of Baguio, built around a man-made lagoon. Iconic boat rides, a rose garden, and the city's main gathering space.", Address: "Jose Abad Santos Dr., Baguio City", Contact_Number: "+63 74 442 7014", Operating_Hours: "6:00 AM – 9:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 109, City_ID: 1, Category_ID: 5, Destination_Name: "Camp John Hay", Destination_Description: "A 677-hectare heritage estate with forest trails, a golf course, colonial-era architecture, and the freshest pine-scented air in the Philippines.", Address: "Camp John Hay, Baguio City", Contact_Number: "+63 74 424 0100", Operating_Hours: "Open 24 hours", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=380&fit=crop&auto=format" },

  // ── Vigan (2) ───────────────────────────────────────────────────────────────
  { Destination_ID: 201, City_ID: 2, Category_ID: 1, Destination_Name: "Café Leona", Destination_Description: "Vigan's most celebrated heritage restaurant inside a restored colonial house on Calle Crisologo. Famous for Ilocano bagnet, pinakbet, and empanada.", Address: "Calle Crisologo, Vigan City", Contact_Number: "+63 77 722 2952", Operating_Hours: "7:00 AM – 9:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 202, City_ID: 2, Category_ID: 1, Destination_Name: "Kusina ni Ineng", Destination_Description: "Beloved local canteen serving the most authentic Ilocano home cooking in the city — unpretentious, incredibly affordable, and always full of locals.", Address: "Quirino Blvd., Vigan City", Contact_Number: "+63 77 722 1823", Operating_Hours: "6:00 AM – 8:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 203, City_ID: 2, Category_ID: 2, Destination_Name: "Grandpa's Inn", Destination_Description: "A charming boutique hotel inside a 19th-century ancestral home. Stone walls, capiz shell windows, antique furniture — the most atmospheric stay in Vigan.", Address: "1 Bonifacio St., Vigan City", Contact_Number: "+63 77 722 2118", Operating_Hours: "Check-in 2:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 204, City_ID: 2, Category_ID: 2, Destination_Name: "Villa Angela Heritage House", Destination_Description: "A lovingly restored 1870s mansion turned boutique hotel with period furnishings, a beautiful garden courtyard, and a resident ghost (allegedly).", Address: "Quirino Blvd., Vigan City", Contact_Number: "+63 77 722 2914", Operating_Hours: "Check-in 2:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 205, City_ID: 2, Category_ID: 3, Destination_Name: "Plaza Salcedo Night Market", Destination_Description: "Every evening, Plaza Salcedo transforms into a vibrant street food market selling Vigan longganisa, okoy, empanada, and fresh Ilocos craft items.", Address: "Plaza Salcedo, Vigan City", Contact_Number: "+63 77 722 0001", Operating_Hours: "6:00 PM – 11:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 206, City_ID: 2, Category_ID: 4, Destination_Name: "Bantay Bell Tower", Destination_Description: "A 16th-century watchtower built separately from the church — historically used to spot incoming pirates. Climb it for panoramic views over the whole city.", Address: "Bantay, Ilocos Sur", Contact_Number: "+63 77 722 0002", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 207, City_ID: 2, Category_ID: 4, Destination_Name: "Calle Crisologo", Destination_Description: "The iconic UNESCO-listed cobblestone street lined with intact Spanish colonial ancestral houses. Best at dawn — mist rising and kalesa clip-clopping past.", Address: "Calle Crisologo, Vigan City", Contact_Number: "+63 77 722 0003", Operating_Hours: "Open 24 hours", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 208, City_ID: 2, Category_ID: 5, Destination_Name: "Syquia Mansion Museum", Destination_Description: "The ancestral home of President Elpidio Quirino, preserved as a museum with original furniture, personal effects, and fascinating Philippine presidential history.", Address: "Quirino Blvd., Vigan City", Contact_Number: "+63 77 722 2630", Operating_Hours: "8:30 AM – 5:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 209, City_ID: 2, Category_ID: 5, Destination_Name: "Burnay Pottery District", Destination_Description: "Watch artisans hand-craft traditional Ilocano earthenware pottery using foot-powered wheels and wood kilns — unchanged for over 400 years. Buy direct from the source.", Address: "Ribboc, Vigan City", Contact_Number: "+63 77 722 0004", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── El Nido (3) ─────────────────────────────────────────────────────────────
  { Destination_ID: 301, City_ID: 3, Category_ID: 1, Destination_Name: "Altrove Restaurant", Destination_Description: "The finest restaurant in El Nido — wood-fired Neapolitan pizza and hand-rolled pasta served in a romantic open-air setting steps from the beach.", Address: "Hama Street, El Nido Town, Palawan", Contact_Number: "+63 919 555 0003", Operating_Hours: "11:00 AM – 10:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 302, City_ID: 3, Category_ID: 1, Destination_Name: "Pawikan Restaurant", Destination_Description: "Right on the beachfront — order the tuna, whatever the freshest catch of the day is. Grilled over charcoal with garlic rice, it's the quintessential El Nido meal.", Address: "Hama St., El Nido Town, Palawan", Contact_Number: "+63 919 555 0010", Operating_Hours: "7:00 AM – 10:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 303, City_ID: 3, Category_ID: 2, Destination_Name: "Lio Beach Resort", Destination_Description: "An eco-resort set among coconut palms on pristine Lio Beach — overwater-style villas, a stunning infinity pool, and world-class snorkeling right off the shore.", Address: "Lio Tourism Estate, El Nido, Palawan", Contact_Number: "+63 919 555 0004", Operating_Hours: "Check-in 2:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 304, City_ID: 3, Category_ID: 2, Destination_Name: "El Nido Resorts Miniloc Island", Destination_Description: "The original El Nido luxury resort — accessible only by boat and built into the base of the karst cliffs. Unforgettable, wholly self-contained island experience.", Address: "Miniloc Island, El Nido, Palawan", Contact_Number: "+63 919 555 0011", Operating_Hours: "Check-in 2:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 305, City_ID: 3, Category_ID: 3, Destination_Name: "El Nido Supermart", Destination_Description: "The best-stocked convenience store in El Nido town — sunscreen, toiletries, snacks, bottled water, and SIM cards. Essential before any island tour.", Address: "Real St., El Nido Town, Palawan", Contact_Number: "+63 919 555 0005", Operating_Hours: "7:00 AM – 9:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 306, City_ID: 3, Category_ID: 4, Destination_Name: "Taraw Cliff", Destination_Description: "A challenging limestone cliff hike rewarding climbers with a 360° panoramic view over the entire El Nido bay, lagoons, and Bacuit Archipelago.", Address: "El Nido Town Proper, Palawan", Contact_Number: "+63 919 555 0005", Operating_Hours: "5:00 AM – 12:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 307, City_ID: 3, Category_ID: 4, Destination_Name: "Snake Island Sandbar", Destination_Description: "A sinuous white sandbar connecting two islands that appears and disappears with the tide — incredible aerial views from the hill above.", Address: "Palawan, El Nido", Contact_Number: "+63 919 555 0012", Operating_Hours: "Included in tour", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 308, City_ID: 3, Category_ID: 5, Destination_Name: "Big Lagoon", Destination_Description: "Kayak through a limestone gap into a vast emerald lagoon completely enclosed by 200 m karst walls — one of the most breathtaking natural spaces in Asia.", Address: "Miniloc Island, El Nido, Palawan", Contact_Number: "+63 919 555 0001", Operating_Hours: "6:00 AM – 5:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 309, City_ID: 3, Category_ID: 5, Destination_Name: "Nacpan Beach", Destination_Description: "Four kilometres of powder-soft golden sand fringed by coconut palms — the most beautiful beach on the main island, almost always crowd-free.", Address: "Nacpan, El Nido, Palawan", Contact_Number: "+63 919 555 0002", Operating_Hours: "Open 24 hours", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1655748072817-1c97ad430ff1?w=600&h=380&fit=crop&auto=format" },

  // ── Kyoto (4) ───────────────────────────────────────────────────────────────
  { Destination_ID: 401, City_ID: 4, Category_ID: 1, Destination_Name: "Nishiki Market", Destination_Description: "Kyoto's 400-year-old covered market — 100+ vendors selling pickled vegetables, fresh tofu, grilled seafood skewers, and matcha everything.", Address: "Nishiki-koji, Nakagyo Ward, Kyoto", Contact_Number: "+81 75 211 3882", Operating_Hours: "9:00 AM – 6:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 402, City_ID: 4, Category_ID: 1, Destination_Name: "Kikunoi Honten", Destination_Description: "Three Michelin-star kaiseki restaurant showcasing seasonal Kyoto cuisine. A once-in-a-lifetime meal — book months in advance and arrive hungry.", Address: "459 Shimokawara-cho, Higashiyama, Kyoto", Contact_Number: "+81 75 561 0015", Operating_Hours: "12:00 PM – 8:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 403, City_ID: 4, Category_ID: 2, Destination_Name: "Tawaraya Ryokan", Destination_Description: "Operating since 1709, Tawaraya is Kyoto's most storied inn. Traditional tatami rooms, garden views, in-room kaiseki breakfast, and legendary hospitality.", Address: "Fuyacho Aneyakoji, Nakagyo Ward, Kyoto", Contact_Number: "+81 75 211 5566", Operating_Hours: "Check-in 3:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 404, City_ID: 4, Category_ID: 2, Destination_Name: "The Ritz-Carlton Kyoto", Destination_Description: "A contemporary luxury hotel on the banks of the Kamogawa River, with stunning views of the Higashiyama mountains and a world-class Japanese spa.", Address: "Kamogawa Nijo-Ohashi Hotori, Nakagyo, Kyoto", Contact_Number: "+81 75 746 5555", Operating_Hours: "Check-in 3:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 405, City_ID: 4, Category_ID: 3, Destination_Name: "7-Eleven Gion-Shijo", Destination_Description: "Centrally located in the Gion district — stocked with onigiri, hot oden, coffee, and everything you need before a full day of temple hopping.", Address: "Shijo-dori, Higashiyama Ward, Kyoto", Contact_Number: "+81 75 531 4100", Operating_Hours: "Open 24 hours", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 406, City_ID: 4, Category_ID: 4, Destination_Name: "Fushimi Inari Shrine", Destination_Description: "Thousands of vermillion torii gates winding up Mt. Inari for 4 km through cedar forest — a sacred Shinto shrine and one of Japan's most photographed sites.", Address: "68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto", Contact_Number: "+81 75 641 7331", Operating_Hours: "Open 24 hours", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 407, City_ID: 4, Category_ID: 4, Destination_Name: "Kinkaku-ji (Golden Pavilion)", Destination_Description: "A Zen Buddhist temple with its top two floors completely covered in gold leaf, perfectly reflected in the surrounding mirror pond — one of Japan's most iconic sights.", Address: "1 Kinkakujicho, Kita Ward, Kyoto", Contact_Number: "+81 75 461 0013", Operating_Hours: "9:00 AM – 5:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 408, City_ID: 4, Category_ID: 5, Destination_Name: "Arashiyama Bamboo Grove", Destination_Description: "A short walk through towering Moso bamboo — the filtered morning light and rustling sound create an otherworldly atmosphere. Go before 8 AM for solitude.", Address: "Sagaogurayama Tabuchiyamacho, Ukyo Ward, Kyoto", Contact_Number: "+81 75 861 0012", Operating_Hours: "Always open", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 409, City_ID: 4, Category_ID: 5, Destination_Name: "Gion District", Destination_Description: "Kyoto's historic geisha district — wooden machiya townhouses, tea houses, and the chance to spot a real geiko or maiko hurrying between appointments at dusk.", Address: "Gion, Higashiyama Ward, Kyoto", Contact_Number: "+81 75 561 6155", Operating_Hours: "Always open", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },

  // ── Tokyo (5) ───────────────────────────────────────────────────────────────
  { Destination_ID: 501, City_ID: 5, Category_ID: 1, Destination_Name: "Ichiran Ramen", Destination_Description: "Individual dining booths, a secret ramen sauce customization form, and the best tonkotsu ramen in Tokyo. A legendary institution with no compromise.", Address: "1-22-7 Jinnan, Shibuya, Tokyo", Contact_Number: "+81 3 5458 5578", Operating_Hours: "Open 24 hours", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 502, City_ID: 5, Category_ID: 1, Destination_Name: "Tsukiji Outer Market", Destination_Description: "The outer market is paradise for early breakfast — fresh sushi at 6 AM, tamagoyaki hot off the pan, and the finest seafood in the world at street-stall prices.", Address: "4 Tsukiji, Chuo City, Tokyo", Contact_Number: "+81 3 3541 9444", Operating_Hours: "5:00 AM – 2:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 503, City_ID: 5, Category_ID: 2, Destination_Name: "Park Hyatt Tokyo", Destination_Description: "Legendary luxury hotel occupying floors 39–52 of the Shinjuku Park Tower. The New York Bar and its skyline views were immortalized in Lost in Translation.", Address: "3-7-1-2 Nishishinjuku, Shinjuku, Tokyo", Contact_Number: "+81 3 5322 1234", Operating_Hours: "Check-in 3:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 504, City_ID: 5, Category_ID: 2, Destination_Name: "Aman Tokyo", Destination_Description: "Forty-eight rooms occupying the top six floors of the Otemachi Tower — the most private and refined hotel in Tokyo, with a spa drawing water from a mountain spring.", Address: "1-5-6 Otemachi, Chiyoda, Tokyo", Contact_Number: "+81 3 5224 3333", Operating_Hours: "Check-in 3:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 505, City_ID: 5, Category_ID: 3, Destination_Name: "Lawson Shinjuku Station", Destination_Description: "Tokyo's best-loved convenience store chain — exceptional onigiri, hot foods, matcha drinks, umbrellas, and a reliable ATM that accepts foreign cards.", Address: "3-1-24 Shinjuku, Shinjuku City, Tokyo", Contact_Number: "+81 3 3226 5561", Operating_Hours: "Open 24 hours", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 506, City_ID: 5, Category_ID: 4, Destination_Name: "Senso-ji Temple", Destination_Description: "Tokyo's oldest and most beloved temple in Asakusa. The Nakamise shopping street leading to the Kaminarimon gate is 250 m of souvenir stalls and street snacks.", Address: "2-3-1 Asakusa, Taito City, Tokyo", Contact_Number: "+81 3 3842 0181", Operating_Hours: "6:00 AM – 5:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 507, City_ID: 5, Category_ID: 4, Destination_Name: "Shibuya Scramble Crossing", Destination_Description: "Up to 3,000 pedestrians cross simultaneously at the world's busiest intersection. Witness it from the Starbucks balcony or Mag's Park rooftop for the full effect.", Address: "2 Dogenzakacho, Shibuya City, Tokyo", Contact_Number: "+81 3 3461 2109", Operating_Hours: "Always open", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1604928141064-207cea6f571f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 508, City_ID: 5, Category_ID: 5, Destination_Name: "teamLab Borderless", Destination_Description: "A mind-bending immersive digital art museum where 50 interconnected artworks spill across rooms, floors, and ceilings. Genuinely unlike anything else on Earth.", Address: "6-2-1 Aomi, Koto City, Tokyo", Contact_Number: "+81 3 6406 3949", Operating_Hours: "10:00 AM – 7:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 509, City_ID: 5, Category_ID: 5, Destination_Name: "Shimokitazawa", Destination_Description: "Tokyo's bohemian neighbourhood — a labyrinth of vintage clothing shops, intimate live music venues, indie bookshops, and the city's best café culture.", Address: "Shimokitazawa, Setagaya City, Tokyo", Contact_Number: "+81 3 3413 0600", Operating_Hours: "Always open", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=600&h=380&fit=crop&auto=format" },

  // ── Santorini (6) ───────────────────────────────────────────────────────────
  { Destination_ID: 601, City_ID: 6, Category_ID: 1, Destination_Name: "Ammoudi Fish Taverna", Destination_Description: "Perched at the water's edge below Oia — descend 300 steps to eat freshly grilled octopus with local Assyrtiko wine as fishing boats bob around you.", Address: "Ammoudi Bay, Oia, Santorini", Contact_Number: "+30 22860 71230", Operating_Hours: "12:00 PM – 11:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 602, City_ID: 6, Category_ID: 1, Destination_Name: "Metaxi Mas", Destination_Description: "Hidden in the local village of Exo Gonia away from the tourist belt — the most authentic Greek meze on the island. Order the fava and the tomato fritters.", Address: "Exo Gonia, Santorini", Contact_Number: "+30 22860 31323", Operating_Hours: "1:00 PM – 11:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 603, City_ID: 6, Category_ID: 2, Destination_Name: "Canaves Oia Epitome", Destination_Description: "Ultra-luxury cliff-carved suites with private infinity pools overlooking the caldera. Each room is its own architectural statement suspended above the sea.", Address: "Oia, Santorini 847 02, Greece", Contact_Number: "+30 22860 71453", Operating_Hours: "Check-in 3:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 604, City_ID: 6, Category_ID: 2, Destination_Name: "Grace Hotel Santorini", Destination_Description: "A boutique cliff-side hotel in Imerovigli — lower key than Oia but with arguably better caldera views and a more intimate atmosphere.", Address: "Imerovigli, Santorini 847 00", Contact_Number: "+30 22860 20300", Operating_Hours: "Check-in 3:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 605, City_ID: 6, Category_ID: 3, Destination_Name: "AB Vassilopoulos Fira", Destination_Description: "The most practical supermarket in Fira — stocked with local wine, fresh produce, Greek snacks, and sunscreen. Perfect for self-catering villa stays.", Address: "25 Martiou, Fira, Santorini", Contact_Number: "+30 22860 23755", Operating_Hours: "8:00 AM – 10:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 606, City_ID: 6, Category_ID: 4, Destination_Name: "Akrotiri Archaeological Site", Destination_Description: "A Minoan Bronze Age city buried by the same eruption that created the caldera — sometimes called the 'Pompeii of the Aegean'. Remarkably well preserved.", Address: "Akrotiri, Santorini 847 00", Contact_Number: "+30 22860 81939", Operating_Hours: "8:00 AM – 8:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 607, City_ID: 6, Category_ID: 4, Destination_Name: "Ancient Thera", Destination_Description: "Ruins of an ancient city on the steep ridge of Mesa Vouno — Greek, Roman, and Byzantine remains at 369 m with spectacular views in every direction.", Address: "Mesa Vouno, Santorini", Contact_Number: "+30 22860 23217", Operating_Hours: "8:30 AM – 3:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 608, City_ID: 6, Category_ID: 5, Destination_Name: "Oia Village Sunset", Destination_Description: "Blue-domed churches and sugar-cube houses perched at Santorini's northern tip. Every evening hundreds gather at the castle ruins for one of the world's great sunsets.", Address: "Oia, Santorini 847 02, Greece", Contact_Number: "+30 22860 71234", Operating_Hours: "Open 24 hours", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 609, City_ID: 6, Category_ID: 5, Destination_Name: "Caldera Boat Tour", Destination_Description: "Sail around the volcanic caldera, swim in the geothermal hot springs near the active Nea Kameni volcano, and anchor at the dramatic Red and White beaches.", Address: "Old Port, Fira, Santorini", Contact_Number: "+30 22860 22888", Operating_Hours: "9:00 AM – 7:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Athens (7) ──────────────────────────────────────────────────────────────
  { Destination_ID: 701, City_ID: 7, Category_ID: 1, Destination_Name: "Tzitzikas kai Mermingas", Destination_Description: "A beloved meze taverna in the heart of Athens serving creative takes on Greek classics — generous portions, buzzing atmosphere, and great value.", Address: "Mitropoleos 12-14, Athens 10563", Contact_Number: "+30 21 0324 7607", Operating_Hours: "12:00 PM – 12:00 AM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 702, City_ID: 7, Category_ID: 1, Destination_Name: "Varoulko Seaside", Destination_Description: "One Michelin-star seafood restaurant by acclaimed chef Lefteris Lazarou. Innovative modern Greek cuisine in a stunning waterfront setting in Mikrolimano.", Address: "Akti Koumoundourou 52, Piraeus", Contact_Number: "+30 21 0522 8400", Operating_Hours: "1:00 PM – 11:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 703, City_ID: 7, Category_ID: 2, Destination_Name: "Hotel Grande Bretagne", Destination_Description: "Athens' most iconic hotel since 1874 — situated on Syntagma Square directly facing the Greek Parliament. Grand neoclassical interiors and a legendary rooftop restaurant.", Address: "Vasileos Georgiou A' 1, Syntagma, Athens", Contact_Number: "+30 21 0333 0000", Operating_Hours: "Check-in 3:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 704, City_ID: 7, Category_ID: 2, Destination_Name: "Electra Metropolis Athens", Destination_Description: "A sleek contemporary hotel in the heart of Monastiraki with a rooftop pool offering the most dramatic up-close view of the Acropolis in the city.", Address: "15 Mitropoleos St., Athens 10557", Contact_Number: "+30 21 0191 5000", Operating_Hours: "Check-in 3:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 705, City_ID: 7, Category_ID: 3, Destination_Name: "AB Food & More Monastiraki", Destination_Description: "The most central supermarket in Athens — local olives, cheese, wine, snacks, and all daily essentials. Essential for self-catering apartments in the old town.", Address: "Monastiraki Sq., Athens 10555", Contact_Number: "+30 21 0321 4900", Operating_Hours: "7:00 AM – 10:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 706, City_ID: 7, Category_ID: 4, Destination_Name: "Acropolis & Parthenon", Destination_Description: "The most important monument in the western world — a 2,500-year-old hilltop citadel crowned by the Parthenon, visible from almost every point in Athens.", Address: "Acropolis, Athens 117 42", Contact_Number: "+30 21 0321 4172", Operating_Hours: "8:00 AM – 8:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 707, City_ID: 7, Category_ID: 4, Destination_Name: "Temple of Hephaestus", Destination_Description: "The best-preserved ancient Greek temple in the world — a magnificent Doric temple overlooking the Agora, standing virtually intact for 2,500 years.", Address: "Adrianou, Athens 105 55", Contact_Number: "+30 21 0321 0185", Operating_Hours: "8:00 AM – 8:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 708, City_ID: 7, Category_ID: 5, Destination_Name: "Plaka District", Destination_Description: "The oldest neighbourhood in Athens — a labyrinth of neoclassical houses, bougainvillea-draped alleys, souvenir shops, and tavernas at the foot of the Acropolis.", Address: "Plaka, Athens 105 55", Contact_Number: "+30 21 0322 0872", Operating_Hours: "Always open", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 709, City_ID: 7, Category_ID: 5, Destination_Name: "National Archaeological Museum", Destination_Description: "The greatest collection of ancient Greek art in existence — 11,000 artifacts spanning prehistoric times to late antiquity, including the gold Mask of Agamemnon.", Address: "44 Patision St., Athens 106 82", Contact_Number: "+30 21 3214 4800", Operating_Hours: "9:00 AM – 4:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },

  // ── Ubud (8) ────────────────────────────────────────────────────────────────
  { Destination_ID: 801, City_ID: 8, Category_ID: 1, Destination_Name: "Locavore", Destination_Description: "Ubud's landmark fine-dining restaurant — hyper-local Indonesian ingredients transformed into a 7-course tasting menu that redefines what Indonesian cuisine can be.", Address: "Jl. Dewisita No.10, Ubud, Bali", Contact_Number: "+62 361 977 733", Operating_Hours: "12:00 PM – 10:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 802, City_ID: 8, Category_ID: 1, Destination_Name: "Warung Babi Guling Ibu Oka", Destination_Description: "Made globally famous by Anthony Bourdain — the most celebrated suckling pig warung in Bali. Queue from 11 AM; it sells out by 2 PM without exception.", Address: "Jl. Suweta No.2, Ubud, Bali", Contact_Number: "+62 361 976 345", Operating_Hours: "11:00 AM – 3:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 803, City_ID: 8, Category_ID: 2, Destination_Name: "COMO Shambhala Estate", Destination_Description: "A world-class wellness retreat in the jungle above the Ayung River — Ayurvedic treatments, raw food cuisine, yoga pavilions, and absolute seclusion.", Address: "Banjar Begawan, Payangan, Ubud, Bali", Contact_Number: "+62 361 978 888", Operating_Hours: "Check-in 3:00 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 804, City_ID: 8, Category_ID: 2, Destination_Name: "Komaneka at Bisma", Destination_Description: "A hilltop boutique resort with dramatic Campuan ridge and rice terrace views, an infinity pool that seems to float above the jungle, and impeccable Balinese service.", Address: "Jl. Bisma, Ubud, Bali", Contact_Number: "+62 361 971 933", Operating_Hours: "Check-in 2:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 805, City_ID: 8, Category_ID: 3, Destination_Name: "Circle K Ubud Centre", Destination_Description: "The most central convenience store in Ubud — snacks, bottled water, SIM cards, toiletries, and basic medication. Open around the clock.", Address: "Jl. Raya Ubud No.5, Ubud, Bali", Contact_Number: "+62 361 977 001", Operating_Hours: "Open 24 hours", Rating: 4.1, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 806, City_ID: 8, Category_ID: 4, Destination_Name: "Tirta Empul Temple", Destination_Description: "A sacred Hindu water temple where Balinese Hindus perform melukat — ritual purification by immersion in the holy spring pools. Profoundly moving to witness and participate in.", Address: "Jl. Tirta, Tampaksiring, Gianyar, Bali", Contact_Number: "+62 361 901 3456", Operating_Hours: "8:00 AM – 6:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1711609110590-5ad5c4599e56?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 807, City_ID: 8, Category_ID: 4, Destination_Name: "Ubud Royal Palace", Destination_Description: "The official residence of the royal family of Ubud — traditional Balinese architecture, intricate stone carvings, and nightly Kecak dance performances in the courtyard.", Address: "Jl. Raya Ubud, Ubud, Bali", Contact_Number: "+62 361 975 057", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 808, City_ID: 8, Category_ID: 5, Destination_Name: "Tegallalang Rice Terraces", Destination_Description: "Centuries-old UNESCO-recognized subak irrigation system carved into the hillside — the most photographed landscape in all of Bali, best in morning golden light.", Address: "Tegallalang Village, Gianyar Regency, Bali", Contact_Number: "+62 361 901 2345", Operating_Hours: "6:00 AM – 6:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 809, City_ID: 8, Category_ID: 5, Destination_Name: "Sacred Monkey Forest", Destination_Description: "A nature reserve and Hindu temple complex home to 700+ Balinese long-tailed macaques living among ancient temples and giant strangler figs. Magical and a little chaotic.", Address: "Jl. Monkey Forest, Ubud, Bali", Contact_Number: "+62 361 971 304", Operating_Hours: "9:00 AM – 6:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Baguio City extras ───────────────────────────────────────────────────────
  { Destination_ID: 110, City_ID: 1, Category_ID: 1, Destination_Name: "Café by the Ruins", Destination_Description: "Beloved Baguio institution built around the ruins of a WWII-era mansion. Serves hearty Filipino breakfast, local rice wine, and the best pinikpikan in the city.", Address: "25 Chuntug St., Baguio City", Contact_Number: "+63 74 442 4010", Operating_Hours: "7:00 AM – 9:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 111, City_ID: 1, Category_ID: 1, Destination_Name: "Forest House Baguio", Destination_Description: "A forest-themed café and restaurant hidden among pine trees. Specialises in all-day breakfast, pasta, and house-made pesto using Cordillera herbs.", Address: "Dominican Hill Rd., Baguio City", Contact_Number: "+63 74 661 1234", Operating_Hours: "8:00 AM – 9:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 112, City_ID: 1, Category_ID: 2, Destination_Name: "Forest Lodge at Camp John Hay", Destination_Description: "Contemporary lodge units scattered through pine forest on the Camp John Hay estate. Full kitchenettes, stone fireplaces, and crisp mountain air.", Address: "Camp John Hay, Baguio City", Contact_Number: "+63 74 424 0100", Operating_Hours: "Check-in 2:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 113, City_ID: 1, Category_ID: 2, Destination_Name: "Hotel Veniz Burnham", Destination_Description: "Friendly mid-range hotel a block from Burnham Park. Clean rooms, free breakfast, and an incredibly central location for exploring Session Road on foot.", Address: "9 Calderon St., Baguio City", Contact_Number: "+63 74 442 5826", Operating_Hours: "Check-in 2:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 114, City_ID: 1, Category_ID: 3, Destination_Name: "SM City Baguio Supermarket", Destination_Description: "Full-service supermarket inside SM City — the widest selection of local Cordillera products, produce, and imported goods in the city.", Address: "SM City Baguio, Luneta Hill, Baguio City", Contact_Number: "+63 74 424 4002", Operating_Hours: "10:00 AM – 9:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 115, City_ID: 1, Category_ID: 3, Destination_Name: "7-Eleven Session Road", Destination_Description: "Centrally located on Session Road — slurpees, hot food, coffee, and all the snacks you need before heading up to Mines View or Camp John Hay.", Address: "Session Rd., Baguio City", Contact_Number: "+63 74 424 3000", Operating_Hours: "Open 24 hours", Rating: 4.1, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 116, City_ID: 1, Category_ID: 4, Destination_Name: "The Mansion", Destination_Description: "The official summer residence of the Philippine President — a grand colonial-era mansion with ornate iron gates that is one of Baguio's most photographed landmarks.", Address: "Upper Session Rd., Baguio City", Contact_Number: "+63 74 442 5621", Operating_Hours: "7:00 AM – 6:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 117, City_ID: 1, Category_ID: 4, Destination_Name: "Botanical Garden", Destination_Description: "A relaxed public garden showcasing native Cordillera flora, indigenous village displays, and the famous native orchid collection. Peaceful on weekday mornings.", Address: "Leonard Wood Rd., Baguio City", Contact_Number: "+63 74 442 8888", Operating_Hours: "7:00 AM – 6:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 118, City_ID: 1, Category_ID: 5, Destination_Name: "Strawberry Farm La Trinidad", Destination_Description: "Pick-your-own strawberry fields in the valley below Baguio — the most visited agri-tourism destination in the Cordilleras, best from December to May.", Address: "La Trinidad, Benguet", Contact_Number: "+63 74 422 2360", Operating_Hours: "6:00 AM – 6:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 119, City_ID: 1, Category_ID: 5, Destination_Name: "Wright Park & The Mansion", Destination_Description: "A scenic park where you can rent ponies for a leisurely ride through pine-shaded paths. The Pool of Pines reflecting pool is perfect for early-morning photography.", Address: "Wright Park, Baguio City", Contact_Number: "+63 74 442 8000", Operating_Hours: "6:00 AM – 8:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Vigan extras ────────────────────────────────────────────────────────────
  { Destination_ID: 210, City_ID: 2, Category_ID: 1, Destination_Name: "Salsa Kitchen", Destination_Description: "The best international restaurant in Vigan — fresh pasta, wood-fired pizza, and creative cocktails in a beautifully restored heritage house on Calle Crisologo.", Address: "Calle Crisologo, Vigan City", Contact_Number: "+63 77 722 2960", Operating_Hours: "11:00 AM – 10:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 211, City_ID: 2, Category_ID: 1, Destination_Name: "Cordillera Restaurant", Destination_Description: "Heritage hotel dining room inside the Cordillera Inn serving Ilocano-Filipino specialties — a dependable choice for empanada, dinengdeng, and longganisa platters.", Address: "29 Mena Crisologo St., Vigan City", Contact_Number: "+63 77 722 2727", Operating_Hours: "7:00 AM – 9:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 212, City_ID: 2, Category_ID: 2, Destination_Name: "Hotel Felicidad", Destination_Description: "A colonial mansion converted into a charming boutique hotel steps from the heritage zone. Stone walls, four-poster beds, and a tranquil courtyard with fountain.", Address: "1 Florentino St., Vigan City", Contact_Number: "+63 77 722 2593", Operating_Hours: "Check-in 2:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 213, City_ID: 2, Category_ID: 2, Destination_Name: "Vigan Plaza Hotel", Destination_Description: "Modern comforts inside a heritage-style building overlooking Plaza Salcedo. Rooftop views of the bell tower and excellent value for money.", Address: "Plaza Salcedo, Vigan City", Contact_Number: "+63 77 722 8888", Operating_Hours: "Check-in 2:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 214, City_ID: 2, Category_ID: 3, Destination_Name: "Vigan City Market", Destination_Description: "The bustling local market where residents shop daily — fresh produce, dried fish, Vigan longganisa, and native kakanin at the most honest prices in the city.", Address: "Quezon Ave., Vigan City", Contact_Number: "+63 77 722 0010", Operating_Hours: "5:00 AM – 7:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 215, City_ID: 2, Category_ID: 3, Destination_Name: "Laoag-Vigan Mini Stop", Destination_Description: "Reliable convenience chain with a central Vigan location — pick up bottled water, snacks, and cold drinks before a long kalesa ride around the heritage streets.", Address: "Quezon Blvd., Vigan City", Contact_Number: "+63 77 722 0011", Operating_Hours: "6:00 AM – 11:00 PM", Rating: 4.0, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 216, City_ID: 2, Category_ID: 4, Destination_Name: "St. Paul's Metropolitan Cathedral", Destination_Description: "A massive 16th-century earthquake Baroque church — one of the oldest standing churches in the Philippines and anchor of Vigan's UNESCO-listed heritage zone.", Address: "Burgos St., Vigan City", Contact_Number: "+63 77 722 2205", Operating_Hours: "6:00 AM – 6:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 217, City_ID: 2, Category_ID: 4, Destination_Name: "Vigan Heritage Village Museum", Destination_Description: "Interactive museum showcasing Ilocano history, weaving traditions, and the story of Vigan's Spanish colonial period through artifacts, dioramas, and restored interiors.", Address: "Calle Crisologo, Vigan City", Contact_Number: "+63 77 722 1234", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 218, City_ID: 2, Category_ID: 5, Destination_Name: "Pagburnayan (Pottery Kilns)", Destination_Description: "Watch traditional Ilocano potters shape burnay clay using foot-powered wheels and fire them in wood-burning kilns unchanged for 400 years — an extraordinary living craft.", Address: "Camangaan, Vigan City", Contact_Number: "+63 77 722 0012", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 219, City_ID: 2, Category_ID: 5, Destination_Name: "Plaza Burgos Night Market", Destination_Description: "Vigan's secondary evening market — less touristy than Salcedo, packed with locals eating freshly grilled isaw, fishball, and Ilocos empanada straight from the pan.", Address: "Plaza Burgos, Vigan City", Contact_Number: "+63 77 722 0013", Operating_Hours: "5:00 PM – 11:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── El Nido extras ───────────────────────────────────────────────────────────
  { Destination_ID: 310, City_ID: 3, Category_ID: 1, Destination_Name: "The Happy Kitchen", Destination_Description: "A small but exceptional restaurant near the beach serving creative Filipino fusion — the kare-kare pizza and mango shrimp tacos are El Nido's best kept secret.", Address: "Hama St., El Nido, Palawan", Contact_Number: "+63 917 555 1001", Operating_Hours: "11:00 AM – 10:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 311, City_ID: 3, Category_ID: 1, Destination_Name: "Trattoria Altrove", Destination_Description: "Rustic Italian kitchen steps from the water — thin-crust pizza from a wood-fired oven and fresh pasta that draws returning visitors every single trip to El Nido.", Address: "Real St., El Nido, Palawan", Contact_Number: "+63 917 555 1002", Operating_Hours: "12:00 PM – 10:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 312, City_ID: 3, Category_ID: 2, Destination_Name: "Pangulasian Island Resort", Destination_Description: "A private island resort accessible only by speedboat — overwater villas, a house reef for snorkelling at sunrise, and some of the most dramatic views in Bacuit Bay.", Address: "Pangulasian Island, El Nido, Palawan", Contact_Number: "+63 917 555 1003", Operating_Hours: "Check-in 2:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 313, City_ID: 3, Category_ID: 2, Destination_Name: "Cadlao Resort", Destination_Description: "A beachfront boutique resort on Cadlao Island with stilted bamboo cottages over crystal water, a dedicated snorkel reef, and nightly bonfires on the beach.", Address: "Cadlao Island, El Nido, Palawan", Contact_Number: "+63 917 555 1004", Operating_Hours: "Check-in 2:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 314, City_ID: 3, Category_ID: 3, Destination_Name: "El Nido Boutique Store", Destination_Description: "The best-stocked general store in town for island essentials — reef-safe sunscreen, dry bags, snorkels, and a surprisingly good selection of local Palawan honey.", Address: "Real St., El Nido Town, Palawan", Contact_Number: "+63 917 555 1005", Operating_Hours: "7:00 AM – 9:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 315, City_ID: 3, Category_ID: 3, Destination_Name: "Spin Laundry & Mart", Destination_Description: "A handy combination laundry and mini-mart popular with backpackers — pick up toiletries, instant noodles, cold drinks, and drop your clothes off for same-day washing.", Address: "Hama St., El Nido Town, Palawan", Contact_Number: "+63 917 555 1006", Operating_Hours: "7:00 AM – 8:00 PM", Rating: 4.0, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 316, City_ID: 3, Category_ID: 4, Destination_Name: "Cadlao Lagoon", Destination_Description: "A sheltered lagoon on the base of Cadlao Island — swim through a limestone gap into glassy green water ringed by overhanging jungle. One of Tour C's highlights.", Address: "Cadlao Island, El Nido, Palawan", Contact_Number: "+63 917 555 1007", Operating_Hours: "6:00 AM – 5:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 317, City_ID: 3, Category_ID: 4, Destination_Name: "Helicopter Island", Destination_Description: "Named for its silhouette from the air — a stunning sandbar and reef in the shape of a helicopter. Crystal water, vibrant coral, and reliably calm conditions.", Address: "Helicopter Island, El Nido, Palawan", Contact_Number: "+63 917 555 1008", Operating_Hours: "Tour dependent", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 318, City_ID: 3, Category_ID: 5, Destination_Name: "Seven Commandos Beach", Destination_Description: "A stunning stretch of white sand with excellent snorkelling just offshore and a small beach bar. One of the finest beaches on Tour A — arrive before the 10 AM tour rush.", Address: "Seven Commandos, El Nido, Palawan", Contact_Number: "+63 917 555 1009", Operating_Hours: "6:00 AM – 5:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1655748072817-1c97ad430ff1?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 319, City_ID: 3, Category_ID: 5, Destination_Name: "Hidden Beach", Destination_Description: "Accessible only through a crack in a limestone cliff — a hidden crescent of white sand and ultra-clear turquoise water with almost no tourists most of the day.", Address: "Matinloc Island, El Nido, Palawan", Contact_Number: "+63 917 555 1010", Operating_Hours: "Tour dependent", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Kyoto extras ─────────────────────────────────────────────────────────────
  { Destination_ID: 410, City_ID: 4, Category_ID: 1, Destination_Name: "Ippudo Kyoto", Destination_Description: "Japan's most celebrated ramen chain — creamy Hakata-style tonkotsu broth with thin noodles. The Kyoto branch is reliably excellent and far less crowded than Tokyo locations.", Address: "31-1 Ebisugawa-cho, Nakagyo, Kyoto", Contact_Number: "+81 75 221 0088", Operating_Hours: "11:00 AM – 10:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 411, City_ID: 4, Category_ID: 1, Destination_Name: "Tofu-ya Ukai", Destination_Description: "An exquisite kaiseki restaurant in a converted mill with stream-side garden seating. The cold tofu appetiser alone is worth the reservation — booked weeks in advance.", Address: "Higashiyama-ku, Kyoto", Contact_Number: "+81 75 541 0680", Operating_Hours: "11:30 AM – 9:30 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 412, City_ID: 4, Category_ID: 2, Destination_Name: "Kyoto Brighton Hotel", Destination_Description: "A refined luxury hotel steps from Nijo Castle. Impeccable Japanese service, a breakfast that rivals any in the city, and tranquil garden views from every room.", Address: "Nakadachiuri Agaru, Shinmachi-dori, Kyoto", Contact_Number: "+81 75 441 4411", Operating_Hours: "Check-in 3:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 413, City_ID: 4, Category_ID: 2, Destination_Name: "Piece Hostel Kyoto", Destination_Description: "The best-designed hostel in the city — stylish private pods, spotless social areas, excellent free breakfast, and a location 5 minutes from Karasuma subway.", Address: "21 Higashikujo Minami-Sannocho, Minami, Kyoto", Contact_Number: "+81 75 671 2100", Operating_Hours: "Check-in 3:00 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 414, City_ID: 4, Category_ID: 3, Destination_Name: "FamilyMart Shijo-Kawaramachi", Destination_Description: "Perfectly placed at Kyoto's busiest intersection — onigiri, hot oden, matcha soft serve, and the best packaged sandwiches in the convenience store universe.", Address: "Shijo-Kawaramachi, Shimogyo-ku, Kyoto", Contact_Number: "+81 75 222 5151", Operating_Hours: "Open 24 hours", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 415, City_ID: 4, Category_ID: 3, Destination_Name: "Lawson Gion Shijo", Destination_Description: "A Lawson convenience store in the heart of Gion — pick up chilled Yebisu beer, onsigiri, and a hot coffee before your evening stroll through the lantern-lit streets.", Address: "Gion, Higashiyama-ku, Kyoto", Contact_Number: "+81 75 531 7100", Operating_Hours: "Open 24 hours", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 416, City_ID: 4, Category_ID: 4, Destination_Name: "Ryoan-ji Temple & Rock Garden", Destination_Description: "The most famous Zen rock garden in Japan — 15 stones arranged so that no matter where you stand, one is always hidden. Meditative, minimal, and unforgettable.", Address: "13 Ryoanji Goryonoshitacho, Ukyo-ku, Kyoto", Contact_Number: "+81 75 463 2216", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 417, City_ID: 4, Category_ID: 4, Destination_Name: "Nijo Castle", Destination_Description: "A 17th-century shogun palace with nightingale floors that chirp at every footstep — a security feature turned architectural wonder. Beautiful garden ringed by stone walls.", Address: "541 Nijo-jo, Nakagyo-ku, Kyoto", Contact_Number: "+81 75 841 0096", Operating_Hours: "8:45 AM – 5:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 418, City_ID: 4, Category_ID: 5, Destination_Name: "Philosopher's Path", Destination_Description: "A 2 km stone-paved canal walk lined with hundreds of cherry trees. Serene on weekday mornings, spectacular in full bloom, and home to hidden temples and cafes.", Address: "Tetsugaku no Michi, Sakyo-ku, Kyoto", Contact_Number: "+81 75 761 1234", Operating_Hours: "Always open", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 419, City_ID: 4, Category_ID: 5, Destination_Name: "Nishiki Market Stroll", Destination_Description: "Five blocks of Kyoto's freshest street food — sample pickled plum onigiri, grilled skewers of tuna, matcha mochi, and fresh yuba straight from the vendor.", Address: "Nishiki-koji, Nakagyo-ku, Kyoto", Contact_Number: "+81 75 211 3882", Operating_Hours: "9:00 AM – 6:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },

  // ── Tokyo extras ─────────────────────────────────────────────────────────────
  { Destination_ID: 510, City_ID: 5, Category_ID: 1, Destination_Name: "Sukiyabashi Jiro", Destination_Description: "Three Michelin stars — the most famous sushi counter in the world, immortalised in Jiro Dreams of Sushi. Omakase starts at ¥40,000. Book months ahead through your hotel concierge.", Address: "4-2-15 Ginza, Chuo City, Tokyo", Contact_Number: "+81 3 3535 3600", Operating_Hours: "11:30 AM – 2:00 PM, 5:30 PM – 8:30 PM", Rating: 5.0, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 511, City_ID: 5, Category_ID: 1, Destination_Name: "Afuri Ramen Harajuku", Destination_Description: "Tokyo's most celebrated yuzu shio ramen — a delicate, citrus-bright broth utterly unlike the heavy tonkotsu style. The signature dish here is a masterpiece of lightness.", Address: "3-63-1 Sendagaya, Shibuya, Tokyo", Contact_Number: "+81 3 6438 1910", Operating_Hours: "11:00 AM – 11:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 512, City_ID: 5, Category_ID: 2, Destination_Name: "Cerulean Tower Tokyu Hotel", Destination_Description: "A skyscraper hotel with sweeping Shibuya and Mt. Fuji views. The jazz lounge on the 40th floor is one of Tokyo's finest places to spend an evening.", Address: "26-1 Sakuragaokacho, Shibuya, Tokyo", Contact_Number: "+81 3 3476 3000", Operating_Hours: "Check-in 3:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 513, City_ID: 5, Category_ID: 2, Destination_Name: "Khaosan Tokyo Kabuki Hostel", Destination_Description: "A well-designed hostel in a traditional wooden Asakusa machiya — private rooms and dorms, rooftop terrace, and the atmosphere of old Tokyo just outside the front door.", Address: "2-16-2 Asakusa, Taito City, Tokyo", Contact_Number: "+81 3 5830 4671", Operating_Hours: "Check-in 3:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 514, City_ID: 5, Category_ID: 3, Destination_Name: "FamilyMart Akihabara", Destination_Description: "Convenience store in the heart of Akihabara — perfect for anime snacks, energy drinks, and all the practical essentials before a deep dive into the electronic district.", Address: "1-15-7 Sotokanda, Chiyoda City, Tokyo", Contact_Number: "+81 3 3257 4600", Operating_Hours: "Open 24 hours", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 515, City_ID: 5, Category_ID: 3, Destination_Name: "7-Eleven Shinjuku Station", Destination_Description: "The gold standard of Tokyo convenience stores — hot foods that rival restaurant quality, ATM that takes foreign cards, and everything imaginable in one compact space.", Address: "3-1 Nishishinjuku, Shinjuku City, Tokyo", Contact_Number: "+81 3 3342 1000", Operating_Hours: "Open 24 hours", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 516, City_ID: 5, Category_ID: 4, Destination_Name: "Meiji Jingu Shrine", Destination_Description: "A vast forested Shinto shrine in the heart of the city dedicated to Emperor Meiji — 70 hectares of woodland, towering wooden torii gates, and profound serenity.", Address: "1-1 Yoyogikamizonocho, Shibuya, Tokyo", Contact_Number: "+81 3 3379 5511", Operating_Hours: "Sunrise to sunset", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 517, City_ID: 5, Category_ID: 4, Destination_Name: "Tokyo Skytree", Destination_Description: "The world's tallest broadcast tower at 634 m — two observation decks offering panoramic views of the entire Kanto region on clear days, with a view all the way to Mt. Fuji.", Address: "1-1-2 Oshiage, Sumida City, Tokyo", Contact_Number: "+81 570 550 634", Operating_Hours: "10:00 AM – 9:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1604928141064-207cea6f571f?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 518, City_ID: 5, Category_ID: 5, Destination_Name: "Harajuku & Takeshita Street", Destination_Description: "Tokyo's centre of youth fashion and subculture — a narrow pedestrian street packed with crepe stands, vintage shops, and some of the world's most creative street style.", Address: "Takeshita St., Harajuku, Shibuya, Tokyo", Contact_Number: "+81 3 3403 0101", Operating_Hours: "Always open", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 519, City_ID: 5, Category_ID: 5, Destination_Name: "Tsukiji Outer Market Morning", Destination_Description: "The outer market stays open for breakfast — fresh sushi at 6 AM, tamagoyaki hot off the griddle, and the finest seafood in the world at street-stall prices. A Tokyo ritual.", Address: "4 Tsukiji, Chuo City, Tokyo", Contact_Number: "+81 3 3541 9444", Operating_Hours: "5:00 AM – 2:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },

  // ── Santorini extras ─────────────────────────────────────────────────────────
  { Destination_ID: 610, City_ID: 6, Category_ID: 1, Destination_Name: "Roka Restaurant Oia", Destination_Description: "An intimate taverna in Oia serving traditional Greek meze — grilled octopus, saganaki, and excellent local Assyrtiko wine at considerably more honest prices than the caldera-view spots.", Address: "Oia, Santorini 847 02", Contact_Number: "+30 22860 71896", Operating_Hours: "12:00 PM – 11:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 611, City_ID: 6, Category_ID: 1, Destination_Name: "Selene Restaurant", Destination_Description: "The pioneer of modern Greek cuisine on Santorini — locally grown produce, reinterpreted island recipes, and a magnificent terrace overlooking the caldera at Pyrgos village.", Address: "Pyrgos, Santorini 847 00", Contact_Number: "+30 22860 22249", Operating_Hours: "1:00 PM – 11:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 612, City_ID: 6, Category_ID: 2, Destination_Name: "Andronis Luxury Suites", Destination_Description: "Clifftop cave suites carved into the caldera in Oia — private heated plunge pools, butler service, and arguably the most dramatic sunrise views of any hotel in the world.", Address: "Oia, Santorini 847 02", Contact_Number: "+30 22860 72041", Operating_Hours: "Check-in 3:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 613, City_ID: 6, Category_ID: 2, Destination_Name: "Santo Maris Oia", Destination_Description: "A clifftop luxury resort offering infinity pools and private terraces with full caldera views. Excellent breakfast buffet with local Santorinian specialties.", Address: "Oia, Santorini 847 02", Contact_Number: "+30 22860 72592", Operating_Hours: "Check-in 3:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 614, City_ID: 6, Category_ID: 3, Destination_Name: "Sklavenitis Supermarket Fira", Destination_Description: "Santorini's best-stocked supermarket — local Vinsanto wine, Santorinian tomato paste, fava, capers, and all the island specialties at reasonable prices.", Address: "Fira, Santorini 847 00", Contact_Number: "+30 22860 24100", Operating_Hours: "8:00 AM – 10:00 PM", Rating: 4.1, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 615, City_ID: 6, Category_ID: 3, Destination_Name: "Mini Market Oia", Destination_Description: "A compact convenience store near the famous Oia blue domes — cold water, sunscreen, snacks, and postcards. Essential before the sunset wait at the castle.", Address: "Main Street, Oia, Santorini", Contact_Number: "+30 22860 71100", Operating_Hours: "8:00 AM – 11:00 PM", Rating: 4.0, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 616, City_ID: 6, Category_ID: 4, Destination_Name: "Museum of Prehistoric Thera", Destination_Description: "Remarkable Minoan artifacts from the Akrotiri excavations — vivid frescoes, gold ibex figurines, and a ceramic collection spanning 3,000 years of pre-eruption island life.", Address: "Mitropoleos 3, Fira, Santorini", Contact_Number: "+30 22860 23217", Operating_Hours: "8:00 AM – 3:30 PM", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 617, City_ID: 6, Category_ID: 4, Destination_Name: "Pyrgos Village", Destination_Description: "A medieval Venetian hilltop village at the highest point on the island — whitewashed labyrinthine alleys, a ruined Kasteli fortress, and the best 360-degree view on Santorini.", Address: "Pyrgos, Santorini 847 00", Contact_Number: "+30 22860 22000", Operating_Hours: "Always open", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 618, City_ID: 6, Category_ID: 5, Destination_Name: "Red Beach", Destination_Description: "A dramatic beach of deep red and black volcanic sand backed by towering ochre cliffs — one of the most visually striking beaches in all of Europe.", Address: "Akrotiri, Santorini 847 00", Contact_Number: "+30 22860 82000", Operating_Hours: "Always open", Rating: 4.5, Destination_Image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 619, City_ID: 6, Category_ID: 5, Destination_Name: "Imerovigli Skaros Rock", Destination_Description: "A volcanic promontory jutting into the caldera — hike the trail from Imerovigli to this medieval settlement rock for the most undisturbed caldera views on the island.", Address: "Imerovigli, Santorini 847 00", Contact_Number: "+30 22860 23000", Operating_Hours: "Always open", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Athens extras ────────────────────────────────────────────────────────────
  { Destination_ID: 710, City_ID: 7, Category_ID: 1, Destination_Name: "Diporto Agoras", Destination_Description: "A basement taverna operating since 1887 beneath the central market — no menu, just whatever the cook made that morning. Retsina poured from barrels, no credit cards accepted.", Address: "Theatrou & Sokratous, Athens 104 31", Contact_Number: "+30 21 0321 1463", Operating_Hours: "8:00 AM – 6:00 PM (Mon-Sat)", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 711, City_ID: 7, Category_ID: 1, Destination_Name: "Kostas Souvlaki", Destination_Description: "A tiny stand in Monastiraki that has served Athens' best souvlaki pita since 1950 — pork skewer, tomato, onion, and paprika sauce in a grilled flatbread. Queue at noon.", Address: "Adrianou 116, Monastiraki, Athens", Contact_Number: "+30 21 0323 2971", Operating_Hours: "10:00 AM – 5:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 712, City_ID: 7, Category_ID: 2, Destination_Name: "New Hotel Athens", Destination_Description: "A design hotel reinvented by the Campana Brothers — reclaimed furniture, mosaic floors, and a rooftop pool with Acropolis views. Boutique luxury done with wit and invention.", Address: "16 Filellinon St., Athens 10557", Contact_Number: "+30 21 0327 3000", Operating_Hours: "Check-in 3:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 713, City_ID: 7, Category_ID: 2, Destination_Name: "Athens Backpackers", Destination_Description: "The most social hostel in Athens with a legendary rooftop bar looking straight at the Acropolis. Free walking tours, excellent bar, and reliably friendly staff.", Address: "12 Makri St., Makrygianni, Athens", Contact_Number: "+30 21 0922 4044", Operating_Hours: "Check-in 2:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 714, City_ID: 7, Category_ID: 3, Destination_Name: "Sklavenitis Koukaki", Destination_Description: "Large supermarket in the Koukaki neighbourhood — excellent selection of Greek wines, local cheeses, olives, and fresh produce at prices the tourist shops never match.", Address: "Drakou 2, Koukaki, Athens 117 41", Contact_Number: "+30 21 0922 3300", Operating_Hours: "8:00 AM – 10:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 715, City_ID: 7, Category_ID: 3, Destination_Name: "Periptero Syntagma", Destination_Description: "Athens' classic street kiosk (periptero) in Syntagma Square — newspapers, phone chargers, cold drinks, headache tablets, and a helpful local who knows every bus route.", Address: "Syntagma Square, Athens 105 63", Contact_Number: "N/A", Operating_Hours: "7:00 AM – 11:00 PM", Rating: 4.0, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 716, City_ID: 7, Category_ID: 4, Destination_Name: "Odeon of Herodes Atticus", Destination_Description: "A 2nd-century stone theatre built into the south slope of the Acropolis Hill — still used for summer performances of opera, ballet, and concert, with 5,000 seats.", Address: "Dionysiou Areopagitou, Athens 117 42", Contact_Number: "+30 21 0323 2771", Operating_Hours: "Performance nights only (summer)", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 717, City_ID: 7, Category_ID: 4, Destination_Name: "Monastiraki Flea Market", Destination_Description: "Athens' most famous flea market sprawling across Monastiraki Square — antiques, vintage furniture, used vinyl, military surplus, and unlabelled trinkets that could be anything.", Address: "Monastiraki Square, Athens 105 55", Contact_Number: "+30 21 0321 0872", Operating_Hours: "Daily, busiest on Sundays", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 718, City_ID: 7, Category_ID: 5, Destination_Name: "Cape Sounion & Temple of Poseidon", Destination_Description: "A 70 km drive from Athens — a dramatic sea cliff with a 5th-century BC temple where Byron carved his name. The most moving sunset in all of Greece.", Address: "Cape Sounion, Attica 195 00", Contact_Number: "+30 22920 39363", Operating_Hours: "9:00 AM – sunset", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 719, City_ID: 7, Category_ID: 5, Destination_Name: "Anafiotika Quarter", Destination_Description: "A tiny whitewashed Cycladic-style neighbourhood built into the Acropolis rock by island stonemasons — cats, bougainvillea, and the most atmospheric 10 minutes in Athens.", Address: "Anafiotika, Plaka, Athens", Contact_Number: "+30 21 0322 0001", Operating_Hours: "Always open", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },

  // ── Ubud extras ──────────────────────────────────────────────────────────────
  { Destination_ID: 810, City_ID: 8, Category_ID: 1, Destination_Name: "Mozaic Restaurant", Destination_Description: "Ubud's most celebrated fine-dining experience — French-trained chef Chris Salans crafts a nightly tasting menu from Balinese market produce in a romantic jungle garden setting.", Address: "Jl. Raya Sanggingan, Ubud, Bali", Contact_Number: "+62 361 975 768", Operating_Hours: "6:30 PM – 10:00 PM", Rating: 4.9, Destination_Image: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 811, City_ID: 8, Category_ID: 1, Destination_Name: "Naughty Nuri's Warung", Destination_Description: "A legendary Bali institution — the pork ribs here launched a thousand travel articles. Order the martini, wait for the ribs, and understand why people come back every trip.", Address: "Jl. Raya Sanggingan, Ubud, Bali", Contact_Number: "+62 361 977 547", Operating_Hours: "11:00 AM – 10:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 812, City_ID: 8, Category_ID: 2, Destination_Name: "Alaya Resort Ubud", Destination_Description: "A design-forward boutique hotel in the heart of town — infinity pool overlooking the Campuan valley, stylish rooms with outdoor soaking tubs, and excellent Balinese cuisine.", Address: "Jl. Hanoman, Ubud, Bali 80571", Contact_Number: "+62 361 972 200", Operating_Hours: "Check-in 3:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 813, City_ID: 8, Category_ID: 2, Destination_Name: "Bisma Eight Suites", Destination_Description: "A clifftop boutique property perched above the Wos River — private plunge pools, stunning sunrise views over the jungle canopy, and an adults-only infinity pool.", Address: "Jl. Bisma, Ubud, Bali 80571", Contact_Number: "+62 361 708 8888", Operating_Hours: "Check-in 3:00 PM", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 814, City_ID: 8, Category_ID: 3, Destination_Name: "Bintang Supermarket Ubud", Destination_Description: "The best-stocked Western-friendly supermarket in central Ubud — imported cheeses, craft beer, Bali coffee, local arak, and everything health-conscious travellers need.", Address: "Jl. Raya Ubud, Ubud, Bali", Contact_Number: "+62 361 978 520", Operating_Hours: "7:00 AM – 10:00 PM", Rating: 4.3, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 815, City_ID: 8, Category_ID: 3, Destination_Name: "Indus Night Market", Destination_Description: "An informal evening market near the Campuan bridge — local warungs selling nasi campur, mie goreng, and fresh coconuts at genuine Balinese prices.", Address: "Campuan, Ubud, Bali", Contact_Number: "+62 361 977 002", Operating_Hours: "5:00 PM – 10:00 PM", Rating: 4.2, Destination_Image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 816, City_ID: 8, Category_ID: 4, Destination_Name: "Pura Taman Saraswati", Destination_Description: "Ubud's most photographed temple — a lotus pond temple dedicated to the goddess of knowledge and arts. Nightly Kecak dance performances on the temple stage.", Address: "Jl. Kajeng, Ubud, Bali", Contact_Number: "+62 361 975 303", Operating_Hours: "8:00 AM – 6:00 PM", Rating: 4.6, Destination_Image: "https://images.unsplash.com/photo-1711609110590-5ad5c4599e56?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 817, City_ID: 8, Category_ID: 4, Destination_Name: "Goa Gajah (Elephant Cave)", Destination_Description: "An 11th-century rock-cut sanctuary with a carved demon-mouth entrance, inner bathing pools, and a meditation cave used by Hindu priests for centuries.", Address: "Bedulu, Blahbatuh, Gianyar, Bali", Contact_Number: "+62 361 943 362", Operating_Hours: "8:00 AM – 5:00 PM", Rating: 4.4, Destination_Image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 818, City_ID: 8, Category_ID: 5, Destination_Name: "Campuan Ridge Walk", Destination_Description: "A 9 km ridge hike through organic rice paddies and jungle canopy above the confluence of two sacred rivers — the most peaceful walk in all of Bali, best at dawn.", Address: "Campuan, Ubud, Bali", Contact_Number: "+62 361 975 000", Operating_Hours: "Always open", Rating: 4.8, Destination_Image: "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=380&fit=crop&auto=format" },
  { Destination_ID: 819, City_ID: 8, Category_ID: 5, Destination_Name: "Tirta Gangga Water Palace", Destination_Description: "A royal water palace in eastern Bali with ornate multi-tiered fountains, stepping-stone pools, and koi-filled ponds — built by the last king of Karangasem in 1946.", Address: "Abang, Karangasem, Bali", Contact_Number: "+62 363 21551", Operating_Hours: "7:00 AM – 6:00 PM", Rating: 4.7, Destination_Image: "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=600&h=380&fit=crop&auto=format" },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

const REVIEWS: Record<number, ReviewEntry[]> = {

  // ── Baguio City ──────────────────────────────────────────────────────────────
  // 101 Hill Station (4.8) — Restaurant
  101: [
    { Review_ID: 1001, reviewer_name: "James Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The colonial atmosphere of Hill Station is unmatched. Coffee while overlooking Session Road is a Baguio ritual I repeat every single visit.", Review_Date: "2025-01-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Food is consistently excellent, service warm and unhurried." },
    { Review_ID: 1002, reviewer_name: "Lea Pangilinan",   reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ordered the pan-fried chicken livers and the house-blend coffee — both were superb. The vaulted dining room feels like eating inside a history book.", Review_Date: "2025-02-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Menu is creative and portions are generous. Prices are very fair for the quality." },
    { Review_ID: 10103, reviewer_name: "Greta Bautista",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Hill Station never disappoints. The coffee flight showcasing local Benguet beans is exceptional, and the egg dishes at brunch are some of the finest in Baguio. The colonial setting feels genuinely lived-in.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Superb food quality and attentive service. The all-day breakfast menu covers every craving." },
  ],
  // 102 Oh My Gulay! (4.5) — Restaurant
  102: [
    { Review_ID: 1003, reviewer_name: "Marco Dela Cruz",  reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Oh My Gulay is a trip — the interior alone is worth the visit. Food is good, very vegetarian-friendly, though service can be slow on weekends.", Review_Date: "2025-03-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great vegetarian menu and creative drinks. Bring patience during peak hours." },
    { Review_ID: 1004, reviewer_name: "Tina Soriano",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The installation art covering every surface made me feel like I was dining inside someone's imagination. The camote fries are addictive.", Review_Date: "2025-04-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Unique atmosphere unlike anywhere else in Baguio. A must-visit for first-timers." },
    { Review_ID: 10203, reviewer_name: "Dan Navarro",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Oh My Gulay is Baguio at its most creative — the food is inventive and delicious, and the art-filled interior makes every corner photo-worthy. A genuinely different dining experience.", Review_Date: "2025-05-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good variety of vegetarian dishes with real flavour. The staff are friendly and the atmosphere is unlike anywhere else." },
  ],
  // 103 The Manor at Camp John Hay (4.7) — Accommodation
  103: [
    { Review_ID: 1005, reviewer_name: "Sophia Tan",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Waking up to pine trees outside the window and a fireplace crackling — The Manor is exactly how Baguio should be experienced. Worth every peso.", Review_Date: "2025-02-14", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Staff are incredibly attentive. Breakfast buffet is among the best hotel breakfasts I have had." },
    { Review_ID: 1006, reviewer_name: "David Lim",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Beautiful property and excellent service, though the rooms feel slightly dated. The gardens and forest setting are genuinely spectacular.", Review_Date: "2025-05-01", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great location inside Camp John Hay. Could use a room refresh but overall experience is lovely." },
    { Review_ID: 10303, reviewer_name: "Carla Ramos",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Manor is pure luxury in the Baguio highlands. The fireplace in our room, the impeccable turndown service, and the pine-forest views from every window made it feel like a world apart from the city.", Review_Date: "2025-06-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room interiors are grand and very comfortable. The bathroom amenities are top quality and the beds are outstanding." },
  ],
  // 104 Azalea Residences (4.5) — Accommodation
  104: [
    { Review_ID: 1007, reviewer_name: "Bea Navarro",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Azalea is the best-value stay in Baguio. The apartment-style rooms are spacious, well-equipped, and the kitchen made it easy to prepare our own breakfast with Baguio strawberries.", Review_Date: "2025-03-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Rooms are large and very clean. The fully-equipped kitchen is a huge bonus for longer stays." },
    { Review_ID: 1008, reviewer_name: "Karl Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Comfortable and modern with great mountain views. The heating is essential at night and works perfectly. Parking can be tight during peak season.", Review_Date: "2025-05-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great value for the space. Staff are helpful and the location near Burnham Park is convenient." },
    { Review_ID: 10403, reviewer_name: "Lea Castillo",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Azalea Residences is ideal for families. The apartment layout gives you so much space and the kitchen made our stay genuinely convenient. The garden pool on a cool Baguio morning is a highlight.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very clean rooms with excellent facilities. The full kitchen is perfect for longer stays and the staff are responsive." },
  ],
  // 105 Baguio Public Market (4.4) — Convenience Store
  105: [
    { Review_ID: 1009, reviewer_name: "Gina Reyes",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Baguio Public Market is a sensory overload in the best way — fresh strawberries, ube jam, peanut brittle, and woven handicrafts all in one place. A must-do for any visitor.", Review_Date: "2025-02-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Arrive early for the freshest produce. Bargain respectfully — vendors are friendly but prices are not fixed." },
    { Review_ID: 1010, reviewer_name: "Tony Cruz",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Authentic local market experience. The vegetable and flower sections in the morning are beautiful. Watch your belongings in the crowded stalls.", Review_Date: "2025-04-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Excellent selection of local products you will not find in Manila. The ukay-ukay section has some gems." },
    { Review_ID: 10503, reviewer_name: "Mina Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Baguio Public Market is the best place to buy pasalubong. The strawberry preserves, ube jam, and peanut brittle are all excellent quality and priced very fairly direct from the producers.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Well-stocked with local produce and crafts. Cleanliness varies by section but the main vegetable stalls are always tidy." },
  ],
  // 106 BenCab Museum (4.9) — Landmark
  106: [
    { Review_ID: 1011, reviewer_name: "Rica Navarro",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "BenCab Museum is a world-class institution. The permanent collection is breathtaking and the hilltop setting makes every gallery feel special. Do not skip the café.", Review_Date: "2025-01-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Exhibits are thoughtfully curated and well-labelled. The Cordillera artifacts section is particularly moving." },
    { Review_ID: 1012, reviewer_name: "Alex Fontaine",    reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "I did not expect a museum of this calibre in Baguio. BenCab's personal works alone are worth the entrance fee, and the view from the terrace is unforgettable.", Review_Date: "2025-03-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Museum café has excellent coffee and the organic garden is a lovely extra." },
    { Review_ID: 10603, reviewer_name: "Rachel Sy",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "BenCab Museum rivals any world-class institution. The curation is exceptional, the hilltop setting is dramatic, and the café uses produce from the organic farm below. Allow a full half-day.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Historical value is extraordinary — BenCab's personal collection documents Filipino art history beautifully. The atmosphere is serene and inspiring." },
  ],
  // 107 Mines View Park (4.3) — Tourist Destination
  107: [
    { Review_ID: 1013, reviewer_name: "Rona Diaz",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Mines View is classic Baguio — the panoramic view of the Benguet mountains is genuinely stunning even if the surrounding stalls are a bit touristy. Worth a morning visit.", Review_Date: "2025-03-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great for photos at the main viewpoint. Visit on a clear day — clouds can obscure the view completely." },
    { Review_ID: 1014, reviewer_name: "Pete Guzman",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The view is the star here and it is lovely. The souvenir market is very commercial but you can find decent woodwork and woven bags if you look carefully.", Review_Date: "2025-04-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Combine with Camp John Hay for a full day. Free to enter the park itself." },
    { Review_ID: 10703, reviewer_name: "Bea Soriano",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Mines View is genuinely beautiful on a clear day. The panorama of the Benguet cordillera is sweeping and the park itself is well-maintained. Arrive before 9 AM for the best light and fewer crowds.", Review_Date: "2025-06-14", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Historical significance of the old mining landscape adds real depth to the scenery. The nearby stalls have decent woodwork and woven goods." },
  ],
  // 108 Burnham Park (4.6) — Tourist Destination
  108: [
    { Review_ID: 1015, reviewer_name: "Maria Santos",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Burnham Park is the heart of Baguio — boating on the lagoon, the rose garden, and that cool mountain air. Unmissable every visit.", Review_Date: "2025-03-14", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Clean, well-maintained, great for families and morning jogs." },
    { Review_ID: 1016, reviewer_name: "Jun Aquino",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Great park but gets very crowded on weekends. Visit on a Tuesday morning for the best experience — the rose garden is stunning with almost no one around.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The boat rides are fun and very affordable. Parking can be a challenge on holidays." },
    { Review_ID: 10803, reviewer_name: "Sarah Dela Cruz",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Burnham Park is the soul of Baguio. The rose garden in full bloom, the lagoon boat rides, and the cool highland air make it the perfect afternoon activity. Best enjoyed on a quiet weekday morning.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Scenic and very well-maintained. The activities — boating, cycling, walking trails — cover all interests and budgets." },
  ],
  // 109 Camp John Hay (4.7) — Tourist Destination
  109: [
    { Review_ID: 1017, reviewer_name: "Lisa Fernandez",   reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Camp John Hay is Baguio at its most beautiful — towering pine trees, cool quiet roads, and the smell of pine needles everywhere. The Bell House is particularly interesting.", Review_Date: "2025-02-06", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The nature trail is a wonderful morning walk. Great for cycling too. The log cabin restaurant does a solid breakfast." },
    { Review_ID: 1018, reviewer_name: "Mark Soriano",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Stunning forest setting and plenty to do — golf, hiking, the cemetery of negativism — but entry and activity fees add up quickly if you are not careful.", Review_Date: "2025-05-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Best enjoyed slowly over a half-day. Go on a weekday and you practically have the trails to yourself." },
    { Review_ID: 10903, reviewer_name: "Joy Aquino",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Camp John Hay is a world unto itself — pine trees stretching in every direction, colonial architecture, and crisp mountain air. The historical bell house tour adds wonderful context to the entire estate.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The forest trails are beautifully maintained and the cycling paths offer great scenery. Activities are plentiful for a full-day visit." },
  ],
  // 110 Café by the Ruins (4.6) — Restaurant
  110: [
    { Review_ID: 1019, reviewer_name: "Carla Mendez",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Café by the Ruins has soul. The ruins are part of the dining experience and the pinikpikan here is the best I have had anywhere. A Baguio institution.", Review_Date: "2025-02-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Excellent Filipino comfort food at very reasonable prices. The house rice wine is a must-try." },
    { Review_ID: 1020, reviewer_name: "Sam Ocampo",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Lovely garden setting with creative Filipino food. The pastil set and tinola were both excellent. Service is relaxed — good for a long leisurely lunch.", Review_Date: "2025-04-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Order the native coffee. Slightly slow service but the atmosphere more than compensates." },
    { Review_ID: 11003, reviewer_name: "Nina Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Café by the Ruins captures the spirit of Baguio perfectly. The atmosphere around the WWII ruins is unique and the menu leans into local ingredients beautifully. The native champorado is extraordinary.", Review_Date: "2025-06-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Excellent Filipino comfort food with genuinely creative touches. Service is warm and the garden seating is lovely in the afternoon." },
  ],
  // 111 Forest House Baguio (4.4) — Accommodation
  111: [
    { Review_ID: 1021, reviewer_name: "Ana Cruz",         reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Forest House is a cosy, no-frills option that delivers on its main promise — waking up in the middle of a pine forest. Rooms are modest but very clean and comfortable.", Review_Date: "2025-03-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great value for the location. The cabin-style rooms with wooden walls feel genuinely charming. Bring a jacket — it gets cold at night." },
    { Review_ID: 1022, reviewer_name: "Ricky Tan",        reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Good budget accommodation in a beautiful wooded setting. The staff are friendly and helpful. A little away from the main attractions but worth it for the peace and quiet.", Review_Date: "2025-05-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Hot shower works well. Wi-Fi is decent. Ideal for visitors who want nature over city-centre convenience." },
    { Review_ID: 11103, reviewer_name: "Alma Rivera",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Forest House is a charming retreat. The wooden cabin rooms surrounded by pine trees are cosy and clean, and the staff made us feel genuinely welcome. A great value option for experiencing Baguio's nature.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room facilities are basic but everything you need is there. The beds are comfortable and the mountain air through the window is the best amenity of all." },
  ],
  // 112 Forest Lodge at Camp John Hay (4.5) — Accommodation
  112: [
    { Review_ID: 1023, reviewer_name: "Jenny Lim",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Forest Lodge is excellent value inside Camp John Hay. The rooms are modern and clean, the pine tree views from the window are genuinely relaxing, and the service is professional.", Review_Date: "2025-02-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Much more affordable than The Manor next door but the same great forest setting. Book the deluxe rooms." },
    { Review_ID: 1024, reviewer_name: "Ed Pascual",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "A wonderful retreat inside Camp John Hay. The pine-scented air through the window every morning is reason enough to stay here. Comfortable beds and great hot water.", Review_Date: "2025-04-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The proximity to the hiking trails is a huge plus. Staff arranged a packed breakfast for our early morning walk." },
    { Review_ID: 11203, reviewer_name: "Gloria Lim",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Forest Lodge inside Camp John Hay is a wonderful combination of nature and comfort. The units are spacious and well-equipped, and being able to walk straight into the pine forest from your door is remarkable.", Review_Date: "2025-07-02", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very comfortable rooms with great facilities. The kitchenette made breakfast preparation easy and the location inside the estate is superb." },
  ],
  // 113 Hotel Veniz Burnham (4.3) — Accommodation
  113: [
    { Review_ID: 1025, reviewer_name: "Faye Morales",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Hotel Veniz is clean, well-located right next to Burnham Park, and the staff are genuinely welcoming. Rooms are compact but have everything you need for a Baguio trip.", Review_Date: "2025-03-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great location near the park and Session Road. Breakfast is decent. A solid budget choice." },
    { Review_ID: 1026, reviewer_name: "Paolo Santos",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Comfortable and convenient. The heater in the room is essential and works well. Nothing fancy but reliable — I have stayed here three times now.", Review_Date: "2025-05-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Ask for a higher-floor room to avoid street noise. Friendly front desk staff who know the city well." },
    { Review_ID: 11303, reviewer_name: "Ria Mendez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Hotel Veniz is a reliable, well-priced option right next to Burnham Park. The rooms are clean and comfortable, the free breakfast is decent, and the location made exploring Session Road very easy.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Comfortable beds and good hot water. The front desk staff are helpful and the location near the park is a genuine advantage." },
  ],
  // 114 SM City Baguio Supermarket (4.3) — Convenience Store
  114: [
    { Review_ID: 1027, reviewer_name: "Dianne Uy",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The SM Baguio supermarket has a great selection of local products — Baguio strawberry jam, ube halaya, peanut brittle — perfect for packing pasalubong. Well-stocked and clean.", Review_Date: "2025-04-02", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The fresh produce section has great local vegetables at fair prices. Much calmer than the public market." },
    { Review_ID: 11402, reviewer_name: "Carlos Mañosa",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "SM Baguio supermarket is the most convenient large-format store in the city. Wide aisles, good selection of local produce and packaged goods, and fair pricing. Perfect for stocking up before heading to a Baguio accommodation.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very clean store with well-organised sections. The refrigerated section carries a good range of local cheeses and dairy products." },
    { Review_ID: 11403, reviewer_name: "Nena Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A very solid supermarket with all the Baguio pasalubong essentials in one place. The baked goods counter near the entrance always has fresh goods and the staff are efficient at checkout.", Review_Date: "2025-06-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good stock variety and consistently clean. The fresh produce section has excellent Cordillera vegetables at very reasonable prices." },
  ],
  // 115 7-Eleven Session Road (4.1) — Convenience Store
  115: [
    { Review_ID: 1028, reviewer_name: "Reggie Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Does exactly what a 7-Eleven should — clean, well-stocked, and open when you need it. The hot foods section kept us fed between activities. Great central location on Session Road.", Review_Date: "2025-05-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Hot coffee and siopao at midnight when the mountain air gets cold — this 7-Eleven saves lives." },
    { Review_ID: 11502, reviewer_name: "Lara Obusan",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Session Road 7-Eleven is exactly what you need in Baguio — always open, well-stocked with hot foods and cold drinks, and conveniently placed for grabbing breakfast before the morning markets. Reliable and clean.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 3, subtype_feedback: "Standard convenience store stock with a decent hot food selection. Hours are perfect for early-morning Baguio explorers." },
    { Review_ID: 11503, reviewer_name: "Tricia Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A dependable stop along Session Road. The hot drinks are essential for Baguio's cold evenings and the snack selection covers all bases. Very convenient location near most of the city's main attractions.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Clean store with 24-hour access. The staff are friendly and efficient even during busy weekend evenings." },
  ],
  // 116 The Mansion (4.4) — Landmark
  116: [
    { Review_ID: 1029, reviewer_name: "Cris Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Mansion's iconic wrought-iron gates and the grand entrance are genuinely impressive. The surrounding gardens are beautifully maintained and perfect for a quiet afternoon walk.", Review_Date: "2025-03-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "You cannot enter the mansion itself but the garden grounds and the gate are the main attraction. Great for photos." },
    { Review_ID: 1030, reviewer_name: "May Garcia",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A beautiful piece of Baguio's colonial history. The grounds are well-kept and peaceful — a good contrast to the busy Session Road area. Wright Park across the road is lovely too.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The guard at the gate is friendly and can share some history. Free to visit the grounds." },
    { Review_ID: 11603, reviewer_name: "Jun Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Mansion's ornate iron gates are genuinely iconic. The surrounding grounds are well-maintained and the colonial architecture speaks to Baguio's fascinating history as a hill station. A must-photograph landmark.", Review_Date: "2025-07-01", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Free to visit the gardens and gate area. The historical significance of the Philippine president's summer residence makes the stop worthwhile." },
  ],
  // 117 Botanical Garden (4.2) — Tourist Destination
  117: [
    { Review_ID: 1031, reviewer_name: "Nora Basco",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A quiet, leafy escape from the Baguio bustle. The Igorot Village section with the traditional huts is genuinely interesting. Not the most manicured garden but has real charm.", Review_Date: "2025-02-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Free entry and very relaxing. The flower and succulent displays near the entrance are beautiful in the morning light." },
    { Review_ID: 11702, reviewer_name: "Felix Sison",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Botanical Garden is peaceful and genuinely interesting. The Igorot village recreation and the native orchid collection are both well worth seeing. A wonderful free alternative to the busier Baguio parks.", Review_Date: "2025-05-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautiful orchid displays and quiet walking paths. Best visited on a weekday morning for maximum tranquility and the best light for photography." },
    { Review_ID: 11703, reviewer_name: "Dina Castillo",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A lovely hidden gem in Baguio. The garden is not manicured to perfection but has real character — native plants, traditional architecture displays, and some of the most peaceful spots in the city.", Review_Date: "2025-06-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Free entry and very relaxing atmosphere. The succulent collection near the entrance is impressive. Allow an hour to see everything properly." },
  ],
  // 118 Strawberry Farm La Trinidad (4.5) — Tourist Destination
  118: [
    { Review_ID: 1032, reviewer_name: "Donna Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Picking your own strawberries at La Trinidad is one of those simple travel joys that I completely underestimated. The berries are incredibly sweet and the surrounding valley is stunning.", Review_Date: "2025-02-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Best visited during peak strawberry season (December to February). Picking fees are very affordable." },
    { Review_ID: 1033, reviewer_name: "Gino Ramos",       reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Fun experience, especially for kids. The strawberries are genuinely delicious straight from the plant. Can be crowded on weekends — go on a weekday for a more relaxed visit.", Review_Date: "2025-04-14", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Try the strawberry taho and the fresh strawberry shake at the nearby stalls. Outstanding." },
    { Review_ID: 11803, reviewer_name: "Tess Navarro",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Strawberry Farm La Trinidad is a genuinely fun and delicious experience. The berries are incredibly sweet and fresh, the valley scenery is beautiful, and the staff at the nearby stalls make excellent strawberry taho.", Review_Date: "2025-06-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great for families and couples alike. Activities are simple but memorable. Best time to visit is December through February for peak berries." },
  ],
  // 119 Wright Park & The Mansion (4.3) — Tourist Destination
  119: [
    { Review_ID: 1034, reviewer_name: "Amy Coronel",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Wright Park is a lovely green space with the famous Pool of Pines. Horseback riding here is a fun activity and the tree-lined road beside The Mansion is very picturesque.", Review_Date: "2025-03-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Combine with The Mansion nearby for a pleasant half-morning. The horse handlers are experienced and safe for children." },
    { Review_ID: 11902, reviewer_name: "Ben Ocampo",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Wright Park is a lovely Baguio institution. The horseback riding is excellent for kids and adults alike, and the Pool of Pines reflecting track is one of the most photogenic spots in the city. Very relaxing morning activity.", Review_Date: "2025-05-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Safe and well-run horseback riding experience with experienced handlers. The tree-lined road is perfect for a slow morning walk after the ride." },
    { Review_ID: 11903, reviewer_name: "Rita Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Wright Park combined with the nearby Mansion makes for a perfect Baguio morning. The park is quiet, the pine trees are magnificent, and the horses are well cared for. A classic Baguio experience not to be missed.", Review_Date: "2025-06-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Scenic and well-maintained. The horseback riding fees are very affordable and the route through the pine trees is genuinely beautiful." },
  ],

  // ── Vigan ────────────────────────────────────────────────────────────────────
  // 201 Café Leona (4.6) — Restaurant
  201: [
    { Review_ID: 2001, reviewer_name: "Diane Castro",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Café Leona on Crisologo at golden hour — the ambience, the bagnet, and a cold Vigan basi. This is what heritage travel is supposed to feel like.", Review_Date: "2025-02-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Consistent quality across multiple visits. The empanada is the best on Calle Crisologo." },
    { Review_ID: 2002, reviewer_name: "Paolo Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Good food and a great location, though slightly touristy pricing. The longganisa salpicao was excellent and the colonial interior is genuinely beautiful.", Review_Date: "2025-04-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Better for dinner than lunch — atmosphere is more special when the street lanterns are lit." },
    { Review_ID: 20103, reviewer_name: "Mia Abella",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Café Leona on Calle Crisologo is an institution for good reason. The Ilocano specialties are executed well, the empanada is crispy and flavourful, and the colonial dining room sets the perfect heritage atmosphere.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Consistent food quality and attentive service. The longganisa rice plate is excellent value. Better experienced at dinner under the lantern light." },
  ],
  // 202 Kusina ni Ineng (4.4) — Restaurant
  202: [
    { Review_ID: 2003, reviewer_name: "Alma Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Kusina ni Ineng is authentic home-style Ilocano cooking without any tourist pretension. The pinakbet and the bagnet were both cooked exactly right — hearty and deeply flavoured.", Review_Date: "2025-03-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Order the set meals — great value and includes native rice. Portions are very generous." },
    { Review_ID: 2004, reviewer_name: "Ramon Lopez",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A local favourite for good reason. Simple surroundings but the food quality is excellent and the prices are very fair. The Vigan longganisa breakfast set is outstanding.", Review_Date: "2025-05-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Busy at lunch — arrive by noon or expect a short wait. Cash only." },
    { Review_ID: 20203, reviewer_name: "Pete Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Kusina ni Ineng is authentic Ilocano cooking at its honest best. The food is deeply flavoured and the portions are generous. A local canteen that outperforms many heritage restaurants in the same area.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Excellent value and consistent quality. The dinengdeng with fried fish is outstanding. Service is efficient and the staff are welcoming." },
  ],
  // 203 Grandpa's Inn (4.7) — Accommodation
  203: [
    { Review_ID: 2005, reviewer_name: "Nina Villanueva",  reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Grandpa's Inn is the definitive Vigan stay. Sleeping in a 19th-century ancestral house with capiz windows — nothing else comes close to this atmosphere.", Review_Date: "2025-03-19", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Staff are warm and knowledgeable about local history. Breakfast is excellent and included." },
    { Review_ID: 2006, reviewer_name: "Ramon Torres",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Lovely heritage property with a great location. The rooms are a little dark due to the thick stone walls, but that is part of the authentic charm — I loved it.", Review_Date: "2025-05-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Book the corner room if you can — it has the best natural light and the nicest furniture." },
    { Review_ID: 20303, reviewer_name: "Ana Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Grandpa's Inn is the quintessential Vigan experience. Stone walls, capiz windows, antique furniture in every room — staying here felt like the heritage itself embraced us. The included breakfast is excellent.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Rooms are beautifully appointed and very comfortable. The thick stone walls keep everything cool. Exceptional value for the heritage experience it delivers." },
  ],
  // 204 Villa Angela Heritage House (4.5) — Accommodation
  204: [
    { Review_ID: 2007, reviewer_name: "Julia Pascual",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Villa Angela is simply magical. A perfectly preserved 1870s ancestral home converted into a small inn — every room is filled with antiques and the courtyard garden is stunning.", Review_Date: "2025-02-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The owner personally shares the history of the house at breakfast. An experience unlike any other hotel." },
    { Review_ID: 2008, reviewer_name: "Ben Carlos",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Atmospheric and charming but the facilities are older. The heritage experience more than compensates — waking up here feels like stepping directly into Vigan's history.", Review_Date: "2025-05-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Worth it for the experience. Rooms are beautiful even if modern amenities are minimal." },
    { Review_ID: 20403, reviewer_name: "Liz Pascual",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Villa Angela is a one-of-a-kind stay. The 1870s mansion is impeccably preserved and every room tells a story. The garden courtyard for breakfast is a genuine highlight and the owners are wonderfully hospitable.", Review_Date: "2025-07-01", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room facilities are older but the heritage experience compensates completely. The courtyard is beautiful and the atmosphere is magical in the evening." },
  ],
  // 205 Plaza Salcedo Night Market (4.5) — Convenience Store
  205: [
    { Review_ID: 2009, reviewer_name: "Irene Valdez",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Plaza Salcedo night market is a lovely evening ritual in Vigan — street food, local crafts, and the illuminated cathedral in the background. Very affordable and family-friendly.", Review_Date: "2025-04-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Try the empanada and the okoy. The bibingka near the cathedral side is excellent." },
    { Review_ID: 2010, reviewer_name: "Mark Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "A great way to spend a Vigan evening — local food stalls, the dancing fountain, and the beautifully lit colonial buildings all around. Authentic and not touristy at all.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Active from around 6 PM. Bring cash — most stalls do not accept cards." },
    { Review_ID: 20503, reviewer_name: "Grace Ramos",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Plaza Salcedo Night Market is a wonderful Vigan evening tradition. The street food quality is excellent — the empanada, okoy, and bibingka are all freshly made. The illuminated colonial surroundings make every meal feel special.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very well-stocked with local food and craft vendors. Cleanliness is good and the atmosphere is festive but relaxed. Bring cash for the best experience." },
  ],
  // 206 Bantay Bell Tower (4.5) — Landmark
  206: [
    { Review_ID: 2011, reviewer_name: "Cora Aguilar",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Bantay Bell Tower is one of the most atmospheric colonial landmarks in the Philippines. The view from the top over the Vigan valley is breathtaking and the 400-year-old structure is remarkable.", Review_Date: "2025-03-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Climb to the top early in the morning for the best light and fewest visitors. Free entry." },
    { Review_ID: 2012, reviewer_name: "Oscar Cruz",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A stunning piece of Ilocandia history that most visitors rush past on the way to Crisologo. Slow down and appreciate it — the walls are five feet thick and still standing after centuries.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The adjacent St. Augustine Church is worth visiting too. The whole complex takes about 30 minutes." },
    { Review_ID: 20603, reviewer_name: "Lily Flores",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Bantay Bell Tower is one of the most atmospheric colonial monuments in the Philippines. The panoramic view over Vigan from the top is spectacular and the 400-year-old stonework is remarkably intact. A must-visit.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Extraordinary historical value — a 16th-century watchtower that once protected against pirate raids. The atmosphere at dawn with the mist over the valley is unforgettable." },
  ],
  // 207 Calle Crisologo (4.9) — Landmark
  207: [
    { Review_ID: 2013, reviewer_name: "Grace Uy",         reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Calle Crisologo at 6 AM before any tourists arrive — mist rising off the cobblestones and the sound of a distant kalesa. One of the most romantic streets in Asia.", Review_Date: "2025-01-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Go at dawn. Afternoon is fine but the morning light and empty streets are a completely different experience." },
    { Review_ID: 2014, reviewer_name: "Luis Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "I have visited many heritage streets across Asia and Calle Crisologo is genuinely extraordinary. The preservation is immaculate and the atmosphere is unrivalled.", Review_Date: "2025-06-02", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Shops along the street sell quality local crafts. Worth browsing — not the usual tourist junk." },
    { Review_ID: 20703, reviewer_name: "Sofia Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Calle Crisologo is one of the most beautiful streets in Asia. The preserved Spanish colonial architecture, the cobblestones, and the kalesa rides create an atmosphere that feels completely authentic and irreplaceable.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The historical atmosphere is unparalleled — every building has centuries of character. Go at dawn for the most magical experience when the mist hangs over the cobblestones." },
  ],
  // 208 Syquia Mansion Museum (4.4) — Landmark
  208: [
    { Review_ID: 2015, reviewer_name: "Tessie Bautista",  reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Syquia Mansion gives you a real sense of Philippine elite life in the 19th century. The furniture, the portraits, and the personal objects of Elpidio Quirino are fascinating.", Review_Date: "2025-03-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The guided tour is essential — the guide knows the stories behind every object and brings the history to life." },
    { Review_ID: 2016, reviewer_name: "Tony Salcedo",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A fascinating window into Vigan's political history. The mansion itself is beautifully preserved and the guide was knowledgeable and engaging. Reasonably priced entry fee.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Small but very well-presented. Budget 45 minutes. Photography is allowed inside." },
    { Review_ID: 20803, reviewer_name: "Gloria Aguilar",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Syquia Mansion is a fascinating window into Philippine presidential history. The guided tour brings the Quirino family story to life beautifully and the original furnishings are in remarkable condition.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Rich historical content and well-preserved interiors. The guide is knowledgeable and engaging. A worthwhile 45-minute detour from the main heritage trail." },
  ],
  // 209 Burnay Pottery District (4.6) — Tourist Destination
  209: [
    { Review_ID: 2017, reviewer_name: "Petra Gomez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Watching the burnay potters throw clay on foot-powered wheels using a 400-year-old technique is mesmerising. You can buy the distinctive dark glazed jars directly from the makers.", Review_Date: "2025-02-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The potters welcome visitors and are happy to explain their process. A wonderfully authentic craft experience." },
    { Review_ID: 2018, reviewer_name: "Dennis Ramos",     reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Genuinely unique — this is living history. The burnay pottery tradition has survived here unchanged for centuries. A small detour from the main heritage trail that is absolutely worth it.", Review_Date: "2025-04-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Pots make excellent souvenirs. Smaller pieces are easy to carry. Prices are very fair direct from the workshop." },
    { Review_ID: 20903, reviewer_name: "Carla Magtoto",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Watching the burnay potters throw clay with foot-powered wheels using a 400-year tradition is mesmerising. The whole district feels like a living museum of Ilocano heritage. Buy a jar directly from the kiln.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "A genuinely unique craft experience that connects you to Vigan's living heritage. The potters are welcoming and happy to explain their centuries-old technique." },
  ],
  // 210 Salsa Kitchen (4.5) — Restaurant
  210: [
    { Review_ID: 2019, reviewer_name: "Lani Flores",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A nice change of pace from the Ilocano staples — Salsa Kitchen does a fresh take on Filipino food with good technique and quality ingredients. The house pasta with longanisa is excellent.", Review_Date: "2025-03-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good value and generous portions. The mango dessert was a highlight. Very popular with locals." },
    { Review_ID: 2020, reviewer_name: "Joel Mendoza",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Salsa Kitchen surprised me — the food is creative and well-executed. Definitely one of the better modern restaurants in Vigan for visitors who want something other than traditional dishes.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Friendly staff and nice indoor-outdoor seating. The chicken inasal here is better than most specialist inasal places." },
    { Review_ID: 21003, reviewer_name: "Rita Domingo",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Salsa Kitchen is the best change-of-pace dining option in Vigan. The pasta with local longanisa is inspired and the wood-fired pizza is executed very well. A beautifully restored heritage house setting.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great food quality and generous portions. The cocktail menu is creative and the indoor-outdoor seating is lovely in the evening breeze." },
  ],
  // 211 Cordillera Restaurant (4.3) — Restaurant
  211: [
    { Review_ID: 2021, reviewer_name: "Beth Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Solid Ilocano food in a comfortable setting. The pinakbet is properly bitter and the Vigan longganisa is of excellent quality. A reliable choice for a sit-down traditional meal.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Reasonable prices and very consistent quality. The bangus dish is particularly well-prepared." },
    { Review_ID: 21102, reviewer_name: "Mike de la Peña",    reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Cordillera Restaurant is a dependable choice for traditional Ilocano food in Vigan. The longanisa platter is excellent and the bagnet is properly crispy. Good service and a comfortable dining room.", Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Consistent food quality and very reasonable prices. The pinakbet is well-seasoned and the native rice is excellent. A solid heritage dining experience." },
    { Review_ID: 21103, reviewer_name: "Aida Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A reliable heritage dining room for Ilocano classics. The empanada and the dinengdeng are both prepared authentically and the portions are generous. Good value for a sit-down meal in Vigan.", Review_Date: "2025-06-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Food service is efficient and the staff are friendly. The bangus dish is particularly well-prepared. A safe and satisfying choice for the whole family." },
  ],
  // 212 Hotel Felicidad (4.4) — Accommodation
  212: [
    { Review_ID: 2022, reviewer_name: "Virgie Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Hotel Felicidad is a pleasant heritage-style hotel with rooms that look onto a quiet colonial courtyard. Clean, well-maintained, and the location near Crisologo is ideal.", Review_Date: "2025-02-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The courtyard breakfast is a lovely way to start the day. Good hot water and comfortable beds." },
    { Review_ID: 2023, reviewer_name: "Ernie Tan",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Good value property with heritage character. The rooms are a bit small but the colonial atmosphere and the convenient location make it a solid pick for a night or two in Vigan.", Review_Date: "2025-05-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Staff are helpful with dinner recommendations. Parking available on the street." },
    { Review_ID: 21203, reviewer_name: "Cora Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Hotel Felicidad is a charming boutique hotel with genuine colonial character. The courtyard with its fountain is beautiful and the rooms looking onto it are peaceful and comfortable. A lovely Vigan stay.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Rooms are well-kept and comfortable. The colonial atmosphere is genuine and the breakfast in the courtyard is a wonderful morning ritual." },
  ],
  // 213 Vigan Plaza Hotel (4.2) — Accommodation
  213: [
    { Review_ID: 2024, reviewer_name: "Nora Villanueva",  reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A decent budget option that gets the basics right — clean rooms, hot shower, and a good location near Plaza Salcedo. Nothing fancy but perfectly adequate for a short Vigan trip.", Review_Date: "2025-03-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Friendly staff and easy check-in. The complimentary breakfast is simple but sufficient." },
    { Review_ID: 21302, reviewer_name: "Dennis Ocampo",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Vigan Plaza Hotel delivers good value for a short Vigan stay. The rooftop view of the bell tower is excellent and the rooms are clean and comfortable. A reliable budget pick in a great central location.", Review_Date: "2025-05-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Comfortable beds and decent breakfast. The rooftop terrace is the hotel's best feature. Staff are helpful with recommendations and local directions." },
    { Review_ID: 21303, reviewer_name: "Liza Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A decent mid-range option with a great location overlooking Plaza Salcedo. Rooms are clean and have everything needed for a short stay. The view of the colonial square from the room is a bonus.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 3, subtype_feedback: "Basic but well-maintained facilities. The location is the main selling point — steps from the night market and a short walk to Calle Crisologo." },
  ],
  // 214 Vigan City Market (4.2) — Convenience Store
  214: [
    { Review_ID: 2025, reviewer_name: "Fely Aguilar",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Vigan City Market is real daily life in Ilocos Sur — fresh produce, live fish, and local ingredients you will not find elsewhere. Go in the morning for the best selection.", Review_Date: "2025-04-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Try the fresh tupig and the locally made suka. Authentic and very affordable." },
    { Review_ID: 21402, reviewer_name: "Bobby Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Vigan City Market is the real Vigan — local vendors selling fresh produce, native delicacies, and everyday goods at genuine local prices. The morning rush is the best time to visit for the widest selection.", Review_Date: "2025-05-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Well-stocked and busy with locals. The fresh fish and meat sections are very good. A vivid and authentic market experience far from the tourist trail." },
    { Review_ID: 21403, reviewer_name: "Tess Lacson",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A bustling local market that gives you a real sense of daily Vigan life. The longganisa and the tupig stalls are excellent and the prices are among the best you will find in the city.", Review_Date: "2025-06-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The produce is fresh and affordable. Cleanliness is reasonable for a busy local market. Go early to see it at its most lively and to get the best selection." },
  ],
  // 215 Laoag-Vigan Mini Stop (4.0) — Convenience Store
  215: [
    { Review_ID: 2026, reviewer_name: "Manny Cruz",       reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Convenient stop on the Vigan heritage trail — cold drinks, decent hot food selection, and clean restrooms. Saved us on a hot afternoon when we needed a quick break.", Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Standard Mini Stop quality. Nothing special but reliable when you need snacks or drinks." },
    { Review_ID: 21502, reviewer_name: "Pearl Aguilar",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A convenient stop for basic supplies on the Vigan heritage trail. Clean, well-stocked with snacks and cold drinks, and the staff are friendly. Does the job when you need a quick break between sightseeing.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 3, subtype_feedback: "Standard convenience store with adequate stock. The cold beverages are very welcome on warm Vigan afternoons. Hours are reasonable for most travellers." },
    { Review_ID: 21503, reviewer_name: "Tony Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Reliable convenience store at a useful Vigan location. The quick food options and cold drinks kept us fuelled between heritage walks. Clean and efficiently run.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good stock of drinks, snacks, and basic necessities. The staff are helpful and the store is consistently clean. A solid pit stop during a day of Vigan exploration." },
  ],
  // 216 St. Paul's Metropolitan Cathedral (4.7) — Landmark
  216: [
    { Review_ID: 2027, reviewer_name: "Conchita Robles",  reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Vigan Cathedral is magnificent — the baroque façade, the massive bell towers, and the hushed interior all convey centuries of faith and colonial history. Attend the morning Mass if you can.", Review_Date: "2025-02-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The interior is beautifully restored. The side altars have fascinating old religious art worth inspecting closely." },
    { Review_ID: 2028, reviewer_name: "Hugo Salazar",     reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "One of the finest examples of Philippine baroque church architecture. The scale is impressive and the plaza in front gives a great view of the entire façade. Well worth a visit.", Review_Date: "2025-04-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Free to enter. Appropriate dress required — no sleeveless tops or shorts inside." },
    { Review_ID: 21603, reviewer_name: "Niña Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "St. Paul's Cathedral is one of the great baroque churches in the Philippines. The massive façade and the hushed interior convey centuries of faith and history. Attending morning Mass here is a genuinely moving experience.", Review_Date: "2025-06-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautifully restored interior with fascinating colonial-era religious art. The plaza in front offers the best view of the baroque façade. Free to enter and very welcoming." },
  ],
  // 217 Vigan Heritage Village Museum (4.3) — Landmark
  217: [
    { Review_ID: 2029, reviewer_name: "Norma Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A useful stop for understanding Vigan's heritage before walking Crisologo. The dioramas and artifacts give good context and the staff are happy to explain the local history in detail.", Review_Date: "2025-03-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Not the flashiest museum but the content is solid and interesting. Budget 30-45 minutes." },
    { Review_ID: 21702, reviewer_name: "Eddie Ramos",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A solid museum for understanding Vigan's rich colonial heritage before walking Crisologo. The weaving and pottery exhibits are particularly interesting and the staff are knowledgeable and engaging.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Well-curated exhibits with good contextual information. Budget about 45 minutes. Photography is permitted and the staff are happy to share additional stories." },
    { Review_ID: 21703, reviewer_name: "Delia Lacson",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A useful introduction to Vigan's history and traditions. The dioramas depicting colonial life are detailed and the artifacts on display give real insight into the Ilocano heritage. Worth visiting before exploring the streets.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good historical content and friendly staff. The museum is compact but well-organised. A helpful context-setter for the broader heritage zone." },
  ],
  // 218 Pagburnayan (Pottery Kilns) (4.5) — Tourist Destination
  218: [
    { Review_ID: 2030, reviewer_name: "Stella Marcos",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Pagburnayan kilns are a living continuation of a tradition unchanged since the Spanish colonial era. Watching the massive burnay jars emerge from the kilns is extraordinary.", Review_Date: "2025-04-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The potters work very early in the morning. Arrive before 8 AM to see the full process in action." },
    { Review_ID: 2031, reviewer_name: "Arnie Villanueva", reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A genuinely unique craft experience. The burnay jars have a distinctive dark glazed finish that comes from the local clay and firing method. Great souvenirs and the prices direct from the kiln are excellent.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Smaller decorative pieces make perfect gifts. The large storage jars are beautiful but challenging to transport." },
    { Review_ID: 21803, reviewer_name: "Linda Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Pagburnayan is a living tradition unlike anything else in the Philippines. Watching massive burnay jars take shape on foot-powered wheels fired by wood kilns unchanged for 400 years is profoundly humbling. Buy directly from the artisans.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "An extraordinary craft experience with genuine historical continuity. The potters are welcoming and the work is deeply skilled. One of the most authentic activities available in Vigan." },
  ],
  // 219 Plaza Burgos Night Market (4.4) — Tourist Destination
  219: [
    { Review_ID: 2032, reviewer_name: "Pearl Santos",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Plaza Burgos comes alive at night with affordable street food and local handicrafts. More relaxed than Plaza Salcedo — a good option for a quieter evening browse with good food.", Review_Date: "2025-05-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The grilled meats and fresh bibingka are highlights. Very affordable and locals-heavy which keeps the quality honest." },
    { Review_ID: 21902, reviewer_name: "Leo Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Plaza Burgos is Vigan's more authentic evening market option. Fewer tourists than Salcedo, more locals, and the street food quality is excellent — especially the fresh empanada and the grilled isaw. A great evening out.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Lively and very affordable. The grilled meats and bibingka are highlights. A pleasant local experience that rewards visitors who seek out the less-visited corners of Vigan." },
    { Review_ID: 21903, reviewer_name: "Marcia Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Plaza Burgos Night Market is a wonderful way to experience Vigan evening culture without the tour group crowds. The food is fresh, affordable, and authentically Ilocano. A highly recommended evening stop.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great variety of street food with very fair pricing. The atmosphere is festive and the local crowd keeps the quality standards honest. Very enjoyable for a relaxed dinner." },
  ],

  // ── El Nido ───────────────────────────────────────────────────────────────────
  // 301 Altrove Restaurant (4.8) — Restaurant
  301: [
    { Review_ID: 3001, reviewer_name: "Marco Bianchi",    reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Best pizza I have eaten outside of Naples. The wood-fired oven gives the crust an incredible char and the sea view while eating makes it taste even better.", Review_Date: "2025-04-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Expect a wait — the restaurant is small and deservedly popular. Book ahead or arrive early." },
    { Review_ID: 3002, reviewer_name: "Sasha Lee",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Remarkable Italian food in an unlikely location. The pasta is handmade and the tuna carpaccio with local catch was outstanding. Do not miss this place on your El Nido trip.", Review_Date: "2025-06-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Excellent wine list for a remote island restaurant. The octopus salad starter is a must." },
    { Review_ID: 30103, reviewer_name: "Tom Fernandez",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Altrove is outstanding. The pizza crust from the wood-fired oven is blistered and smoky in all the right places, and the pasta dishes are genuinely handmade. For remote El Nido, this is a remarkable culinary achievement.", Review_Date: "2025-07-02", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Excellent food quality and very attentive service. The fresh tuna starter and the prawn pasta are must-orders. A world-class restaurant in a spectacular location." },
  ],
  // 302 Pawikan Restaurant (4.5) — Restaurant
  302: [
    { Review_ID: 3003, reviewer_name: "Kim Santos",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Pawikan does excellent fresh seafood at very fair prices. The kinilaw with local tuna is exceptional and watching the sun set over the water while eating is a perfect El Nido evening.", Review_Date: "2025-03-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Order whatever came in that morning — the waiter will know. The grilled lapu-lapu is consistently outstanding." },
    { Review_ID: 3004, reviewer_name: "Pat Morales",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Consistently good seafood right on the beach. The portions are generous and the prices are reasonable for El Nido. A reliable choice for dinner after a long island-hopping day.", Review_Date: "2025-05-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Ask for a table on the sand if the weather allows. The garlic butter shrimp is excellent." },
    { Review_ID: 30203, reviewer_name: "Dana Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Pawikan is a great beachfront dining experience. The fresh seafood is the star — order whatever is freshest that day and you will not be disappointed. Watching the sunset over the water while eating is a perfect El Nido memory.", Review_Date: "2025-06-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Consistently fresh seafood at fair El Nido prices. The grilled fish with garlic rice is simple and perfect. Service is friendly and relaxed." },
  ],
  // 303 Lio Beach Resort (4.9) — Accommodation
  303: [
    { Review_ID: 3005, reviewer_name: "Camille Lopez",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Lio Beach Resort is paradise. Waking up to the sound of waves through the villa windows and stepping onto the beach with no one else around — I never wanted to leave.", Review_Date: "2025-05-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Snorkelling right off the beach is excellent. Staff arrange island tours seamlessly." },
    { Review_ID: 3006, reviewer_name: "Tom Hughes",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The best resort experience of my life. The villas are stunning, the food is world-class, and the setting is genuinely jaw-dropping. El Nido at its finest.", Review_Date: "2025-06-14", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Worth every peso. The sunset dinner on the beach was the highlight of our entire trip." },
    { Review_ID: 30303, reviewer_name: "Grace Kim",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Lio Beach Resort exceeded every expectation. The villa over the water, the pristine Lio Beach at sunrise, and the genuine warmth of the staff made this the most memorable accommodation of our entire Philippines trip.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Rooms are beautifully designed and immaculately maintained. The snorkelling off the beach is excellent and the resort arranges island tours seamlessly. Absolutely worth the splurge." },
  ],
  // 304 El Nido Resorts Miniloc Island (4.9) — Accommodation
  304: [
    { Review_ID: 3007, reviewer_name: "Rachel Park",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Miniloc Island Resort is the most beautiful place I have ever stayed. The water bungalow sits directly over a turquoise lagoon teeming with fish. Completely otherworldly.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The snorkelling straight from your deck is extraordinary. Kayaks and tours included in the rate." },
    { Review_ID: 3008, reviewer_name: "Carlos Reyes",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Truly one of the great eco-resort experiences anywhere in the world. The commitment to conservation is genuine and the isolation — accessible only by boat — makes it feel like a private island.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "All meals and tours are included and excellent. The Big Lagoon kayak tour from the resort is unmissable." },
    { Review_ID: 30403, reviewer_name: "Mia Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Miniloc Island Resort is extraordinary. The water bungalow positioned directly over the karst lagoon, the extraordinary snorkelling, and the complete island seclusion create an experience that genuinely cannot be replicated elsewhere.", Review_Date: "2025-06-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "All-inclusive and absolutely worth it. Room facilities are excellent and every detail is attended to. The boat tour of the Big Lagoon from the resort is unmissable." },
  ],
  // 305 El Nido Supermart (4.2) — Convenience Store
  305: [
    { Review_ID: 3009, reviewer_name: "Diane Cruz",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Supermart is well-stocked for a remote island town — water, snacks, sunscreen, and basic gear all available. Prices are higher than the mainland but expected given the location.", Review_Date: "2025-03-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Stock up here before heading to your resort. Good range of local snacks and cold drinks." },
    { Review_ID: 30502, reviewer_name: "Jake Hernandez",     reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "El Nido Supermart has the best stock of any convenience store in the town. Essential supplies — reef-safe sunscreen, dry bags, water — are all available and the staff are helpful for advice on where to find anything they do not carry.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Well-stocked for an island town convenience store. Prices are higher than Manila but reasonable given the remote location. Good snack selection for island tour prep." },
    { Review_ID: 30503, reviewer_name: "Rina Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A reliable stop for all island-hopping essentials. The Supermart has the widest selection of practical goods in El Nido town and the staff are knowledgeable and efficient. An essential pre-tour stop.", Review_Date: "2025-07-01", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good stock variety and clean store environment. The range of local Palawan products like honey and cashews is excellent. Worth stocking up here before heading to more remote areas." },
  ],
  // 306 Taraw Cliff (4.6) — Tourist Destination
  306: [
    { Review_ID: 3010, reviewer_name: "Ben Ramos",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Taraw Cliff hike is one of the most rewarding physical challenges in the Philippines. The view from the top — limestone karsts rising from turquoise sea — is completely worth every difficult step.", Review_Date: "2025-04-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Hire a guide — the trail is steep and the guide makes the experience far richer. Go at 5:30 AM for sunrise." },
    { Review_ID: 3011, reviewer_name: "Joy Hernandez",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Not for the faint-hearted — the last section is a near-vertical scramble on sharp limestone. But the 360-degree view at the top of the bay and islands is jaw-dropping. Worth every blister.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Wear proper shoes with grip. Bring more water than you think you need. Gloves help on the rock sections." },
    { Review_ID: 30603, reviewer_name: "Maya Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Taraw Cliff is one of the most rewarding hikes in the Philippines. The view from the summit — the entire Bacuit Archipelago spread below in shades of blue and green — is absolutely worth every difficult step of the ascent.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Breathtaking scenery and a genuine physical challenge. The guide is essential and adds wonderful context. Start at first light for the best temperatures and the most dramatic morning light on the bay." },
  ],
  // 307 Snake Island Sandbar (4.7) — Tourist Destination
  307: [
    { Review_ID: 3012, reviewer_name: "Liza Gomez",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Snake Island sandbar is extraordinary — a thin S-shaped strip of sand appearing to float between the two bays. Walking the full length with the turquoise water on both sides is incredible.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Only visible at low tide — check the schedule before planning. The drone view is stunning but the experience on foot is equally special." },
    { Review_ID: 3013, reviewer_name: "Rich Ocampo",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "One of the most photogenic stops on the Tour C itinerary. The sandbar itself is breathtaking. The area can get crowded at midday — arrive early for the best experience.", Review_Date: "2025-06-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The snorkelling off the nearby reef is also excellent. Bring an underwater camera." },
    { Review_ID: 30703, reviewer_name: "Beth Garcia",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Snake Island Sandbar is one of those places that stops you in your tracks. Walking the S-shaped sandbar with emerald water on both sides and the karst islands rising around you is a genuinely magical experience.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The scenery is extraordinary — best at low tide when the full sandbar is visible. Arrive early before the other tour boats arrive for the most peaceful walk along the sand." },
  ],
  // 308 Big Lagoon (5.0) — Tourist Destination
  308: [
    { Review_ID: 3014, reviewer_name: "Ana Lima",         reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Big Lagoon stopped my breath. Photos cannot do it justice — the limestone walls enclose you completely and the water is electric green.", Review_Date: "2025-04-03", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Kayak rental easy, guides excellent. Get there before 8 AM." },
    { Review_ID: 3015, reviewer_name: "Jade Villanueva",  reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Paddling into the Big Lagoon for the first time is one of those travel moments you remember forever. The scale and colour are completely surreal.", Review_Date: "2025-05-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Book an early slot on Tour A. The light in the lagoon before 9 AM is magical." },
    { Review_ID: 30803, reviewer_name: "Sam Ortega",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Big Lagoon defies description. Kayaking through the limestone gap and entering the vast enclosed emerald lagoon is one of the most profound natural experiences I have ever had. Nothing prepares you for the scale and colour.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Utterly breathtaking scenery — the 200m karst walls rising from electric green water are completely surreal. Go at first light and stay as long as you can. One of the great natural wonders of Asia." },
  ],
  // 309 Nacpan Beach (4.9) — Tourist Destination
  309: [
    { Review_ID: 3016, reviewer_name: "Chris Park",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nacpan Beach is four kilometres of perfection. Walked the entire length twice and barely saw twenty people. The sand is the finest powder I have felt anywhere.", Review_Date: "2025-03-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Tricycle from El Nido town is easy and cheap. Pack snacks — the small shacks close early." },
    { Review_ID: 3017, reviewer_name: "Nina dela Rosa",   reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The most beautiful beach I have ever seen. The long gentle curve, the clear water, the palms, and almost no crowds — Nacpan is what tropical beaches are supposed to look like.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The twin beach at the end of the road is equally stunning. Allow a full day here." },
    { Review_ID: 30903, reviewer_name: "Tina Park",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nacpan Beach is the most beautiful beach I have ever walked on. Four kilometres of powder-soft golden sand, coconut palms, and turquoise water with almost no crowds — this is what all beaches aspire to be.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Absolutely stunning scenery and activities — the gentle waves, the shelling, the swimming, and the long sunset walk are all perfect. The twin beach at the end is equally beautiful. Allow a full day." },
  ],
  // 310 The Happy Kitchen (4.6) — Restaurant
  310: [
    { Review_ID: 3018, reviewer_name: "Mia Torres",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Happy Kitchen lives up to its name. Cheerful staff, generous portions, and reliably good Filipino comfort food at prices that feel almost too fair for a tourist town. A regular dinner spot.", Review_Date: "2025-04-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The sinigang here is outstanding. The mango shake is enormous. Great for families and big groups." },
    { Review_ID: 3019, reviewer_name: "Joey Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Solid local restaurant that the guides all recommend for a reason. The food is consistently good and the service is fast even when full. A great bet for a straightforward quality meal.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The chicken adobo is exceptional. Very popular so go slightly early or you may wait for a table." },
    { Review_ID: 31003, reviewer_name: "Grace Dela Cruz",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Happy Kitchen is a genuine El Nido gem. The food quality is far higher than the modest setting suggests — the kare-kare pizza is inspired and the sinigang is perfectly balanced. Excellent value and wonderful staff.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Outstanding food quality and incredibly generous portions. Service is fast and friendly even when full. One of the best-value restaurants in El Nido and a place that rewards every return visit." },
  ],
  // 311 Trattoria Altrove (4.5) — Restaurant
  311: [
    { Review_ID: 3020, reviewer_name: "Gabi Russo",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Trattoria Altrove is a great casual Italian option for evenings in El Nido town. The thin-crust pizzas are excellent and the pasta is properly al dente — a high bar to clear on an island.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good value for the quality. The tiramisu is authentic and rich. Outdoor seating is pleasant in the evening." },
    { Review_ID: 3021, reviewer_name: "Andy Cruz",        reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Excellent Italian cooking in El Nido — sounds improbable but it delivers. The wood-fired pizza with local prawns is inspired and the wine selection is impressive for the location.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Friendly service and very consistent. A reliable go-to for days when you want a break from Filipino food." },
    { Review_ID: 31103, reviewer_name: "Leo Martinez",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Trattoria Altrove is a wonderful casual Italian option in El Nido. The thin-crust pizza from the wood-fired oven is properly excellent and the pasta is cooked al dente. A reliable and very enjoyable dinner spot.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great food quality and a relaxed atmosphere. The service is friendly and knowledgeable. The tiramisu is an authentic and satisfying conclusion to the meal." },
  ],
  // 312 Pangulasian Island Resort (4.9) — Accommodation
  312: [
    { Review_ID: 3022, reviewer_name: "Cecile Nguyen",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Pangulasian is the most exclusive resort in Palawan and justifiably so. The private beachfront villa, the powdery white sand, and the complete seclusion make it unlike any other resort experience.", Review_Date: "2025-03-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "All meals are superb and included. The island tour in the resort's private boat is breathtaking." },
    { Review_ID: 3023, reviewer_name: "Ian Wright",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Worth every penny. The island is entirely the resort's — just 42 villas on a pristine rainforest island. The snorkelling straight off the beach is world-class. Pure luxury done responsibly.", Review_Date: "2025-05-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The sunrise from the beach is spectacular. The spa uses local botanicals and is outstanding." },
    { Review_ID: 31203, reviewer_name: "Karen Lim",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Pangulasian is a dream. The private island setting, the stunning villas, and the extraordinary snorkelling right off the beach combine into the most complete resort experience I have ever had. Worth every peso.", Review_Date: "2025-07-02", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Room facilities are world-class and the views from the terrace are breathtaking. All-inclusive meals are superb and the private island atmosphere is completely serene and exclusive." },
  ],
  // 313 Cadlao Resort (4.7) — Accommodation
  313: [
    { Review_ID: 3024, reviewer_name: "Rosa Bello",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Cadlao Resort is a gem — overwater bungalows with direct access to the clearest water I have ever swum in. The setting against the limestone karsts at sunset is something I will never forget.", Review_Date: "2025-04-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The in-house restaurant is excellent. The resort kayak to the lagoon tour is magical." },
    { Review_ID: 3025, reviewer_name: "Sam Hughes",       reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Stunning location and a beautifully designed resort. The boat access keeps it peaceful. Slightly pricier than similar resorts but the added seclusion and the dramatic bay views justify it.", Review_Date: "2025-06-02", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Book the water cottage for the best experience. The staff go out of their way to make everything perfect." },
    { Review_ID: 31303, reviewer_name: "Iris Cruz",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Cadlao Resort is magical. The stilted bamboo cottage over crystal-clear water with the limestone karsts rising behind is a view I will never forget. The in-house restaurant is excellent and the staff are wonderfully warm.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room facilities are excellent and the location on the island is spectacular. The kayak trips to the lagoon are included and unforgettable. A superb boutique resort experience." },
  ],
  // 314 El Nido Boutique Store (4.2) — Convenience Store
  314: [
    { Review_ID: 3026, reviewer_name: "Tess Rivera",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Good selection of local crafts, island clothing, and practical travel gear for El Nido. Prices are fair and the staff are helpful with recommendations. A solid stop for souvenirs.", Review_Date: "2025-04-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The handmade shell jewellery is very reasonably priced. Good for picking up beach cover-ups and sun hats." },
    { Review_ID: 31402, reviewer_name: "Ryan Gonzales",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The El Nido Boutique Store is the best spot for practical island gear and local souvenirs. The reef-safe sunscreen and dry bags are well-priced, and the handmade shell jewellery is genuinely beautiful and affordable.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Well-stocked and clearly curated with island travellers in mind. The staff are helpful with recommendations. Good selection of local Palawan products makes it a worthwhile souvenir stop." },
    { Review_ID: 31403, reviewer_name: "Lisa Reyes",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A very useful store for El Nido island-hopping essentials. The selection of practical gear is excellent — from waterproof bags to reef-safe products — and the local honey and cashews are excellent value.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Consistently well-stocked and clean. The staff are knowledgeable and helpful. A reliable one-stop shop for everything you need before heading out on island tours." },
  ],
  // 315 Spin Laundry & Mart (4.0) — Convenience Store
  315: [
    { Review_ID: 3027, reviewer_name: "Leo Santos",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A useful combination laundry and convenience store in El Nido town. Got our clothes washed and stocked up on sunscreen and snacks all in one stop. Practical and decently priced.", Review_Date: "2025-05-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Same-day laundry service is available if you drop off in the morning. The snack selection is good." },
    { Review_ID: 31502, reviewer_name: "Ana Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Spin Laundry & Mart is a very handy combination stop in El Nido. The same-day laundry service is efficient and fairly priced, and the mart section covers all the basics — water, snacks, toiletries. Exactly what you need.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 3, subtype_feedback: "Practical and efficient. The laundry service is the real draw and it works well. The mart selection is basic but covers the essentials that island-hopping backpackers need." },
    { Review_ID: 31503, reviewer_name: "Donna Garcia",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A super practical stop for El Nido backpackers. Drop off your laundry in the morning, explore the town and nearby beaches, and collect clean clothes by evening. The mart covers all the essentials you need in between.", Review_Date: "2025-07-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good laundry service with reliable turnaround times. The mart stock is decent — better for practical items than specialty goods. Clean store and friendly, efficient staff." },
  ],
  // 316 Cadlao Lagoon (4.8) — Tourist Destination
  316: [
    { Review_ID: 3028, reviewer_name: "Emma Chen",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Cadlao Lagoon is El Nido's hidden alternative to the Big Lagoon — equally stunning but much quieter. The emerald water and the towering karst walls make it feel like a secret world.", Review_Date: "2025-03-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Get here before 8 AM for the best experience with minimal crowds. The reflection of the cliffs at sunrise is extraordinary." },
    { Review_ID: 3029, reviewer_name: "Dave Ramos",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Less visited than the Big Lagoon and arguably just as beautiful. The kayak through the lagoon with the overhanging ferns and the cathedral-like limestone walls is deeply peaceful.", Review_Date: "2025-05-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Combine with Cadlao Resort for a full day. The snorkelling around the entrance is excellent." },
    { Review_ID: 31603, reviewer_name: "Mia Fernandez",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Cadlao Lagoon is El Nido at its most serene. The kayak through the limestone gap into the emerald lagoon enclosed by 100-metre karst walls is one of the most peaceful and beautiful natural experiences in Asia.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Extraordinary scenery with remarkable tranquility — less visited than Big Lagoon and equally beautiful. The overhanging ferns and the cathedral-like walls create an unforgettable atmosphere." },
  ],
  // 317 Helicopter Island (4.7) — Tourist Destination
  317: [
    { Review_ID: 3030, reviewer_name: "Beth Kim",         reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Helicopter Island (Dilumacad) is one of those places that earns every superlative. The deserted white sand beach with the helicopter-shaped rock rising behind — breathtaking and surprisingly uncrowded.", Review_Date: "2025-04-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The snorkelling off the beach is the best of the Tour C itinerary. Bring your own mask for the clearest views." },
    { Review_ID: 3031, reviewer_name: "Gary Tan",         reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A beautiful island stop on the El Nido island-hopping circuit. The beach is pristine and the rock formation is unmistakable. Short visit but one of the most memorable stops on the tour.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The small lagoon on the other side of the island is worth the swim around the rocks. Absolutely clear water." },
    { Review_ID: 31703, reviewer_name: "Joy Hernandez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Helicopter Island is one of El Nido's great surprises. The helicopter-shaped rock silhouette, the pristine white sand beach, and the vivid coral reef just offshore all combine into one of the best stops on the island-hopping circuit.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautiful and less crowded than the main Tour A spots. The snorkelling off the beach is excellent — vivid coral and diverse fish even close to shore. A must-include on any El Nido itinerary." },
  ],
  // 318 Seven Commandos Beach (4.7) — Tourist Destination
  318: [
    { Review_ID: 3032, reviewer_name: "Vera Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Seven Commandos Beach is where you stop for lunch on Tour A and it is a great stop. The beach is gorgeous, the picnic lunch the guides prepare is surprisingly good, and the snorkelling nearby is excellent.", Review_Date: "2025-03-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The coconut trees provide good shade for a rest after the morning swimming. The sand bar at low tide is spectacular." },
    { Review_ID: 3033, reviewer_name: "Rob Lim",          reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A beautiful beach with calm clear water perfect for swimming. Gets busier as the morning progresses since it is a standard tour stop — arrive early before the other boats." , Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The beachside restaurant serves cold drinks and fresh coconuts. A very pleasant lunch stop." },
    { Review_ID: 31803, reviewer_name: "Rita Soriano",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Seven Commandos Beach is a Tour A highlight for good reason. The long stretch of white sand, the excellent snorkelling just offshore, and the beachside lunch all make for an ideal mid-tour stop. Arrive early for the most peaceful experience.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautiful scenery and excellent swimming conditions. The coconut palms provide good shade for an afternoon rest. The sandbar at low tide is particularly photogenic and worth the short walk." },
  ],
  // 319 Hidden Beach (4.9) — Tourist Destination
  319: [
    { Review_ID: 3034, reviewer_name: "Iris Valdez",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Hidden Beach is the best beach I have ever been to in my life. You swim through a narrow passage in the limestone and emerge onto a completely enclosed white sand beach with no other way in.", Review_Date: "2025-04-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Only accessible by swimming — makes it feel genuinely secret. Must-include on any El Nido itinerary." },
    { Review_ID: 3035, reviewer_name: "Mike Torres",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nothing prepares you for Swimming through the rocky passage and finding this perfect hidden lagoon on the other side. It was the single most magical moment of our entire two-week Philippines trip.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Wear a life jacket for the swim-through if you are not a strong swimmer. Very worth the mild exertion." },
    { Review_ID: 31903, reviewer_name: "Carla Lopez",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Hidden Beach is the most magical place I have ever been. Swimming through the narrow limestone passage and emerging into a completely enclosed secret cove of white sand and turquoise water is a moment I will carry with me always.", Review_Date: "2025-07-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The scenery is absolutely extraordinary — a perfectly enclosed paradise accessible only by swimming through the rock. The water inside is calm and crystal clear. An unmissable El Nido experience." },
  ],

  // ── Kyoto ────────────────────────────────────────────────────────────────────
  // 401 Nishiki Market (4.7) — Tourist Destination (market/landmark)
  401: [
    { Review_ID: 4001, reviewer_name: "Sophie Muller",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nishiki Market is extraordinary — 400 years of food culture concentrated in five blocks. I ate my way through the whole thing and still wanted more.", Review_Date: "2025-04-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Get there at opening — vendors are friendlier and the crowd is manageable before noon." },
    { Review_ID: 4002, reviewer_name: "Hiro Nakamura",    reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Nishiki is a quintessential Kyoto experience — the stalls are dense, fragrant, and endlessly interesting. The pickled vegetables and fresh mochi stalls are unmissable.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very narrow and crowded at peak times. Go on a weekday morning for a much more relaxed visit." },
    { Review_ID: 40103, reviewer_name: "Emma Yoshida",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nishiki Market is the most rewarding two hours you can spend in Kyoto. The 400-year food heritage concentrated into five fragrant, lively blocks is extraordinary — every stall has something exceptional to try.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Remarkable variety of activities — sampling, browsing, and learning about Kyoto food culture. Go early in the morning for the best experience before the crowds make it difficult to move." },
  ],
  // 402 Kikunoi Honten (5.0) — Restaurant
  402: [
    { Review_ID: 4003, reviewer_name: "Claire Beaumont",  reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Kikunoi is the definitive kaiseki experience. Twelve courses of seasonally perfect Japanese cuisine in a serene room with a garden view. I have thought about this meal every day since.", Review_Date: "2025-03-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Three Michelin stars fully deserved. Book three months ahead minimum. The sake pairing is exceptional." },
    { Review_ID: 4004, reviewer_name: "Kenji Yamamoto",   reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "As a Japanese chef I came to Kikunoi as a student of technique and left as a devoted admirer. The control, the restraint, the perfection of each ingredient — this is Japanese cooking at its highest expression.", Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The staff explain each course in English and Japanese. The haiku-printed menu is a beautiful keepsake." },
    { Review_ID: 40203, reviewer_name: "Laura Park",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Kikunoi Honten is the pinnacle of kaiseki dining. Twelve courses of seasonally perfect Japanese cuisine in a serene garden setting — the precision, the restraint, and the extraordinary ingredient quality make this a once-in-a-lifetime meal.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Three Michelin stars fully earned in every single course. The sake pairing is exceptional and the service is masterful. Book months ahead and arrive with full concentration." },
  ],
  // 403 Tawaraya Ryokan (5.0) — Accommodation
  403: [
    { Review_ID: 4005, reviewer_name: "Claire Dupont",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tawaraya is the most extraordinary inn I have ever stayed in. The tatami room, the garden, the in-room breakfast prepared by the staff — it is perfect in every detail.", Review_Date: "2025-02-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Book six months ahead — almost always fully reserved. Worth every yen." },
    { Review_ID: 4006, reviewer_name: "Lena Fischer",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Staying at Tawaraya felt like living inside a tea ceremony. The silence, the garden, the exquisite details in every corner — I understood Japanese aesthetics completely here.", Review_Date: "2025-03-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The evening kaiseki is a separate booking but absolutely essential. One of the great meals of my life." },
    { Review_ID: 40303, reviewer_name: "David Chen",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tawaraya is the most extraordinary accommodation experience of my life. The tatami room, the private garden, the in-room kaiseki breakfast served by staff who anticipate every need — it redefines what hospitality can be.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Room quality and facilities are extraordinary — every detail from the folded paper to the garden view is considered and perfect. A once-in-a-lifetime stay that justifies every yen." },
  ],
  // 404 The Ritz-Carlton Kyoto (4.9) — Accommodation
  404: [
    { Review_ID: 4007, reviewer_name: "Emma Wilson",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Ritz-Carlton Kyoto sits on the Kamogawa River and the riverside view from the room at dusk — mountains in the distance and cherry blossoms in spring — is almost impossibly beautiful.", Review_Date: "2025-04-02", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Service is flawless and the in-house restaurant is world-class. The spa overlooking the river is extraordinary." },
    { Review_ID: 4008, reviewer_name: "James Park",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "A perfect blend of Ritz-Carlton luxury and authentic Japanese design. The hinoki wood bath, the seasonal kaiseki breakfast, and the location at the heart of Kyoto make this the ideal base.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Request a Kamogawa river view room. The hotel's bicycle programme is the best way to explore Kyoto." },
    { Review_ID: 40403, reviewer_name: "Sophie Laurent",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Ritz-Carlton Kyoto is a perfect luxury hotel in the most beautiful setting. The Kamogawa River view at sunset, the Japanese spa, and the flawless service make it the ideal Kyoto base for discerning travellers.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Room facilities are exceptional — the hinoki wood bath and the seasonal kaiseki breakfast are particular highlights. The location between the mountains and the river is genuinely spectacular." },
  ],
  // 405 7-Eleven Gion-Shijo (4.3) — Convenience Store
  405: [
    { Review_ID: 4009, reviewer_name: "Laura Kim",        reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Japan's 7-Elevens are in a different class from anywhere else — the onigiri, the hot drinks, and the egg sandwiches are genuinely excellent. This Gion location is well-stocked and very clean.", Review_Date: "2025-03-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The matcha milk and the nikuman pork buns are perfect fuel for a long temple-hopping day." },
    { Review_ID: 40502, reviewer_name: "Ken Watanabe",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Japan's 7-Eleven is in an entirely different category. The onigiri are exceptional, the hot foods are genuinely good, and the coffee quality rivals dedicated cafés. This Gion location is well-stocked and perfectly clean.", Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great stock of convenience items and very fresh food. Open 24 hours which is very useful for early morning temple visits. The ATM accepts foreign cards." },
    { Review_ID: 40503, reviewer_name: "Yuki Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Gion 7-Eleven is an essential stop before an evening walking Hanamikoji. Cold beer, excellent nikuman pork buns, and everything else you could need — all at the entrance to Kyoto's most beautiful district.", Review_Date: "2025-07-02", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very clean and consistently well-stocked. The limited edition seasonal snacks are always excellent. A quintessential Japanese convenience store experience in a prime Kyoto location." },
  ],
  // 406 Fushimi Inari Shrine (4.9) — Tourist Destination
  406: [
    { Review_ID: 4010, reviewer_name: "Emily Ward",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Fushimi Inari at 5:30 AM — me, the gates, the crows, and mist. One of the most profound moments of my entire trip to Japan.", Review_Date: "2025-04-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Upper trails empty even at midday. Skip lower section if crowds bother you." },
    { Review_ID: 4011, reviewer_name: "Yuna Kim",         reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The torii gates are even more spectacular in person. The colour is more vivid than any photo and the sense of walking into another world is completely real.", Review_Date: "2025-05-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Plan two to three hours minimum if you want to reach the summit. Sturdy shoes essential." },
    { Review_ID: 40603, reviewer_name: "Marco Rossi",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Fushimi Inari is one of the world's great pilgrimage sites. The thousands of vermillion torii gates winding up through cedar forest create an atmosphere that is simultaneously sacred and completely extraordinary. Go at dawn.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The upper trails beyond the first hour of walking offer a completely different experience — serene, empty, and deeply moving. The approach through the lower gates at first light is one of the most photogenic moments in Japan." },
  ],
  // 407 Kinkaku-ji (4.8) — Tourist Destination
  407: [
    { Review_ID: 4012, reviewer_name: "Ryan Chen",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Kinkaku-ji is impossibly beautiful. The gold reflection on the pond in morning light is one of those images that stays with you for the rest of your life.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Crowds are unavoidable but move fast. Budget 45 minutes and you will see everything perfectly." },
    { Review_ID: 4013, reviewer_name: "Aya Tanaka",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Even as someone who has visited many times, Kinkaku-ji never loses its impact. The precision of the reflection, the quality of the gold leaf, and the surrounding garden — it is pure perfection.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Go as soon as it opens at 9 AM. The light on the gold is best in the morning and the crowds are still manageable." },
    { Review_ID: 40703, reviewer_name: "Nina Bauer",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Kinkaku-ji is even more breathtaking in person than in any photograph. The gold reflection on the still pond, the precise garden design, and the mountain backdrop create a scene of absolute perfection. A defining Kyoto moment.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Truly extraordinary scenery — the gold leaf on the upper floors catches the morning light magnificently. Even with the crowds it is completely worthwhile. Go at 9 AM opening for the best experience." },
  ],
  // 408 Arashiyama Bamboo Grove (4.5) — Tourist Destination
  408: [
    { Review_ID: 4014, reviewer_name: "Hannah Park",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Arashiyama Bamboo Grove is genuinely beautiful but only really special before 8 AM. After that the crowds make it hard to enjoy. Go early — it is worth it.", Review_Date: "2025-03-14", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Combine with the nearby Jojakko-ji temple for a full morning. The grove is short but lovely." },
    { Review_ID: 4015, reviewer_name: "Sam Bauer",        reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Visiting at 6:30 AM was one of my best decisions in Kyoto. The grove at dawn with just the sound of the bamboo in the wind and no other tourists — it was deeply meditative.", Review_Date: "2025-05-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The monkey park across the river and the Togetsukyo bridge are excellent additions to a morning here." },
    { Review_ID: 40803, reviewer_name: "Maria Rodriguez",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Arashiyama Bamboo Grove at 6:30 AM is deeply meditative — the bamboo towers above you, the morning light filters through, and the sound of stalks moving in the breeze is unlike anything else. Absolutely worth waking early.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautiful scenery and a genuinely unique atmospheric experience. The grove is short but the quality of the light and the sound make it special. Combine with the nearby Tenryu-ji garden for a full morning." },
  ],
  // 409 Gion District (4.8) — Tourist Destination
  409: [
    { Review_ID: 4016, reviewer_name: "Noel Reyes",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Gion at dusk is Kyoto at its most atmospheric. The paper lanterns glowing orange, the occasional geiko in full dress, the sound of a koto drifting from a teahouse — completely cinematic.", Review_Date: "2025-04-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Walk Hanamikoji Street at 6 PM. Do not photograph geiko without permission — the locals are rightfully protective." },
    { Review_ID: 4017, reviewer_name: "Elisa Bianchi",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The most beautiful urban neighbourhood I have ever walked through. The machiya townhouses, the stone pathways, the tea-house lanterns — everything about Gion feels curated to perfection.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The small galleries and craft shops in Shinmonzen Street are worth an afternoon. Some are open by appointment only." },
    { Review_ID: 40903, reviewer_name: "James Yamamoto",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Gion at dusk is Kyoto at its most cinematic. Paper lanterns glow orange, wooden machiya townhouses line the narrow streets, and the occasional maiko hurrying to an appointment creates moments of pure magic.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The atmosphere is absolutely extraordinary — Hanamikoji Street in the early evening is one of the most beautiful urban walks in the world. The craft galleries and tea houses add wonderful depth to the experience." },
  ],
  // 410 Ippudo Kyoto (4.6) — Restaurant
  410: [
    { Review_ID: 4018, reviewer_name: "Ben Chang",        reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ippudo Kyoto consistently delivers rich, deeply complex tonkotsu at exactly the right temperature. The Shiromaru Classic with extra chashu is my standard order and it is never anything less than excellent.", Review_Date: "2025-03-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Sit at the counter if you can — watching the kitchen is part of the experience. Gyoza are very good too." },
    { Review_ID: 4019, reviewer_name: "Yuki Ishida",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Reliable and excellent ramen in a beautiful setting. The broth depth is remarkable and the noodle texture is perfect. Kyoto has lighter ramen traditions but Ippudo's Hakata-style works brilliantly here.", Review_Date: "2025-05-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Queue can be 20-30 minutes at peak times. Worth the wait. The kaedama (extra noodles) for ¥100 is essential." },
    { Review_ID: 41003, reviewer_name: "Hana Sato",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ippudo Kyoto is exceptional ramen executed with real precision. The creamy tonkotsu broth is deep and complex, the noodle texture is perfect, and the chashu pork melts beautifully. An outstanding ramen experience in a beautiful setting.", Review_Date: "2025-07-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Excellent food quality and consistently good service. The counter seating lets you watch the kitchen which adds to the experience. The kaedama noodle refill is essential — order it before finishing the bowl." },
  ],
  // 411 Tofu-ya Ukai (4.8) — Restaurant
  411: [
    { Review_ID: 4020, reviewer_name: "Marie Leclerc",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tofu-ya Ukai is the most beautiful restaurant I have dined in. Each private room overlooks a traditional garden and the multi-course tofu kaiseki is simultaneously delicate and deeply satisfying.", Review_Date: "2025-04-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Book well ahead and request a garden-view room. The yudofu (simmered tofu) course is a revelation in simplicity." },
    { Review_ID: 4021, reviewer_name: "Tom Nakamura",     reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "I came sceptical about spending this much on tofu and left completely converted. The quality of the ingredients, the precision of the cooking, and the garden setting make this one of Kyoto's finest restaurants.", Review_Date: "2025-06-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The sake pairing is perfect with the delicate flavours. Leave three hours for the full experience." },
    { Review_ID: 41103, reviewer_name: "Chloe Dubois",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tofu-ya Ukai is one of the most beautiful dining experiences imaginable. Each private room overlooks a traditional garden and the multi-course tofu kaiseki demonstrates extraordinary culinary skill. The yudofu course is a revelation.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Superb food quality throughout — the freshness and delicacy of each dish is exceptional. The garden view rooms are worth requesting in advance. A genuinely world-class Japanese dining experience." },
  ],
  // 412 Kyoto Brighton Hotel (4.7) — Accommodation
  412: [
    { Review_ID: 4022, reviewer_name: "Grace Tanaka",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Kyoto Brighton is an exceptional hotel — elegant without being stuffy, with impeccable service and rooms that are genuinely luxurious. The location near the Imperial Palace is perfect for quiet walks.", Review_Date: "2025-03-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Request a room overlooking the inner garden. The breakfast is outstanding and very extensive." },
    { Review_ID: 4023, reviewer_name: "Peter Walsh",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A beautifully managed hotel with consistently warm service and spotless rooms. Slightly away from the main tourist corridor which makes it wonderfully quiet. Great cycling access to the temples.", Review_Date: "2025-05-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The hotel provides excellent bicycles free of charge. The concierge's temple recommendations are genuinely good." },
    { Review_ID: 41203, reviewer_name: "Sophie Chen",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Kyoto Brighton is an exceptional hotel. The service is impeccable without being stiff, the rooms are genuinely luxurious, and the garden views create a sense of calm that perfectly complements a Kyoto temple itinerary.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room quality and facilities are excellent — the beds are superb and the bathroom amenities are top quality. The complimentary bicycles are the best way to explore Kyoto's temple districts." },
  ],
  // 413 Piece Hostel Kyoto (4.5) — Accommodation
  413: [
    { Review_ID: 4024, reviewer_name: "Mia Rodriguez",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Piece Hostel is the best hostel I have stayed at in Japan. The common areas are beautiful — a converted machiya with exposed wooden beams. The staff are incredibly helpful with local tips.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The en-suite pod rooms are very comfortable and private. Book the Japanese room for a more authentic experience." },
    { Review_ID: 4025, reviewer_name: "Alex Chen",        reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Staying at Piece Hostel genuinely enhanced my Kyoto experience. The social atmosphere, the beautiful common room, and the excellent location near Kawaramachi made it the perfect base.", Review_Date: "2025-06-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The evening sake-tasting event they host is a wonderful way to meet other travellers. Highly recommended." },
    { Review_ID: 41303, reviewer_name: "Mia Lambert",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Piece Hostel is the best-designed accommodation at any price in Kyoto. The converted machiya common areas are beautiful, the pod rooms are private and comfortable, and the staff's local knowledge is genuinely invaluable.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Excellent facilities for a hostel — clean, comfortable pods with good soundproofing and useful storage. The social atmosphere and the beautiful common areas make it much more than a budget option." },
  ],
  // 414 FamilyMart Shijo-Kawaramachi (4.4) — Convenience Store
  414: [
    { Review_ID: 4026, reviewer_name: "Nina Sato",        reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Japanese FamilyMart is genuinely good food. The cheese tarts, the chilled matcha drinks, and the hot snacks are all excellent. This branch is well-stocked and very clean.", Review_Date: "2025-03-30", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The salted egg tart and the onigiri range are standouts. Open 24 hours — perfect for early temple visits." },
    { Review_ID: 41402, reviewer_name: "Ryo Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Japanese FamilyMart at Shijo-Kawaramachi is a genuine pleasure. The cheese tarts, the hot corn soup, and the wide range of onigiri are all excellent quality. This branch is large, extremely clean, and open 24 hours.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Outstanding stock quality for a convenience store. The seasonal limited-edition items are always excellent. The ATM accepts international cards — very useful for cash-heavy Kyoto shopping." },
    { Review_ID: 41403, reviewer_name: "Dana Fischer",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The FamilyMart at Kyoto's busiest intersection is essential. The food quality is remarkable — the packaged salads, the warm steamed buns, and the matcha soft serve are all legitimate treats. A reliable stop for any Kyoto day.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Very clean and well-organised store. The hot food section is excellent and the beverages cover every preference. Open 24 hours which makes early temple visits very practical." },
  ],
  // 415 Lawson Gion Shijo (4.3) — Convenience Store
  415: [
    { Review_ID: 4027, reviewer_name: "Dan Kim",          reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Lawson in Japan always delivers. This Gion location is very convenient for a quick snack before hitting the lantern-lit streets in the evening. The karaage chicken is legitimately excellent.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Great ATM inside for foreign cards. Hot food selection is better here than most other konbinis nearby." },
    { Review_ID: 41502, reviewer_name: "Sara Muller",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Lawson in Gion is perfectly positioned for an evening stroll. Cold Yebisu beer, excellent onigiri, and the friendly staff who always have the right change — exactly what you need before walking the lantern-lit streets.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Reliable Japanese convenience store quality. The hot food selection is better than most nearby options. The ATM accepts foreign cards which is very useful in this area." },
    { Review_ID: 41503, reviewer_name: "Anna Kimura",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A very well-run Lawson in an ideal Gion location. The karaage chicken and the cream puffs are excellent, and the chilled drinks selection covers every preference. A reliable and pleasant convenience stop in beautiful surroundings.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good stock and consistently clean store. The evening hours are particularly useful when temple visits run late. The staff are efficient and always helpful." },
  ],
  // 416 Ryoan-ji Temple & Rock Garden (4.7) — Tourist Destination
  416: [
    { Review_ID: 4028, reviewer_name: "Kira Johansson",   reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ryoan-ji's rock garden is one of the most contemplative spaces I have ever sat in. Fifteen stones in raked gravel — the simplicity forces a kind of attention that is deeply calming.", Review_Date: "2025-04-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Arrive at opening (8 AM) and sit quietly before the tour groups arrive. The garden reveals itself over time — do not rush." },
    { Review_ID: 4029, reviewer_name: "Marcus Lee",       reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The rock garden is justifiably world-famous. The pond garden surrounding the temple is also beautiful and far less visited — do not skip it on the way in. A quietly profound experience.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The restaurant in the temple garden serves excellent matcha and tofu dishes. A perfect mid-morning stop." },
    { Review_ID: 41603, reviewer_name: "Yuki Watanabe",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ryoan-ji's rock garden is profoundly contemplative. Sitting before the 15 stones in raked gravel and trying to see all of them simultaneously — it is impossible, which is the whole point. A place of genuine Zen insight.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The surrounding pond garden adds wonderful contrast. The temple restaurant serves excellent matcha and the atmosphere throughout the complex is deeply peaceful. Arrive at opening for the best experience." },
  ],
  // 417 Nijo Castle (4.6) — Landmark
  417: [
    { Review_ID: 4030, reviewer_name: "Lisa Yamamoto",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Nijo Castle is extraordinary — the nightingale floors that squeak to alert of intruders, the Momoyama-era painted rooms, and the magnificent outer walls all feel alive with shogunate history.", Review_Date: "2025-03-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The interior artwork is dazzling even in reproduction — the originals are preserved in a climate-controlled room onsite. Budget two hours." },
    { Review_ID: 4031, reviewer_name: "Oscar Bauer",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "One of the finest surviving examples of the Tokugawa shogunate's architecture and taste. The garden in spring cherry blossom season is magnificent. Well worth the entry fee.", Review_Date: "2025-05-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The audio guide is excellent. The outer grounds are large and very pleasant to walk in the late afternoon light." },
    { Review_ID: 41703, reviewer_name: "Lisa Fernandez",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Nijo Castle is extraordinary — the nightingale floors that chirp underfoot, the magnificent painted sliding doors, and the scale of the shogunate architecture all convey the power of the Tokugawa era vividly.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Rich historical atmosphere and genuinely fascinating architecture. The audio guide is excellent and the garden in cherry blossom season is magnificent. Budget two hours for the full experience." },
  ],
  // 418 Philosopher's Path (4.7) — Tourist Destination
  418: [
    { Review_ID: 4032, reviewer_name: "Amelia Clarke",    reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Philosopher's Path in autumn is absolutely stunning — the canal lined with maple trees turning red and gold, the small shrines, and the unhurried pace. A perfect Kyoto morning walk.", Review_Date: "2025-11-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Walk south to north to finish near Nanzen-ji for a spectacular temple at the end of the path." },
    { Review_ID: 4033, reviewer_name: "Jun Park",         reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A genuinely beautiful walk that deserves its name — unhurried, reflective, and full of small discoveries. The small galleries, cafés, and shrines along the way make it a very rich two-kilometre stroll.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The small tofu shop midway does excellent cold silken tofu. The path connects Nanzen-ji to Ginkaku-ji." },
    { Review_ID: 41803, reviewer_name: "Amelia Rossi",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Philosopher's Path is Kyoto walking at its most beautiful. The canal lined with cherry trees and maple, the small shrines and cafés tucked into the path, and the unhurried atmosphere create the perfect Kyoto morning.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Wonderful scenery and a deeply pleasant walking experience. The small galleries and tofu shops along the way are excellent. Walk south to north to finish at the spectacular Nanzen-ji temple." },
  ],
  // 419 Nishiki Market Stroll (4.6) — Tourist Destination
  419: [
    { Review_ID: 4034, reviewer_name: "Dana Flores",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Nishiki Market stroll experience ties together Kyoto's culinary heritage beautifully. Every stall has samples, every vendor has a story. One of the most enjoyable two hours I spent in Kyoto.", Review_Date: "2025-04-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Try the grilled mochi, the pickled plum, the fresh yuba, and the matcha soft serve. Arrive hungry." },
    { Review_ID: 4035, reviewer_name: "Ryo Kato",         reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A wonderful sensory walk through the heart of Kyoto's food culture. The quality of ingredients on display here reflects the seriousness with which Kyoto takes its culinary tradition.", Review_Date: "2025-06-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Gets very crowded after 11 AM. Visit first thing in the morning for a calmer, more authentic experience." },
    { Review_ID: 41903, reviewer_name: "Clare Morrison",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Nishiki Market Stroll is a wonderful immersion in Kyoto's extraordinary food culture. Every stall has samples, every vendor has a story, and the density of excellent food in five short blocks is completely remarkable.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Wonderful combination of scenery and activity — browsing, tasting, and learning about Kyoto's centuries-old food traditions. Arrive before 10 AM for the calmest and most rewarding experience." },
  ],

  // ── Tokyo ────────────────────────────────────────────────────────────────────
  // 501 Ichiran Ramen (4.8) — Restaurant
  501: [
    { Review_ID: 5001, reviewer_name: "Lucas Ferreira",   reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ichiran is a revelation. The individual booths, the customisation form, the perfect broth — it makes ramen feel like a profound personal experience.", Review_Date: "2025-02-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Select firm noodles and extra kaedama (noodle refill). The entire concept is genius." },
    { Review_ID: 5002, reviewer_name: "Mia Nakamura",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "I ate here four times in a week. The booth system is so calming for solo diners — just you, a bowl of perfect ramen, and complete concentration. Best ramen I have had.", Review_Date: "2025-05-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Queue moves very fast. The wait is never more than 10 minutes even on weekends." },
    { Review_ID: 50103, reviewer_name: "Grace Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Ichiran Ramen is the most focused dining experience I have ever had. The individual booth, the precise customisation form, and the perfect tonkotsu broth — every element is designed to maximise your enjoyment of one perfect bowl.", Review_Date: "2025-06-30", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Outstanding food quality with zero compromise. The noodle firmness and broth richness options allow a perfectly personalised bowl every time. The queue moves very fast and is always worth the wait." },
  ],
  // 502 Tsukiji Outer Market (4.7) — Restaurant/Market
  502: [
    { Review_ID: 5003, reviewer_name: "Ben Watanabe",     reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tsukiji Outer Market is the best food morning in Tokyo. Oysters at 7 AM, sea urchin on rice at 7:30, fresh tuna sashimi by 8 — all exceptional quality and reasonably priced.", Review_Date: "2025-03-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Arrive before 8 AM to beat the crowd and get the freshest selection. Bring cash — most vendors are cash only." },
    { Review_ID: 5004, reviewer_name: "Rika Abe",         reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "More tourist-oriented than the old inner market but the quality of the food is still very high. The tamagoyaki stalls and the fresh sushi counters are excellent.", Review_Date: "2025-05-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Weekdays are significantly less crowded. The grilled scallops on a stick are not to be missed." },
    { Review_ID: 50203, reviewer_name: "Tom Wilson",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Tsukiji Outer Market at 6 AM is the best food experience in Tokyo. Fresh sea urchin on warm rice, grilled scallops, perfectly made tamagoyaki — all at extraordinarily high quality and very reasonable prices.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Exceptional food quality across every vendor we tried. Service is quick and efficient. Arrive before 8 AM with cash for the best selection and shortest queues. A genuine Tokyo ritual." },
  ],
  // 503 Park Hyatt Tokyo (4.9) — Accommodation
  503: [
    { Review_ID: 5005, reviewer_name: "James Harrison",   reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Park Hyatt Tokyo is as iconic as the film made it feel. The New York Bar at night with the city glittering below is one of the great hotel experiences in the world.", Review_Date: "2025-03-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Request a high floor city-view room. The breakfast is exceptional and the pool feels private even at full occupancy." },
    { Review_ID: 5006, reviewer_name: "Yuki Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Every detail at the Park Hyatt is considered and perfect. The staff remember your preferences from day one. Staying here ruined every other hotel for me.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The Kozue restaurant on site is also excellent. Worth at least one dinner if you are staying." },
    { Review_ID: 50303, reviewer_name: "Diana Morris",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Park Hyatt Tokyo is a hotel that earns its legendary reputation. The 39th-floor corridor leading to your room, the New York Bar with its city panorama, and the extraordinary service at every turn — a genuinely unforgettable stay.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Room facilities are exceptional — the beds are outstanding and the bathroom amenities are world-class. The pool on the top floor with the Tokyo skyline visible through the glass is one of the great hotel experiences in Japan." },
  ],
  // 504 Aman Tokyo (5.0) — Accommodation
  504: [
    { Review_ID: 5007, reviewer_name: "Christina Bell",   reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Aman Tokyo is the most extraordinary hotel I have ever stayed in. The 33rd-floor reception area with its double-height ceiling, the paper lantern light installation, and the Mount Fuji view at dawn is completely unforgettable.", Review_Date: "2025-04-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The spa with its 30-metre swimming pool and Japanese onsen is world-class. Request a room facing the Imperial Palace gardens." },
    { Review_ID: 5008, reviewer_name: "Kenji Oishi",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Aman Tokyo achieves the impossible — a hotel that is simultaneously a pinnacle of luxury and a deeply calm, meditative space. The Japanese sensibility is present in every texture and proportion.", Review_Date: "2025-06-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The library and the tea lounge are wonderful spaces to spend an afternoon. Breakfast in the Arva restaurant is very good." },
    { Review_ID: 50403, reviewer_name: "Sophie Andersen",    reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Aman Tokyo is the most extraordinary hotel I have ever experienced. The double-height reception with paper lanterns, the 30-metre pool, and the private onsen create a sanctuary of absolute calm in the world's busiest city.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Room quality and facilities are completely unmatched. Every detail — the textures, the proportions, the service — reflects the deepest Japanese aesthetic sensibility. A once-in-a-lifetime stay." },
  ],
  // 505 Lawson Shinjuku Station (4.5) — Convenience Store
  505: [
    { Review_ID: 5009, reviewer_name: "Jamie Park",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Japanese Lawson is not a convenience store — it is a small miracle. The chicken sandwich, the cream puffs, and the onigiri are all excellent. This Shinjuku branch is large, clean, and always well-stocked.", Review_Date: "2025-03-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The Premium series items are worth the small premium. The soft-serve ice cream machine inside is a Tokyo highlight." },
    { Review_ID: 5010, reviewer_name: "Sato Keika",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "For early-morning temple trips, Lawson is essential. The hot coffee is good, the egg sandwiches are fresh, and the ability to pick up a nutritious meal for under ¥600 at 6 AM is genuinely wonderful.", Review_Date: "2025-05-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The Karaage-kun (fried chicken) is iconic Japanese convenience store food. Try it at least once." },
    { Review_ID: 50503, reviewer_name: "Mike Nakamura",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Lawson Shinjuku is a daily ritual during any Tokyo visit. The Premium Chicken Sandwich and the strawberry cream puffs are legitimately excellent, and the hot coffee at 6 AM before a full day of exploring is essential.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Consistently high food quality and very clean store. Good ATM for international cards. The seasonal limited items are always excellent. An outstanding Japanese convenience store in a perfect central location." },
  ],
  // 506 Senso-ji Temple (4.8) — Tourist Destination
  506: [
    { Review_ID: 5011, reviewer_name: "Aisha Rahman",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Senso-ji is magnificent regardless of the crowds. Go for the Nakamise shopping street alone — the vendors sell beautiful traditional crafts that make perfect gifts.", Review_Date: "2025-04-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Beautiful at any time but magical during autumn foliage. The street food vendors open from 6 AM." },
    { Review_ID: 5012, reviewer_name: "Mike Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Senso-ji at 6 AM with incense smoke drifting through the empty main hall is a spiritual experience regardless of your beliefs. The scale and the five-story pagoda in morning mist are extraordinary.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The omikuji (fortune slips) are a fun ritual. The temple grounds are completely different after dark when the lanterns are lit." },
    { Review_ID: 50603, reviewer_name: "Ella Park",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Senso-ji at dawn with incense drifting through empty halls is a profound experience regardless of your beliefs. The five-story pagoda against the morning sky and the peaceful temple gardens are deeply beautiful.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Extraordinary atmosphere and scenery at any hour. The Nakamise shopping street offers excellent traditional crafts. Visit in autumn for the most dramatic maple foliage framing the temple gate." },
  ],
  // 507 Shibuya Scramble Crossing (4.6) — Tourist Destination
  507: [
    { Review_ID: 5013, reviewer_name: "Greg Santos",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Standing in the middle of the Shibuya Scramble with hundreds of people crossing from every direction at once is unlike anything else on earth. Absurdly thrilling for something that is just a pedestrian crossing.", Review_Date: "2025-04-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "View from the Mag's Park window of Shibuya Excel Hotel or the Starbucks balcony directly above is even better than being on the crossing itself." },
    { Review_ID: 5014, reviewer_name: "Ami Yano",         reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Iconic for a reason but not much more than a very busy crossing. The area around it — the department stores, the music venues, the food halls — is where the real Tokyo experience is. Use the crossing, then explore.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Peak crossing at rush hour (5-7 PM on weekdays) is the most dramatic. The surrounding Shibuya district rewards hours of wandering." },
    { Review_ID: 50703, reviewer_name: "Rachel Kim",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Standing in the Shibuya Scramble with hundreds of people crossing from every direction simultaneously is one of Tokyo's great thrills. The view from the Starbucks balcony above transforms it into pure spectacle.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Iconic and genuinely exciting — the crossing itself is thrilling and the surrounding Shibuya district rewards hours of exploration. The scramble at peak evening rush hour is the most dramatic version." },
  ],
  // 508 teamLab Borderless (4.9) — Tourist Destination
  508: [
    { Review_ID: 5015, reviewer_name: "Priya Sharma",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "teamLab Borderless is unlike any art exhibition I have ever seen. Walking through the rooms felt like being inside a living dream. I stayed for four hours.", Review_Date: "2025-05-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Book the first slot of the day — you get photos without other visitors for the first 20 minutes." },
    { Review_ID: 5016, reviewer_name: "Oliver Schmidt",   reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The most ambitious interactive art installation I have encountered anywhere in the world. The technology is invisible — it just feels like pure magic.", Review_Date: "2025-06-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Wear comfortable shoes and a small bag. The flat shoes room is a highlight — remove socks." },
    { Review_ID: 50803, reviewer_name: "Nina Sato",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "teamLab Borderless is the most innovative art experience I have ever encountered. The interconnected rooms where digital art spills across every surface and responds to your presence create a genuinely dreamlike world. Extraordinary.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The scenery of each room is completely unlike anything else — the technology disappears and you are simply inside living art. Allow 3-4 hours minimum. The first morning slot gives you the best photographs." },
  ],
  // 509 Shimokitazawa (4.7) — Tourist Destination
  509: [
    { Review_ID: 5017, reviewer_name: "Dana Wills",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Shimokitazawa is where Tokyo is most itself — independent record stores, vintage clothing shops, tiny live music venues, and coffee roasters all crammed into a neighbourhood that feels genuinely human-scaled.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Spend a full afternoon and evening. The jazz bars and small theatres only really come alive after 8 PM." },
    { Review_ID: 5018, reviewer_name: "Kevin Mori",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The best antidote to the overwhelming scale of central Tokyo. Shimokitazawa is quiet, creative, and full of brilliant small restaurants. The vintage clothing scene here is excellent.", Review_Date: "2025-06-08", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Disk Union record store is a must for music fans. The surrounding curry shops are all very good." },
    { Review_ID: 50903, reviewer_name: "Sara Becker",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Shimokitazawa is where Tokyo reveals its most human side. The independent record stores, vintage clothing shops, tiny jazz clubs, and neighbourhood cafes create an atmosphere of creative community unlike any other Tokyo district.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Wonderful atmosphere and rich variety of activities — browsing, eating, and exploring. The vinyl record shops and the small live music venues are the highlights. Best enjoyed over a full afternoon and evening." },
  ],
  // 510 Sukiyabashi Jiro (5.0) — Restaurant
  510: [
    { Review_ID: 5019, reviewer_name: "Paul Becker",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The greatest sushi meal of my life without any qualification. Twenty courses, each piece warmed to exactly body temperature, served at the pace Jiro-san determines. A transcendent experience.", Review_Date: "2025-03-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "You must book through your hotel concierge months in advance. Arrive exactly on time. The whole experience is over in 30 minutes — savour every second." },
    { Review_ID: 5020, reviewer_name: "Fumiko Ito",       reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "As a Japanese food writer I have eaten at many great sushi restaurants. None approaches Sukiyabashi Jiro — the fish quality, the rice temperature, the knife work, the restraint. Perfection in 20 bites.", Review_Date: "2025-05-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Do not ask for soy sauce on the pieces — Jiro-san seasons each one perfectly. Follow the master's rhythm and be present." },
    { Review_ID: 51003, reviewer_name: "Alice Beaumont",     reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Sukiyabashi Jiro is perfection in twenty pieces. Every element — the fish quality, the rice temperature, the knife work, the precise timing of service — is without compromise. The greatest sushi meal I will ever eat.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The food quality is absolutely incomparable — each piece is a masterclass in restraint and precision. Follow all protocols, arrive exactly on time, and give the experience your complete attention." },
  ],
  // 511 Afuri Ramen Harajuku (4.7) — Restaurant
  511: [
    { Review_ID: 5021, reviewer_name: "Riku Sasaki",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Afuri's yuzu shio ramen is unlike anything else in Tokyo. The dashi is light, fragrant, and incredibly complex — the yuzu comes through as a subtle citrus note that brightens the entire bowl.", Review_Date: "2025-04-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Order the yuzu shio on your first visit. The gyoza are excellent. The open kitchen design is beautiful." },
    { Review_ID: 5022, reviewer_name: "Amy Liu",          reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A refreshing break from the usual rich tonkotsu — Afuri's light yuzu broth is elegant and very satisfying. The noodle texture is excellent and the chashu melts perfectly.", Review_Date: "2025-06-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Popular with locals and tourists alike. The queue moves fast. The vegan tsukemen is also surprisingly excellent." },
    { Review_ID: 51103, reviewer_name: "Gina Park",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Afuri's yuzu shio ramen is a revelation. The light, fragrant dashi broth with the subtle citrus note is the most elegant ramen I have found in Tokyo — a complete contrast to the richer styles and equally magnificent.", Review_Date: "2025-07-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Outstanding food quality and a beautiful open kitchen to watch while eating. The gyoza are a worthy companion to the ramen. Service is friendly and very efficient. An essential Tokyo ramen experience." },
  ],
  // 512 Cerulean Tower Tokyu Hotel (4.7) — Accommodation
  512: [
    { Review_ID: 5023, reviewer_name: "Sandra White",     reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Cerulean Tower delivers excellent value at the high-end of Tokyo hotels. The panoramic city views from the upper floors are spectacular and the service is consistently warm and professional.", Review_Date: "2025-03-25", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Request a high floor room facing north for the best Tokyo skyline views. The jazz bar in the basement is excellent." },
    { Review_ID: 5024, reviewer_name: "Tom Lee",          reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A well-run luxury hotel in a great Shibuya location. The rooms are comfortable and modern, the staff are excellent, and the buffet breakfast is the best hotel breakfast in this price category I have found in Tokyo.", Review_Date: "2025-05-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The Noh theatre on the basement level occasionally has performances — check the schedule when booking." },
    { Review_ID: 51203, reviewer_name: "Karen Walsh",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The Cerulean Tower is the best-value luxury hotel in Shibuya. The panoramic city views from the upper floors are spectacular and the service across every department is consistently warm and professional.", Review_Date: "2025-07-05", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Room facilities are excellent and very comfortable. The breakfast buffet is one of the best hotel breakfasts in Tokyo at this price point. The jazz lounge on the lower level is a wonderful evening option." },
  ],
  // 513 Khaosan Tokyo Kabuki Hostel (4.4) — Accommodation
  513: [
    { Review_ID: 5025, reviewer_name: "Zoe Martin",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Khaosan Kabuki is the best hostel I found in Tokyo — clean pods with blackout curtains and good soundproofing, excellent lockers, and very sociable common areas. The Asakusa location near Senso-ji is perfect.", Review_Date: "2025-04-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The shared bathrooms are spotless and the hot water never runs out. Staff speak good English and give great local advice." },
    { Review_ID: 5026, reviewer_name: "Ben Costa",        reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Great value for Tokyo. The pod beds are comfortable and private. The location means Senso-ji is a five-minute walk and the local izakayas in Asakusa are some of the best I found anywhere.", Review_Date: "2025-06-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Book the Kabuki room — the traditional Japanese aesthetic is lovely. The breakfast set is simple but good." },
    { Review_ID: 51303, reviewer_name: "Lily Okonkwo",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Khaosan Kabuki is the best-value accommodation I found in Tokyo. The traditional Asakusa machiya building is atmospheric, the pod rooms are genuinely comfortable, and the proximity to Senso-ji makes the morning temple visit effortless.", Review_Date: "2025-07-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Excellent room facilities for a hostel — good soundproofing, clean bathrooms, and reliable hot water. The rooftop terrace is a wonderful spot. Staff give great local recommendations." },
  ],
  // 514 FamilyMart Akihabara (4.3) — Convenience Store
  514: [
    { Review_ID: 5027, reviewer_name: "Hana Lee",         reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A reliable convenience store in the middle of the Akihabara electronics district. Great for a quick meal between exploring the game centres and electronics shops. Always clean and well-stocked.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good selection of manga-themed limited edition snacks unique to the Akihabara area. A fun souvenir stop." },
    { Review_ID: 51402, reviewer_name: "Kota Suzuki",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "FamilyMart Akihabara is perfectly positioned for exploring the electronics district. The food selection is excellent — the cheese tarts, the onigiri range, and the hot foods are all very good quality. A reliable break spot.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Clean and well-stocked store in an ideal Akihabara location. The limited edition anime merchandise snacks available here are excellent souvenirs. Good ATM and open 24 hours." },
    { Review_ID: 51403, reviewer_name: "Yuri Tanaka",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A useful stop in the middle of Akihabara. The food quality is the usual excellent Japanese FamilyMart standard and the snack selection includes some Akihabara-exclusive items that are fun souvenirs. Clean and efficient.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Good stock variety and very clean store. The hot food section offers a decent range for a quick meal between electronics shopping. Staff are friendly and efficient." },
  ],
  // 515 7-Eleven Shinjuku Station (4.5) — Convenience Store
  515: [
    { Review_ID: 5028, reviewer_name: "Chris Wang",       reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The 7-Eleven inside Shinjuku Station is perpetually busy but always efficient. The food selection is excellent — the tuna mayo onigiri and the hot lemon tea got me through many early morning Tokyo explorations.", Review_Date: "2025-05-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "The ATM here accepts international cards — very useful in a city that is still largely cash-based. Open 24/7." },
    { Review_ID: 5029, reviewer_name: "Mei Tanaka",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Japanese 7-Eleven is in a different category from convenience stores elsewhere. The hot foods are genuinely excellent, the coffee is very good, and the ready meals are better than most restaurants elsewhere.", Review_Date: "2025-06-22", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The seasonal limited items — sakura milk tea in spring, chestnut cream in autumn — are always excellent." },
    { Review_ID: 51503, reviewer_name: "Emi Watanabe",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Shinjuku Station 7-Eleven is a Tokyo institution. The tuna mayo onigiri, the hot corn soup, and the reliable ATM that accepts international cards make it an essential stop before any early train or temple visit.", Review_Date: "2025-07-18", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Outstanding Japanese convenience store quality. The food selection is excellent and constantly rotated with seasonal items. Open 24 hours and always clean and well-staffed." },
  ],
  // 516 Meiji Jingu Shrine (4.7) — Tourist Destination
  516: [
    { Review_ID: 5030, reviewer_name: "Ella Harrison",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Meiji Jingu is an oasis of ancient calm in the heart of modern Tokyo. Walking the forested path to the shrine, the massive torii gate appearing through the trees — a genuinely moving experience.", Review_Date: "2025-04-05", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Visit on a Sunday morning and you may witness a traditional Shinto wedding ceremony. The iris garden in June is stunning." },
    { Review_ID: 5031, reviewer_name: "Taro Kimura",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "A beautiful and serene shrine surrounded by 70,000 trees. The contrast with the busy Harajuku streets outside is striking. The treasure house nearby is small but interesting.", Review_Date: "2025-06-10", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Free to enter the shrine. The inner garden charges a small fee but the iris display in early June is worth it." },
    { Review_ID: 51603, reviewer_name: "Nora Sullivan",      reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Meiji Jingu is an extraordinary oasis of ancient calm in the heart of modern Tokyo. Walking the forested path through 70,000 trees, the massive torii gate emerging from the trees — a deeply moving and spiritually resonant experience.", Review_Date: "2025-07-12", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Beautiful scenery and profound atmosphere. The inner garden iris display in June is spectacular. Visit on a Sunday morning and you may witness a traditional Shinto wedding. Free entry to the main shrine." },
  ],
  // 517 Tokyo Skytree (4.6) — Tourist Destination
  517: [
    { Review_ID: 5032, reviewer_name: "Leo Park",         reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The view from Tokyo Skytree on a clear day is genuinely extraordinary — the city extends to the horizon in every direction and on perfect days you can see Mount Fuji floating above the haze to the west.", Review_Date: "2025-03-18", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Buy tickets online in advance to skip the long queue. Visit at sunset — the sky above and the city lights below simultaneously are spectacular." },
    { Review_ID: 5033, reviewer_name: "Naomi Sato",       reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Impressive engineering and great views. The glass floor panels on the 450m deck are not for the faint-hearted. The surrounding Solamachi shopping complex is excellent for gifts and food.", Review_Date: "2025-05-22", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Go on a clear winter day for the best visibility. The night view with the city lights is particularly beautiful." },
    { Review_ID: 51703, reviewer_name: "Jake Morrison",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "The Tokyo Skytree delivers on every level. The 360-degree view from 450 metres is extraordinary — on a clear day the city extends to the horizon and Mount Fuji floats above the haze to the west. A must-do Tokyo experience.", Review_Date: "2025-07-08", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The scenery from both observation decks is genuinely spectacular. The glass floor panels are thrilling. The surrounding Solamachi complex has excellent food and souvenirs. Buy tickets online to skip the queue." },
  ],
  // 518 Harajuku & Takeshita Street (4.5) — Tourist Destination
  518: [
    { Review_ID: 5034, reviewer_name: "Ivy Chen",         reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Takeshita Street is Tokyo's most concentrated burst of youth culture, kawaii fashion, and creative food. The crepe shops are excellent, the fashion is unlike anywhere else, and the energy is exhilarating.", Review_Date: "2025-04-15", Review_Status: "Approved", subtype_rating: 4, subtype_feedback: "Go on a weekend afternoon to see it at its most vibrant. The side streets behind Takeshita have quieter cafes and boutiques." },
    { Review_ID: 5035, reviewer_name: "Jake Wilson",      reviewer_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "Harajuku is one of Tokyo's great pleasures — the fashion creativity on display on weekends is extraordinary, and the contrast with the serene Meiji Jingu directly behind it is one of Tokyo's most satisfying paradoxes.", Review_Date: "2025-06-12", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Visit Omotesando Hills and the surrounding boutiques for higher-end fashion. The soft serve and crepes on Takeshita are a must." },
    { Review_ID: 51803, reviewer_name: "Mia Sato",      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 4, Review_Comment: "Harajuku and Takeshita Street are essential Tokyo experiences. The concentrated burst of youth fashion creativity, kawaii culture, and the excellent crepe stands make it one of the most entertaining and photogenic streets in the city.", Review_Date: "2025-07-15", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Vibrant, creative, and completely unique scenery and atmosphere. The fashion on display on weekends is extraordinary. The side streets behind Takeshita have excellent cafes and boutiques for a quieter experience." },
  ],
  // 519 Tsukiji Outer Market Morning (4.8) — Tourist Destination
  519: [
    { Review_ID: 5036, reviewer_name: "Rosa Yamamoto",    reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "A Tsukiji morning is one of Tokyo's great experiences. The fresh tuna on rice, the sea urchin hand rolls, and the hot tamagoyaki at 7 AM — it is the city's finest breakfast and a genuine institution.", Review_Date: "2025-04-28", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "Arrive at 7 AM for the freshest selection and shortest queues. Bring cash. The knife shops are worth browsing for unique gifts." },
    { Review_ID: 5037, reviewer_name: "Dan Moreau",       reviewer_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "The best morning food experience of my entire Japan trip. Everything is supremely fresh — the difference between Tsukiji sashimi and even a very good restaurant is immediately apparent. Come hungry.", Review_Date: "2025-06-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The fresh oysters and the grilled scallops on sticks are exceptional. The whole experience takes about 90 minutes done properly." },
    { Review_ID: 51903, reviewer_name: "Yuki Nakamura",      reviewer_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format", Rating: 5, Review_Comment: "A Tsukiji morning is the finest breakfast experience in Tokyo. Fresh tuna on rice, sea urchin hand rolls, hot tamagoyaki — all at extraordinary quality and very fair prices. An absolute Tokyo institution.", Review_Date: "2025-07-20", Review_Status: "Approved", subtype_rating: 5, subtype_feedback: "The scenery of the lively market and the quality of the seafood at every vendor combine into a completely unique morning ritual. Arrive at 7 AM with cash and an appetite. The knife shops are also excellent for gifts." },
  ],
};



// ── Small helpers ─────────────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(n) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-700">{n.toFixed(1)}</span>
    </div>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto z-10">{children}</div>
    </div>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }: { label: string; type?: string; placeholder: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" />
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-2">
      <h2 className="text-xl font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h2>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
}

function RegisterModal({ onClose, onSwitch }: { onClose: () => void; onSwitch: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg("");

    // 1. Register account in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // 2. (Optional) Insert user into a custom 'USERS' table if you have one
    if (data.user) {
      const { error: dbError } = await supabase.from('USERS').insert([
        {
          user_id: data.user.id,
          full_name: fullName,
          username: username,
          email: email,
        },
      ]);

      if (dbError) {
        console.error("Database table insert error:", dbError);
      }
    }

    setLoading(false);
    alert("Registration successful! Check your email to confirm your account.");
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Create Account" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        <Field label="Full Name" placeholder="e.g. Maria Santos" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label="Username" placeholder="Choose a unique username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Email Address" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        
        <button 
          onClick={handleRegister} 
          disabled={loading || !email || !password || password.length < 6}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40"
        >
          {loading ? "Registering..." : "Create Account"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setErrorMsg("");

            const { error } = await signInWithGoogle();

            if (error) {
              setErrorMsg(error.message);
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full border border-slate-200 bg-white text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm disabled:opacity-40 flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.19 2.91-7.42Z"/>
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"/>
            <path fill="#FBBC05" d="M6.54 13.84A5.85 5.85 0 0 1 6.23 12c0-.64.11-1.26.31-1.84V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.52Z"/>
            <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.2 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.64l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/>
          </svg>
          Continue with Google
        </button>
        
        <p className="text-center text-xs text-slate-400">
          Already registered? <button onClick={onSwitch} className="text-slate-700 font-semibold hover:underline">Sign in</button>
        </p>
      </div>
    </Overlay>
  );
}

function LoginModal({ onClose, onSwitch, onLogin }: { onClose: () => void; onSwitch: () => void; onLogin: (userId: string) => void }) {
  const [emailInput, setEmailInput]       = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");

    // Authenticate user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setLoading(false);
      onLogin(data.user.id); // Pass the authenticated user ID to App
      onClose();  // Closes the modal
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Sign In" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        <Field 
          label="Email Address" 
          type="email" 
          placeholder="your@email.com" 
          value={emailInput} 
          onChange={(e) => setEmailInput(e.target.value)} 
        />
        <Field 
          label="Password" 
          type="password" 
          placeholder="Your password" 
          value={passwordInput} 
          onChange={(e) => setPasswordInput(e.target.value)} 
        />
        <button 
          onClick={handleSignIn} 
          disabled={loading || !emailInput || !passwordInput}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setErrorMsg("");

            const { error } = await signInWithGoogle();

            if (error) {
              setErrorMsg(error.message);
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full border border-slate-200 bg-white text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm disabled:opacity-40 flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.19 2.91-7.42Z"/>
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"/>
            <path fill="#FBBC05" d="M6.54 13.84A5.85 5.85 0 0 1 6.23 12c0-.64.11-1.26.31-1.84V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.52Z"/>
            <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.2 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.64l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-slate-400">
          No account? <button onClick={onSwitch} className="text-slate-700 font-semibold hover:underline">Register free</button>
        </p>
      </div>
    </Overlay>
  );
}

function BusinessPartnerModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: BusinessPartner) => void }) {
  const [businessName, setBusinessName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const valid = businessName && contactPerson && contactNumber && email && username && password.length >= 8;

  const handleSubmit = () => {
    if (!valid) { setError("Please fill in all fields. Password must be at least 8 characters."); return; }
    onRegister({ businessName, contactPerson, contactNumber, email, username });
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Register as Business Partner" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">Per BR-030, registered users may list and manage travel-related establishments on the platform.</p>
        <Field label="Business Name" placeholder="e.g. Lio Beach Resort" value={businessName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)} />
        <Field label="Contact Person" placeholder="Manager's full name" value={contactPerson} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactPerson(e.target.value)} />
        <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={contactNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactNumber(e.target.value)} />
        <Field label="Email" type="email" placeholder="business@email.com" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        <Field label="Username" placeholder="Unique business username" value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
        <Field label="Password" type="password" placeholder="Minimum 8 characters" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleSubmit} disabled={!valid} className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">Register Business</button>
      </div>
    </Overlay>
  );
}

function WriteReviewModal({ dest, catType, onClose, onSubmit }: { dest: Destination; catType: CategoryType; onClose: () => void; onSubmit: (r: ReviewEntry) => Promise<void> }) {
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
          <div className="flex gap-2">{[1,2,3,4,5].map((s) => <button key={s} onClick={() => setRating(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? "text-amber-400" : "text-gray-200"}`}>★</button>)}</div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Review Comment</label>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{CAT_ICON[catType]} {catType}-Specific Feedback</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating</label>
            <select value={subRating} onChange={(e) => setSubRating(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">{[5,4,3,2,1].map((v) => <option key={v} value={v}>{v} — {["","Poor","Fair","Good","Very Good","Excellent"][v]}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Detailed Feedback</label>
            <textarea rows={2} value={subFeedback} onChange={(e) => setSubFeedback(e.target.value)} placeholder={`Specific feedback about this ${catType.toLowerCase()}…`} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
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

function EditReviewModal({
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
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{CAT_ICON[catType]} {catType}-Specific Feedback</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating</label>
            <select value={subRating} onChange={(e) => setSubRating(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v}/5</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Detailed Feedback</label>
            <textarea rows={2} value={subFeedback} onChange={(e) => setSubFeedback(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" />
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

function EditTravelPlanModal({
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
            onChange={(e) => setPlanName(e.target.value)}
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
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setNumberOfDays(e.target.value)}
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
            onChange={(e) => setBudget(e.target.value)}
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
            onChange={(e) => setStatus(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
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

function SavePlanModal({
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
            onChange={(e) => setPlanName(e.target.value)}
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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setNumberOfDays(e.target.value)}
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
            onChange={(e) => setBudget(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
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

function PartnerDashboard({ partner, listings, onAddListing, onBack, Navbar, Modals, modal, setModal }: {
  partner: BusinessPartner;
  listings: PartnerListing[];
  onAddListing: (l: Omit<PartnerListing, "id" | "status">) => void;
  onBack: () => void;
  Navbar: React.ComponentType;
  Modals: React.ComponentType;
  modal: ModalKind;
  setModal: (m: ModalKind) => void;
}) {
  const [tab, setTab] = useState<"listings" | "add">("listings");
  const [form, setForm] = useState({ name: "", category: "Restaurant", city: "Baguio City", address: "", contact: "", hours: "", description: "" });
  const [submitted, setSubmitted] = useState(false);
  const categories = ["Restaurant", "Accommodation", "Convenience Store", "Landmark", "Tourist Destination"];
  const cities = ["Baguio City", "Vigan", "El Nido", "Kyoto", "Tokyo"];

  const handleAdd = () => {
    if (!form.name || !form.address || !form.contact || !form.hours || !form.description) return;
    onAddListing(form);
    setForm({ name: "", category: "Restaurant", city: "Baguio City", address: "", contact: "", hours: "", description: "" });
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setTab("listings"); }, 1500);
  };

  const statusColor: Record<PartnerListing["status"], string> = {
    Active: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700",
    "Under Review": "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}
      <div className="pt-20 max-w-3xl mx-auto px-5 pb-16">
        {/* Header */}
        <div className="py-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#0b1f5c] mb-4 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Explore
          </button>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0b1f5c] flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🏢</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>{partner.businessName}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{partner.contactPerson} · {partner.email}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">✓ Verified Business Partner</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Listings", value: listings.length, icon: "📋" },
            { label: "Active", value: listings.filter((l) => l.status === "Active").length, icon: "✅" },
            { label: "Pending Review", value: listings.filter((l) => l.status !== "Active").length, icon: "⏳" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-[#0b1f5c]">{s.value}</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["listings", "add"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-[#0b1f5c] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-[#0b1f5c]/30"}`}>
              {t === "listings" ? "My Listings" : "+ Add Listing"}
            </button>
          ))}
        </div>

        {tab === "listings" && (
          <div className="space-y-3">
            {listings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-slate-500 font-semibold text-sm">No listings yet</p>
                <p className="text-slate-400 text-xs mt-1">Add your first establishment to start appearing on TravelMate.</p>
                <button onClick={() => setTab("add")} className="mt-4 px-5 py-2 bg-[#0b1f5c] text-white text-sm font-semibold rounded-xl hover:bg-[#162d7a] transition-all">Add Your First Listing</button>
              </div>
            ) : listings.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                  {l.category === "Restaurant" ? "🍽️" : l.category === "Accommodation" ? "🏨" : l.category === "Convenience Store" ? "🏪" : l.category === "Landmark" ? "🏛️" : "🌿"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-extrabold text-[#0b1f5c] text-sm">{l.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{l.category} · {l.city}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${statusColor[l.status]}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">📍 {l.address}</p>
                  <p className="text-xs text-slate-400">📞 {l.contact} · 🕐 {l.hours}</p>
                  {l.description && <p className="text-xs text-slate-500 mt-1.5 italic line-clamp-2">{l.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "add" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-base font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>Add a New Listing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">City</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <Field label="Establishment Name" placeholder="e.g. My Beachside Café" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label="Address" placeholder="Street, Barangay, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <Field label="Operating Hours" placeholder="e.g. 8:00 AM – 9:00 PM" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
              <textarea rows={3} placeholder="Describe your establishment, what makes it special..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </div>
            {submitted ? (
              <div className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl text-sm text-center">✓ Listing submitted for review!</div>
            ) : (
              <button onClick={handleAdd} disabled={!form.name || !form.address || !form.contact || !form.hours || !form.description} className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">Submit Listing for Review</button>
            )}
          </div>
        )}
      </div>
      <Modals />
    </div>
  );
}

type Screen = "countries" | "cities" | "city" | "destination" | "plans" | "partner-dashboard";
type ModalKind = "register" | "login" | "partner" | "review" | "plan" | "menu" | null;

interface BusinessPartner {
  businessName: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  username: string;
}

interface PartnerListing {
  id: number;
  name: string;
  category: string;
  city: string;
  address: string;
  contact: string;
  hours: string;
  description: string;
  status: "Active" | "Pending" | "Under Review";
}

interface SearchHistoryEntry {
  search_id: number;
  user_id: string;
  country_id: string | null;
  city_id: string | null;
  category_id: number | null;
  search_category: string;
  search_keyword: string;
  search_date_time: string | null;
  country_name: string;
  city_name: string;
}

function SearchHistoryModal({ history, onClose }: { history: SearchHistoryEntry[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-[#0b1f5c]">Search History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your previous searches</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">🔎</div>
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
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">🔎</div>
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

export default function App() {
  const [screen, setScreen]           = useState<Screen>("countries");
  const [country, setCountry]         = useState<Country | null>(null);
  const [city, setCity]               = useState<City | null>(null);
  const [dest, setDest]               = useState<Destination | null>(null);
  const [activeCatId, setActiveCatId] = useState<number>(5);
  const [dbDestinations, setDbDestinations] = useState<Destination[]>([]);
  const [dbCities, setDbCities] = useState<any[]>([]);
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [modal, setModal]             = useState<ModalKind>(null);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [liveReviews, setLiveReviews] = useState<Record<number, ReviewEntry[]>>({});
  const [dbTravelPlans, setDbTravelPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewEntry | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const [partnerData, setPartnerData] = useState<BusinessPartner | null>(null);
  const [partnerListings, setPartnerListings] = useState<PartnerListing[]>([]);
  const citiesScrollRef = useRef<HTMLDivElement>(null);
  const scrollCities = useCallback((dir: "left" | "right") => {
    if (citiesScrollRef.current) citiesScrollRef.current.scrollBy({ left: dir === "right" ? 760 : -760, behavior: "smooth" });
  }, []);

  useEffect(() => {
  // Restore the existing Supabase session when the page loads
  const restoreSession = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error restoring session:", error);
      setIsLoggedIn(false);
      setCurrentUserId(null);
      return;
    }

    if (session?.user) {
      setIsLoggedIn(true);
      setCurrentUserId(session.user.id);

      console.log("Session restored:", session.user.id);
    } else {
      setIsLoggedIn(false);
      setCurrentUserId(null);

      console.log("No active session");
    }
  };

  restoreSession();

  // Keep React state synchronized with Supabase Auth
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event);

    if (session?.user) {
      setIsLoggedIn(true);
      setCurrentUserId(session.user.id);
    } else {
      setIsLoggedIn(false);
      setCurrentUserId(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!currentUserId) {
    setSearchHistory([]);
    return;
  }

  const loadSearchHistory = async () => {
    const { data, error } = await supabase
      .from("SEARCH_HISTORY")
      .select("search_id, user_id, country_id, city_id, category_id, search_category, search_keyword, search_date_time")
      .eq("user_id", currentUserId)
      .order("search_id", { ascending: false });

    if (error) {
      console.error("SEARCH_HISTORY load error:", error);
      setSearchHistory([]);
      return;
    }

    const formattedHistory: SearchHistoryEntry[] = (data ?? []).map((item: any) => {
      const dbCity = dbCities.find((cityItem: any) => String(cityItem.city_id ?? cityItem.City_ID ?? "") === String(item.city_id ?? ""));
      const dbCountry = dbCountries.find((countryItem: any) => String(countryItem.country_id ?? countryItem.Country_ID ?? "") === String(item.country_id ?? ""));
      return {
        search_id: Number(item.search_id),
        user_id: item.user_id,
        country_id: item.country_id ?? null,
        city_id: item.city_id ?? null,
        category_id: item.category_id ?? null,
        search_category: item.search_category ?? "",
        search_keyword: item.search_keyword ?? "",
        search_date_time: item.search_date_time ?? null,
        country_name: dbCountry?.country_name ?? dbCountry?.Country_Name ?? "",
        city_name: dbCity?.city_name ?? dbCity?.City_Name ?? "",
      };
    });
    setSearchHistory(formattedHistory);
  };

  loadSearchHistory();
}, [currentUserId, dbCities, dbCountries]);

  const loadTravelPlans = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setDbTravelPlans([]);
        return;
      }

      const { data, error } = await supabase
        .from("TRAVEL_PLAN")
        .select(`
          travelplan_id,
          category_id,
          destination_id,
          plan_name,
          start_date,
          number_of_days,
          budget,
          travel_status,
          created_date,
          notes
        `)
        .eq("user_id", user.id)
        .order("travelplan_id", { ascending: false });

      if (error) {
        console.error("TRAVEL_PLAN query error:", error);
        setDbTravelPlans([]);
        return;
      }

      const plans = data ?? [];

      // Resolve the destination/category names from the data already loaded
      // from the live database. This keeps the Travel Plans screen connected
      // to the same DESTINATION data used throughout the app.
      const { data: categories, error: categoryError } = await supabase
        .from("CATEGORY")
        .select("category_id, category_type");

      if (categoryError) {
        console.error("CATEGORY query error:", categoryError);
      }

      const categoryMap = new Map(
        (categories ?? []).map((category: any) => [
          Number(category.category_id),
          category.category_type ?? "",
        ])
      );

      const enrichedPlans = plans.map((plan: any) => {
        const destination = dbDestinations.find(
          (item) => item.Destination_ID === Number(plan.destination_id)
        );

        return {
          ...plan,
          destination_name: destination?.Destination_Name ?? `Destination #${plan.destination_id}`,
          category_name:
            categoryMap.get(Number(plan.category_id)) || "",
        };
      });

      console.log("TRAVEL_PLAN data:", enrichedPlans);
      setDbTravelPlans(enrichedPlans);
    } catch (error) {
      console.error("Error loading travel plans:", error);
      setDbTravelPlans([]);
    }
  };

  const saveReviewToSupabase = async (
  review: ReviewEntry,
  dest: Destination,
  catType: CategoryType
): Promise<number> => {
  try {
    // 1. Get the currently logged-in Supabase user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to write a review.");
    }

    // 2. Make sure this user exists in USER_INFO
    const { data: userInfo, error: userInfoError } = await supabase
      .from("USER_INFO")
      .select("user_id, full_name, username")
      .eq("user_id", user.id)
      .single();

    if (userInfoError || !userInfo) {
      throw new Error(
        "Your account was not found in USER_INFO. Please contact the administrator."
      );
    }

    // 3. Get the next Review_ID
    const { data: reviewIds, error: reviewIdError } = await supabase
      .from("REVIEW")
      .select("Review_ID")
      .order("Review_ID", { ascending: false })
      .limit(1);

    if (reviewIdError) {
      throw reviewIdError;
    }

    const nextReviewId =
      reviewIds && reviewIds.length > 0
        ? Number(reviewIds[0].Review_ID) + 1
        : 1;

    // 4. Insert the main REVIEW record
    const { error: reviewError } = await supabase
      .from("REVIEW")
      .insert({
        Review_ID: nextReviewId,
        Rating: review.Rating,
        Review_Comment: review.Review_Comment,
        Review_Status: review.Review_Status,
        user_id: user.id,
      });

    if (reviewError) {
      throw reviewError;
    }

    // 5. Find the category-specific destination record
    let childRecord: any = null;
    let childError: any = null;

    if (catType === "Restaurant") {
      const result = await supabase
        .from("RESTAURANT")
        .select("restaurant_id")
        .eq("destination_id", dest.Destination_ID)
        .single();

      childRecord = result.data;
      childError = result.error;
    }

    if (catType === "Accommodation") {
      const result = await supabase
        .from("ACCOMMODATIONS")
        .select("accommodation_id")
        .eq("destination_id", dest.Destination_ID)
        .single();

      childRecord = result.data;
      childError = result.error;
    }

    if (catType === "Convenience Store") {
      const result = await supabase
        .from("CONVENIENCE_STORES")
        .select("convenience_store_id")
        .eq("destination_id", dest.Destination_ID)
        .single();

      childRecord = result.data;
      childError = result.error;
    }

    if (catType === "Landmark") {
      const result = await supabase
        .from("LANDMARK")
        .select("Landmark_ID")
        .eq("destination_id", dest.Destination_ID)
        .single();

      childRecord = result.data;
      childError = result.error;
    }

    if (catType === "Tourist Destination") {
      const result = await supabase
        .from("TOURIST_DESTINATION")
        .select("Tourist_Destination_ID")
        .eq("destination_id", dest.Destination_ID)
        .single();

      childRecord = result.data;
      childError = result.error;
    }

    if (childError || !childRecord) {
      // Remove the REVIEW we just created so we don't leave an orphan record.
      await supabase
        .from("REVIEW")
        .delete()
        .eq("Review_ID", nextReviewId);

      throw new Error(
        `Could not find the ${catType.toLowerCase()} record for this destination.`
      );
    }

    // 6. Get the next ID for the category-specific review table
    let childReviewTable = "";
    let childReviewIdColumn = "";

    if (catType === "Restaurant") {
      childReviewTable = "RESTAURANT_REVIEW";
      childReviewIdColumn = "Restaurant_Review_ID";
    }

    if (catType === "Accommodation") {
      childReviewTable = "ACCOMMODATIONS_REVIEW";
      childReviewIdColumn = "Accom_Review_ID";
    }

    if (catType === "Convenience Store") {
      childReviewTable = "CONVENIENCE_STORE_REVIEW";
      childReviewIdColumn = "Store_Review_ID";
    }

    if (catType === "Landmark") {
      childReviewTable = "LANDMARK_REVIEW";
      childReviewIdColumn = "Landmark_Review_ID";
    }

    if (catType === "Tourist Destination") {
      childReviewTable = "TOURIST_DESTINATION_REVIEW";
      childReviewIdColumn = "TouriDest_ID";
    }

    const { data: childReviewIds, error: childReviewIdError } =
      await supabase
        .from(childReviewTable)
        .select(childReviewIdColumn)
        .order(childReviewIdColumn, { ascending: false })
        .limit(1);

    if (childReviewIdError) {
      await supabase
        .from("REVIEW")
        .delete()
        .eq("Review_ID", nextReviewId);

      throw childReviewIdError;
    }

    let nextChildReviewId = 1;

    if (childReviewIds && childReviewIds.length > 0) {
      const firstChildReview = childReviewIds[0] as any;
      nextChildReviewId = Number(firstChildReview[childReviewIdColumn]) + 1;
    }

    // 7. Insert the category-specific review
    let categoryReview: Record<string, any> = {
      [childReviewIdColumn]: nextChildReviewId,
      Review_ID: nextReviewId,
      user_id: user.id,
    };

    if (catType === "Restaurant") {
      categoryReview = {
        ...categoryReview,
        Restaurant_Rating: review.subtype_rating,
        Restaurant_Feedback: review.subtype_feedback || null,
        restaurant_id: childRecord.restaurant_id,
      };
    }

    if (catType === "Accommodation") {
      categoryReview = {
        ...categoryReview,
        Accommodation_Rating: review.subtype_rating,
        Accom_Feedback: review.subtype_feedback || null,
        accommodation_id: childRecord.accommodation_id,
      };
    }

    if (catType === "Convenience Store") {
      categoryReview = {
        ...categoryReview,
        Store_Rating: review.subtype_rating,
        Store_Feedback: review.subtype_feedback || null,
        convenience_store_id: childRecord.convenience_store_id,
      };
    }

    if (catType === "Landmark") {
      categoryReview = {
        ...categoryReview,
        Landmark_Rating: review.subtype_rating,
        Landmark_Feedback: review.subtype_feedback || null,
        Landmark_ID: childRecord.Landmark_ID,
      };
    }

    if (catType === "Tourist Destination") {
      categoryReview = {
        ...categoryReview,
        Tourist_Destination_Rating: review.subtype_rating,
        Tourist_Destination_Feedback: review.subtype_feedback || null,
        Tourist_Destination_ID: childRecord.Tourist_Destination_ID,
      };
    }

    const { error: categoryReviewError } = await supabase
      .from(childReviewTable)
      .insert(categoryReview);

    if (categoryReviewError) {
      // Clean up the main REVIEW if the category-specific insert fails.
      await supabase
        .from("REVIEW")
        .delete()
        .eq("Review_ID", nextReviewId);

      throw categoryReviewError;
    }

    console.log("Review saved successfully:", {
      Review_ID: nextReviewId,
      user_id: user.id,
      destination_id: dest.Destination_ID,
      category: catType,
    });

    return nextReviewId;

  } catch (error: any) {
    console.error("Error saving review:", error);
    throw error;
  }
};

const deleteReviewFromSupabase = async (review: ReviewEntry): Promise<void> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to delete a review.");
    }

    // Ownership is enforced by the DELETE RLS policy below.
    // Do not perform a separate SELECT ownership check here because
    // SELECT RLS can prevent the row from being returned even when the
    // authenticated user is the owner.

    const childTables = [
      "RESTAURANT_REVIEW",
      "ACCOMMODATIONS_REVIEW",
      "CONVENIENCE_STORE_REVIEW",
      "LANDMARK_REVIEW",
      "TOURIST_DESTINATION_REVIEW",
    ];

    for (const table of childTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("Review_ID", review.Review_ID)
        .eq("user_id", user.id);

      if (error) throw error;
    }

    const { data: deletedReview, error: reviewError } = await supabase
      .from("REVIEW")
      .delete()
      .eq("Review_ID", review.Review_ID)
      .eq("user_id", user.id)
      .select();

    if (reviewError) throw reviewError;

    if (!deletedReview || deletedReview.length === 0) {
      throw new Error("Your review could not be deleted.");
    }
  };

const loadReviewsFromSupabase = async () => {
  try {
    console.log("--- LOADING REVIEWS FROM SUPABASE ---");

    // Load the main REVIEW records
    const { data: reviews, error: reviewError } = await supabase
      .from("REVIEW")
      .select(`
        Review_ID,
        Rating,
        Review_Comment,
        Review_Date,
        Review_Status,
        user_id
      `)
      .order("Review_Date", { ascending: false });

    if (reviewError) {
      console.error("REVIEW query error:", reviewError);
      return;
    }

    if (!reviews || reviews.length === 0) {
      console.log("No Supabase reviews found.");
      setLiveReviews({});
      return;
    }

    // Load user information for reviewer names
    const userIds = [
      ...new Set(
        reviews
          .map((review) => review.user_id)
          .filter(Boolean)
      ),
    ];

    let userMap: Record<string, { full_name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: users, error: userError } = await supabase
        .from("USER_INFO")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (userError) {
        console.error("USER_INFO query error:", userError);
      } else {
        userMap = Object.fromEntries(
          (users ?? []).map((user) => [
            user.user_id,
            {
              full_name: user.full_name,
            },
          ])
        );
      }
    }

    // Load all category-specific review records
    const [
      restaurantResult,
      accommodationResult,
      convenienceResult,
      landmarkResult,
      touristResult,
    ] = await Promise.all([
      supabase
        .from("RESTAURANT_REVIEW")
        .select(
          "Review_ID, Restaurant_Rating, Restaurant_Feedback, restaurant_id"
        ),

      supabase
        .from("ACCOMMODATIONS_REVIEW")
        .select(
          "Review_ID, Accommodation_Rating, Accom_Feedback, accommodation_id"
        ),

      supabase
        .from("CONVENIENCE_STORE_REVIEW")
        .select(
          "Review_ID, Store_Rating, Store_Feedback, convenience_store_id"
        ),

      supabase
        .from("LANDMARK_REVIEW")
        .select(
          "Review_ID, Landmark_Rating, Landmark_Feedback, Landmark_ID"
        ),

      supabase
        .from("TOURIST_DESTINATION_REVIEW")
        .select(
          "Review_ID, Tourist_Destination_Rating, Tourist_Destination_Feedback, Tourist_Destination_ID"
        ),
    ]);

    if (restaurantResult.error) {
      console.error(
        "RESTAURANT_REVIEW query error:",
        restaurantResult.error
      );
    }

    if (accommodationResult.error) {
      console.error(
        "ACCOMMODATIONS_REVIEW query error:",
        accommodationResult.error
      );
    }

    if (convenienceResult.error) {
      console.error(
        "CONVENIENCE_STORE_REVIEW query error:",
        convenienceResult.error
      );
    }

    if (landmarkResult.error) {
      console.error(
        "LANDMARK_REVIEW query error:",
        landmarkResult.error
      );
    }

    if (touristResult.error) {
      console.error(
        "TOURIST_DESTINATION_REVIEW query error:",
        touristResult.error
      );
    }

    // Build lookup maps using Review_ID
    const restaurantReviews = new Map(
      (restaurantResult.data ?? []).map((r) => [r.Review_ID, r])
    );

    const accommodationReviews = new Map(
      (accommodationResult.data ?? []).map((r) => [r.Review_ID, r])
    );

    const convenienceReviews = new Map(
      (convenienceResult.data ?? []).map((r) => [r.Review_ID, r])
    );

    const landmarkReviews = new Map(
      (landmarkResult.data ?? []).map((r) => [r.Review_ID, r])
    );

    const touristReviews = new Map(
      (touristResult.data ?? []).map((r) => [r.Review_ID, r])
    );

    // Load destination IDs through the category-specific tables
    const [
      restaurantDestinations,
      accommodationDestinations,
      convenienceDestinations,
      landmarkDestinations,
      touristDestinations,
    ] = await Promise.all([
      supabase
        .from("RESTAURANT")
        .select("restaurant_id, destination_id"),

      supabase
        .from("ACCOMMODATIONS")
        .select("accommodation_id, destination_id"),

      supabase
        .from("CONVENIENCE_STORES")
        .select("convenience_store_id, destination_id"),

      supabase
        .from("LANDMARK")
        .select("Landmark_ID, destination_id"),

      supabase
        .from("TOURIST_DESTINATION")
        .select("Tourist_Destination_ID, destination_id"),
    ]);

    // Maps from child record ID → destination ID
    const restaurantDestinationMap = new Map(
      (restaurantDestinations.data ?? []).map((r) => [
        r.restaurant_id,
        r.destination_id,
      ])
    );

    const accommodationDestinationMap = new Map(
      (accommodationDestinations.data ?? []).map((r) => [
        r.accommodation_id,
        r.destination_id,
      ])
    );

    const convenienceDestinationMap = new Map(
      (convenienceDestinations.data ?? []).map((r) => [
        r.convenience_store_id,
        r.destination_id,
      ])
    );

    const landmarkDestinationMap = new Map(
      (landmarkDestinations.data ?? []).map((r) => [
        r.Landmark_ID,
        r.destination_id,
      ])
    );

    const touristDestinationMap = new Map(
      (touristDestinations.data ?? []).map((r) => [
        r.Tourist_Destination_ID,
        r.destination_id,
      ])
    );

    const loadedReviews: Record<number, ReviewEntry[]> = {};

    for (const review of reviews) {
      let destinationId: number | null = null;
      let subtypeRating = Number(review.Rating ?? 0);
      let subtypeFeedback = "";
      let reviewerName =
        userMap[review.user_id]?.full_name || "User";

      // Restaurant
      const restaurantReview = restaurantReviews.get(review.Review_ID);

      if (restaurantReview) {
        destinationId =
          restaurantDestinationMap.get(
            restaurantReview.restaurant_id
          ) ?? null;

        subtypeRating = Number(
          restaurantReview.Restaurant_Rating ?? review.Rating ?? 0
        );

        subtypeFeedback =
          restaurantReview.Restaurant_Feedback ?? "";
      }

      // Accommodation
      const accommodationReview =
        accommodationReviews.get(review.Review_ID);

      if (accommodationReview) {
        destinationId =
          accommodationDestinationMap.get(
            accommodationReview.accommodation_id
          ) ?? null;

        subtypeRating = Number(
          accommodationReview.Accommodation_Rating ??
            review.Rating ??
            0
        );

        subtypeFeedback =
          accommodationReview.Accom_Feedback ?? "";
      }

      // Convenience Store
      const convenienceReview =
        convenienceReviews.get(review.Review_ID);

      if (convenienceReview) {
        destinationId =
          convenienceDestinationMap.get(
            convenienceReview.convenience_store_id
          ) ?? null;

        subtypeRating = Number(
          convenienceReview.Store_Rating ??
            review.Rating ??
            0
        );

        subtypeFeedback =
          convenienceReview.Store_Feedback ?? "";
      }

      // Landmark
      const landmarkReview =
        landmarkReviews.get(review.Review_ID);

      if (landmarkReview) {
        destinationId =
          landmarkDestinationMap.get(
            landmarkReview.Landmark_ID
          ) ?? null;

        subtypeRating = Number(
          landmarkReview.Landmark_Rating ??
            review.Rating ??
            0
        );

        subtypeFeedback =
          landmarkReview.Landmark_Feedback ?? "";
      }

      // Tourist Destination
      const touristReview =
        touristReviews.get(review.Review_ID);

      if (touristReview) {
        destinationId =
          touristDestinationMap.get(
            touristReview.Tourist_Destination_ID
          ) ?? null;

        subtypeRating = Number(
          touristReview.Tourist_Destination_Rating ??
            review.Rating ??
            0
        );

        subtypeFeedback =
          touristReview.Tourist_Destination_Feedback ?? "";
      }

      // If we cannot connect the review to a destination,
      // don't display it in the destination review UI.
      if (destinationId === null) {
        console.warn(
          "Could not determine destination for review:",
          review.Review_ID
        );
        continue;
      }

      const formattedReview: ReviewEntry = {
        Review_ID: Number(review.Review_ID),
        user_id: review.user_id ?? undefined,
        reviewer_name: reviewerName,
        reviewer_avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&auto=format",
        Rating: Number(review.Rating ?? 0),
        Review_Comment: review.Review_Comment ?? "",
        Review_Date: review.Review_Date ?? "",
        Review_Status:
          review.Review_Status === "Approved"
            ? "Approved"
            : "Pending",
        subtype_rating: subtypeRating,
        subtype_feedback: subtypeFeedback,
      };

      if (!loadedReviews[destinationId]) {
        loadedReviews[destinationId] = [];
      }

      loadedReviews[destinationId].push(formattedReview);
    }

    setLiveReviews(loadedReviews);

    console.log(
      "Supabase reviews loaded:",
      loadedReviews
    );
  } catch (error) {
    console.error(
      "Error loading reviews from Supabase:",
      error
    );
  }
};

useEffect(() => {
  const loadData = async () => {
    console.log("--- LOADING CITY + DESTINATIONS FROM SUPABASE ---");

    // Load actual COUNTRY records for Search History labels.
    const { data: countryData, error: countryError } = await supabase
      .from('COUNTRY')
      .select('*');

    if (countryError) {
      console.error("COUNTRY query error:", countryError);
    } else {
      setDbCountries(countryData ?? []);
    }

    // Load actual CITY records
    const { data: cityData, error: cityError } = await supabase
      .from('CITY')
      .select('*');

    if (cityError) {
      console.error("CITY query error:", cityError);
    } else {
      console.log("CITY raw data:", cityData);
      setDbCities(cityData ?? []);
    }

    // Load DESTINATION records.
    // CATEGORY_ID remains the thematic Supabase category (Nature, Recreational,
    // Historical, etc.). The five UI tabs come from the destination child tables.
    const { data, error } = await supabase
      .from('DESTINATION')
      .select('*');

    if (error) {
      console.error("DESTINATION query error:", error);
      return;
    }

    // Load the five child tables that define the application's UI place type.
    const [restaurantRes, accommodationRes, convenienceRes, landmarkRes, touristRes] = await Promise.all([
      supabase.from('RESTAURANT').select('destination_id'),
      supabase.from('ACCOMMODATIONS').select('destination_id'),
      supabase.from('CONVENIENCE_STORES').select('destination_id'),
      supabase.from('LANDMARK').select('destination_id'),
      supabase.from('TOURIST_DESTINATION').select('destination_id'),
    ]);

    const childResults = [
      { name: 'RESTAURANT', typeId: 1, result: restaurantRes },
      { name: 'ACCOMMODATIONS', typeId: 2, result: accommodationRes },
      { name: 'CONVENIENCE_STORES', typeId: 3, result: convenienceRes },
      { name: 'LANDMARK', typeId: 4, result: landmarkRes },
      { name: 'TOURIST_DESTINATION', typeId: 5, result: touristRes },
    ];

    childResults.forEach(({ name, result }) => {
      if (result.error) console.error(`${name} query error:`, result.error);
    });

    const placeTypeByDestination = new Map<number, number>();
    childResults.forEach(({ typeId, result }) => {
      (result.data ?? []).forEach((row: any) => {
        const destinationId = Number(row.destination_id);
        if (Number.isFinite(destinationId)) {
          placeTypeByDestination.set(destinationId, typeId);
        }
      });
    });

    console.log("DESTINATION raw row count:", data?.length ?? 0);
    console.log("DESTINATION raw data:", data);
    console.log("UI place types by destination:", Object.fromEntries(placeTypeByDestination));

    if (!data) {
      setDbDestinations([]);
      return;
    }

    const formatted: Destination[] = data.map((item: any) => ({
      Destination_ID: Number(item.destination_id),
      City_ID: item.city_id,
      Category_ID: item.category_id,
      Place_Type_ID: placeTypeByDestination.get(Number(item.destination_id)),
      Destination_Name: item.destination_name ?? '',
      Destination_Description: item.destination_description ?? '',
      Address: item.address ?? '',
      Contact_Number: item.contact_number ?? '',
      Operating_Hours: item.operating_hours ?? '',
      Destination_Image:
        item.destination_image ??
        'https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=600&h=400&fit=crop&auto=format',
      Rating: Number(item.rating ?? 4.5)
    }));

    console.log("DESTINATION formatted data:", formatted);
    setDbDestinations(formatted);

    await loadReviewsFromSupabase();
    
  };

  loadData();
}, []);

function go(s: Screen) {
  setScreen(s);
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (s === "plans") {
    loadTravelPlans();
  }
}
  function pickCountry(c: Country) { setCountry(c); go("cities"); }
function pickCity(c: City) {
  setCity(c);

  // Find the real CITY record from Supabase using the city name
  const dbCity = dbCities.find((item: any) => {
    const dbCityName = item.city_name ?? item.City_Name ?? '';
    return dbCityName.trim().toLowerCase() === c.City_Name.trim().toLowerCase();
  });

  const dbCityId = dbCity?.city_id ?? dbCity?.City_ID;

  console.log("Selected frontend city:", c);
  console.log("Matching Supabase city:", dbCity);
  console.log("Supabase City UUID:", dbCityId);

  // Find destinations using the REAL Supabase city UUID
  const cityDestinations = dbCityId
    ? dbDestinations.filter(
        (d) => normId(d.City_ID) === normId(dbCityId)
      )
    : [];

  console.log("Destinations for selected city:", cityDestinations);

  // The UI tabs are determined by the five child tables, not by
  // DESTINATION.category_id (which is a thematic category in Supabase).
  const present = [
    ...new Set(
      cityDestinations
        .map((d) => d.Place_Type_ID)
        .filter((id): id is number => id !== null && id !== undefined)
    )
  ];

  setActiveCatId(
    present.includes(5)
      ? 5
      : (present[0] ?? 5)
  );

  go("city");
}

  function pickDest(d: Destination) { setDest(d); go("destination"); }

  const citiesForCountry = country ? CITIES.filter((c) => c.Country_ID === country.Country_ID) : [];
  const activeDestinations = dbDestinations;
  const dbCityForSelectedCity = city
    ? dbCities.find((item: any) => {
        const dbCityName = item.city_name ?? item.City_Name ?? '';
        return dbCityName.trim().toLowerCase() === city.City_Name.trim().toLowerCase();
      })
    : null;

  const selectedDbCityId =
    dbCityForSelectedCity?.city_id ??
    dbCityForSelectedCity?.City_ID ??
    null;

  const dbDestsForCity = selectedDbCityId
    ? activeDestinations.filter(
        (d) => normId(d.City_ID) === normId(selectedDbCityId)
      )
    : [];

  // If this city exists in Supabase but has no destinations yet, keep its
  // existing static demo data. If it has DB destinations, DB is authoritative.
  const staticDestsForCity = city
    ? DESTINATIONS.filter((d) => d.City_ID === city.City_ID)
    : [];
  const destsForCity = dbDestsForCity.length > 0 ? dbDestsForCity : staticDestsForCity;

  // The five UI tabs are based on child-table type IDs.
  const presentCatIds = CATEGORIES
    .filter((cat) => destsForCity.some(
      (d) => (d.Place_Type_ID ?? d.Category_ID) === cat.Category_ID
    ))
    .map((cat) => cat.Category_ID);

  const filteredDests = destsForCity.filter(
    (d) => (d.Place_Type_ID ?? d.Category_ID) === activeCatId
  );

  // Place_Type_ID controls the UI category. Category_ID remains the thematic
  // Supabase CATEGORY value and is not used to choose the five tabs.
  const destCat = dest
    ? CATEGORIES.find((c) => c.Category_ID === (dest.Place_Type_ID ?? dest.Category_ID)) ?? null
    : null;
  const destReviews      = dest ? [...(REVIEWS[dest.Destination_ID] ?? []), ...(liveReviews[dest.Destination_ID] ?? [])] : [];
  const searchText = search.trim().toLowerCase();
  const shownCountries = COUNTRIES.filter((c) => {
    const countryMatches = !searchText || c.Country_Name.toLowerCase().includes(searchText);
    const cityMatches = !searchText || CITIES.some(
      (ci) => ci.Country_ID === c.Country_ID && ci.City_Name.toLowerCase().includes(searchText)
    );
    const matchText = !searchText || countryMatches || cityMatches;
    const matchCountry = !filterCountry || c.Country_ID === Number(filterCountry);
    return matchText && matchCountry;
  });

  const hasActiveFilter = !!(search || filterCountry || filterCity || filterCategory);
  function clearFilters() { setSearch(""); setFilterCountry(""); setFilterCity(""); setFilterCategory(""); }

  const citiesForFilter = filterCountry
    ? CITIES.filter((c) => c.Country_ID === Number(filterCountry))
    : CITIES;

  async function saveSearchHistory() {
    if (!currentUserId) return;

    const keyword = search.trim();
    const selectedCategory = filterCategory
      ? CATEGORIES.find((c) => c.Category_ID === Number(filterCategory))
      : null;
    const selectedStaticCountry = filterCountry ? COUNTRIES.find((c) => c.Country_ID === Number(filterCountry)) : null;
    const selectedStaticCity = filterCity ? CITIES.find((c) => c.City_ID === Number(filterCity)) : null;

    const selectedDbCity = selectedStaticCity
      ? dbCities.find((item: any) => String(item.city_name ?? item.City_Name ?? "").trim().toLowerCase() === selectedStaticCity.City_Name.trim().toLowerCase())
      : null;
    const selectedDbCountry = selectedStaticCountry
      ? dbCountries.find((item: any) => String(item.country_name ?? item.Country_Name ?? "").trim().toLowerCase() === selectedStaticCountry.Country_Name.trim().toLowerCase())
      : null;

    const countryId = selectedDbCountry?.country_id ?? selectedDbCountry?.Country_ID ?? null;
    const cityId = selectedDbCity?.city_id ?? selectedDbCity?.City_ID ?? null;

    const { data: latest, error: latestError } = await supabase
      .from("SEARCH_HISTORY")
      .select("search_id")
      .order("search_id", { ascending: false })
      .limit(1);

    if (latestError) {
      console.error("SEARCH_HISTORY ID query error:", latestError);
      return;
    }

    const nextSearchId = latest && latest.length > 0 ? Number(latest[0].search_id) + 1 : 1;

    const { error: insertError } = await supabase
      .from("SEARCH_HISTORY")
      .insert({
        search_id: nextSearchId,
        user_id: currentUserId,
        country_id: countryId,
        city_id: cityId,
        // The five UI tabs are not the same as the thematic CATEGORY table IDs.
        category_id: null,
        search_category: selectedCategory?.Category_Type ?? null,
        search_keyword: keyword || null,
        search_date_time: new Date().toISOString(),
      });

    if (insertError) {
      console.error("SEARCH_HISTORY insert error:", insertError);
      return;
    }

    const { data: refreshedHistory, error: refreshError } = await supabase
      .from("SEARCH_HISTORY")
      .select("search_id, user_id, country_id, city_id, category_id, search_category, search_keyword, search_date_time")
      .eq("user_id", currentUserId)
      .order("search_id", { ascending: false });

    if (!refreshError) {
      const formattedHistory: SearchHistoryEntry[] = (refreshedHistory ?? []).map((item: any) => {
        const dbCity = dbCities.find((cityItem: any) => String(cityItem.city_id ?? cityItem.City_ID ?? "") === String(item.city_id ?? ""));
        const dbCountry = dbCountries.find((countryItem: any) => String(countryItem.country_id ?? countryItem.Country_ID ?? "") === String(item.country_id ?? ""));
        return {
          search_id: Number(item.search_id),
          user_id: item.user_id,
          country_id: item.country_id ?? null,
          city_id: item.city_id ?? null,
          category_id: item.category_id ?? null,
          search_category: item.search_category ?? "",
          search_keyword: item.search_keyword ?? "",
          search_date_time: item.search_date_time ?? null,
          country_name: dbCountry?.country_name ?? dbCountry?.Country_Name ?? "",
          city_name: dbCity?.city_name ?? dbCity?.City_Name ?? "",
        };
      });
      setSearchHistory(formattedHistory);
    }
  }

  async function handleSearchGo() {
    await saveSearchHistory();

    // Keyword searches should actually resolve to a destination/city/country.
    // Previously the keyword only filtered the country cards, so "Baguio" and
    // "Vigan" could show 0 results because the country names themselves did
    // not contain those city names.
    if (search.trim()) {
      const keyword = search.trim().toLowerCase();

      const keywordCity = CITIES.find((ci) =>
        ci.City_Name.toLowerCase().includes(keyword)
      );

      if (keywordCity) {
        const parentCountry = COUNTRIES.find(
          (co) => co.Country_ID === keywordCity.Country_ID
        );

        if (parentCountry) setCountry(parentCountry);
        setCity(keywordCity);

        const dbCity = dbCities.find((item: any) => {
          const dbCityName = item.city_name ?? item.City_Name ?? "";
          return dbCityName.trim().toLowerCase() === keywordCity.City_Name.trim().toLowerCase();
        });
        const dbCityId = dbCity?.city_id ?? dbCity?.City_ID;
        const cityDestinations = dbCityId
          ? dbDestinations.filter((d) => normId(d.City_ID) === normId(dbCityId))
          : [];
        const present = [...new Set(
          cityDestinations
            .map((d) => d.Place_Type_ID)
            .filter((id): id is number => id !== null && id !== undefined)
        )];

        setActiveCatId(present.includes(5) ? 5 : (present[0] ?? 5));
        go("city");
        return;
      }

      const keywordCountry = COUNTRIES.find((co) =>
        co.Country_Name.toLowerCase().includes(keyword)
      );

      if (keywordCountry?.interactable) {
        pickCountry(keywordCountry);
        return;
      }

      const keywordDestination = dbDestinations.find((d) =>
        d.Destination_Name.toLowerCase().includes(keyword)
      );

      if (keywordDestination) {
        const destinationCity = dbCities.find((item: any) =>
          String(item.city_id ?? item.City_ID ?? "") === String(keywordDestination.City_ID ?? "")
        );

        if (destinationCity) {
          const staticCity = CITIES.find((ci) =>
            ci.City_Name.trim().toLowerCase() ===
            String(destinationCity.city_name ?? destinationCity.City_Name ?? "").trim().toLowerCase()
          );
          if (staticCity) {
            const parentCountry = COUNTRIES.find(
              (co) => co.Country_ID === staticCity.Country_ID
            );
            if (parentCountry) setCountry(parentCountry);
            setCity(staticCity);
            setActiveCatId(keywordDestination.Place_Type_ID ?? 5);
            go("city");
            return;
          }
        }
      }
    }

    if (filterCity) {
      const selectedCity = CITIES.find((ci) => ci.City_ID === Number(filterCity));
      if (selectedCity) {
        // A city can be selected without first selecting a country.
        // Set the matching country too so the city screen always has
        // the parent country it requires for rendering.
        const parentCountry = COUNTRIES.find(
          (co) => co.Country_ID === selectedCity.Country_ID
        );
        if (parentCountry) {
          setCountry(parentCountry);
        }

        setCity(selectedCity);

        const dbCity = dbCities.find((item: any) => {
          const dbCityName = item.city_name ?? item.City_Name ?? "";
          return dbCityName.trim().toLowerCase() === selectedCity.City_Name.trim().toLowerCase();
        });
        const dbCityId = dbCity?.city_id ?? dbCity?.City_ID;

        const cityDestinations = dbCityId
          ? dbDestinations.filter((d) => normId(d.City_ID) === normId(dbCityId))
          : [];

        const present = [
          ...new Set(
            cityDestinations
              .map((d) => d.Place_Type_ID)
              .filter((id): id is number => id !== null && id !== undefined)
          ),
        ];

        const requestedCategory = filterCategory
          ? Number(filterCategory)
          : null;

        setActiveCatId(
          requestedCategory && CATEGORIES.some((c) => c.Category_ID === requestedCategory)
            ? requestedCategory
            : (present.includes(5) ? 5 : (present[0] ?? 5))
        );

        go("city");
        return;
      }
    }

    if (filterCountry) {
      const selectedCountry = COUNTRIES.find(
        (co) => co.Country_ID === Number(filterCountry)
      );
      if (selectedCountry?.interactable) {
        pickCountry(selectedCountry);
        return;
      }
    }

    // Category-only searches stay on the countries screen for now.
    // The selected category is still saved in Search History.
  }

  // ── Navbar ────────────────────────────────────────────────────────────────

  const Navbar = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
        <button onClick={() => { setCountry(null); setCity(null); setDest(null); clearFilters(); go("countries"); }} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#0b1f5c] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-4 4-4 14 0 18M12 3c4 4 4 14 0 18" strokeLinecap="round" /></svg>
          </div>
          <span className="font-extrabold text-[#0b1f5c] text-base hidden sm:block" style={{ fontFamily: "Outfit, sans-serif" }}>Travel<span className="text-sky-400">Mate</span></span>
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <button onClick={() => setModal(modal === "menu" ? null : "menu")} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors text-base font-semibold">☰</button>
            {modal === "menu" && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                {isLoggedIn ? (
                  <>
                    <button onClick={() => { setModal(null); setShowSearchHistory(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span>🔎</span> Search History
                    </button>
                    <button onClick={() => { setModal(null); go("plans"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span>🗓️</span> My Travel Plans
                    </button>
                    {isPartner ? (
                      <button onClick={() => { setModal(null); go("partner-dashboard"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🏢</span> Business Dashboard
                      </button>
                    ) : (
                      <button onClick={() => setModal("partner")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <span>🏢</span> For Business
                      </button>
                    )}
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={async () => {
                        const { error } = await supabase.auth.signOut();

                        if (error) {
                          console.error("Sign out error:", error);
                          alert(error.message || "Failed to sign out.");
                          return;
                        }

                        setIsLoggedIn(false);
                        setCurrentUserId(null);
                        setIsPartner(false);
                        setPartnerData(null);
                        setPartnerListings([]);
                        setModal(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModal("login")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span>🔑</span> Sign In
                    </button>
                    <button onClick={() => setModal("register")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span>✨</span> Register
                    </button>
                    <div className="border-t border-slate-100" />
                    <button onClick={() => setModal("partner")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <span>🏢</span> For Business
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {isLoggedIn
            ? <div className="w-8 h-8 rounded-full bg-[#0b1f5c] flex items-center justify-center text-white text-xs font-bold">U</div>
            : <button onClick={() => setModal("register")} className="bg-[#0b1f5c] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#162d7a] transition-all hidden sm:block">Register</button>
          }
        </div>
      </div>
    </header>
  );

const Modals = () => (
  <>
    {showSearchHistory && (
      <SearchHistoryModal
        history={searchHistory}
        onClose={() => setShowSearchHistory(false)}
      />
    )}

    {modal === "register" && (
      <RegisterModal
        onClose={() => setModal(null)}
        onSwitch={() => setModal("login")}
      />
    )}

    {modal === "login" && (
      <LoginModal
        onClose={() => setModal(null)}
        onSwitch={() => setModal("register")}
        onLogin={(userId) => {
          setCurrentUserId(userId);
          setIsLoggedIn(true);
        }}
      />
    )}

    {modal === "partner" && (
      <BusinessPartnerModal
        onClose={() => setModal(null)}
        onRegister={(p) => {
          setPartnerData(p);
          setIsPartner(true);
          setModal(null);
          go("partner-dashboard");
        }}
      />
    )}

    {modal === "review" && dest && destCat && (
      <WriteReviewModal
        dest={dest}
        catType={destCat.Category_Type}
        onClose={() => setModal(null)}
        onSubmit={async (r) => {
          try {
            const savedReviewId = await saveReviewToSupabase(
              r,
              dest,
              destCat.Category_Type
            );

            setLiveReviews((prev) => ({
              ...prev,
              [dest.Destination_ID]: [
                ...(prev[dest.Destination_ID] ?? []),
                {
                  ...r,
                  Review_ID: savedReviewId,
                  user_id: currentUserId ?? undefined,
                }
              ]
            }));

            setModal(null);
          } catch (error: any) {
            alert(error.message || "Failed to save review.");
          }
        }}
      />
    )}

    {modal === "plan" && dest && (
      <SavePlanModal
        dest={dest}
        onClose={() => setModal(null)}
      />
    )}

        {editingReview && dest && destCat && (
      <EditReviewModal
        review={editingReview}
        dest={dest}
        catType={destCat.Category_Type}
        onClose={() => setEditingReview(null)}
        onSaved={loadReviewsFromSupabase}
      />
    )}

    {editingPlan && (
      <EditTravelPlanModal
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSaved={loadTravelPlans}
      />
    )}
  </>
);

  // ── Countries ────────────────────────────────────────────────────────────────

  if (screen === "countries") return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}

      {/* Hero */}
      <div className="bg-[#0b1f5c] pt-14">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-3">Explore · Book · Enjoy</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
            Where do you<br />want to go?
          </h1>
          <p className="text-white/40 text-sm max-w-sm mb-10">Pick a country, choose a city, then explore by category.</p>

          {/* Filter bar */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 max-w-3xl overflow-hidden">
            <div className="flex flex-wrap divide-x divide-slate-200">

              {/* Keyword */}
              <div className="flex items-center gap-2 flex-1 min-w-[140px] px-4 py-3.5">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Keyword</p>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="e.g. Baguio"
                    className="w-full text-sm text-slate-800 font-medium placeholder-slate-300 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="flex items-center gap-2 min-w-[140px] px-4 py-3.5">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Country</p>
                  <select
                    value={filterCountry}
                    onChange={(e) => { setFilterCountry(e.target.value); setFilterCity(""); }}
                    className="w-full text-sm text-slate-800 font-medium bg-transparent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Countries</option>
                    {COUNTRIES.map((c) => <option key={c.Country_ID} value={c.Country_ID}>{c.Country_Name}</option>)}
                  </select>
                </div>
              </div>

              {/* City */}
              <div className="flex items-center gap-2 min-w-[140px] px-4 py-3.5">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">City</p>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full text-sm text-slate-800 font-medium bg-transparent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Cities</option>
                    {citiesForFilter.map((c) => <option key={c.City_ID} value={c.City_ID}>{c.City_Name}</option>)}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2 min-w-[140px] px-4 py-3.5">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</p>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full text-sm text-slate-800 font-medium bg-transparent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c.Category_ID} value={c.Category_ID}>{CAT_ICON[c.Category_Type]} {c.Category_Type}</option>)}
                  </select>
                </div>
              </div>

              {/* Search button */}
              <button
                onClick={handleSearchGo}
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm px-7 transition-all flex-shrink-0 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search
              </button>
            </div>
          </div>

          {hasActiveFilter && (
            <button onClick={clearFilters} className="mt-3 text-white/50 hover:text-white/80 text-xs underline transition-colors">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-16">
        <div className="flex items-center justify-between py-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {hasActiveFilter ? `${shownCountries.length} result${shownCountries.length !== 1 ? "s" : ""}` : `${COUNTRIES.length} countries`}
          </p>
          {!isLoggedIn && (
            <span className="text-xs text-slate-400">
              <button onClick={() => setModal("register")} className="font-semibold text-slate-600 hover:underline">Register</button> to save plans & write reviews
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {shownCountries.map((c) => {
            const cityCount = CITIES.filter((ci) => ci.Country_ID === c.Country_ID).length;
            if (c.interactable) {
              return (
                <button key={c.Country_ID} onClick={() => pickCountry(c)} className="group relative rounded-2xl overflow-hidden h-64 bg-slate-800 text-left hover:shadow-2xl hover:shadow-blue-100/60 transition-all duration-300 hover:-translate-y-1">
                  <img src={c.Country_Image} alt={c.Country_Name} className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">{c.Country_Specialty}</span>
                  </div>
                  {/* Default bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2">
                    <div className="text-2xl mb-1" style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{FLAGS[c.Country_ID]}</div>
                    <div className="text-xl font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</div>
                    <div className="text-xs text-white/50 mt-0.5">{cityCount} cities</div>
                  </div>
                  {/* Hover description panel */}
                  <div className="absolute inset-0 flex flex-col justify-end opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <div className="bg-black/70 backdrop-blur-sm p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{FLAGS[c.Country_ID]}</span>
                        <span className="text-base font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</span>
                      </div>
                      <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3">{c.Country_Description}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-sky-400 text-[11px] font-semibold">
                        <span>Explore {cityCount} cities</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            }
            return (
              <div key={c.Country_ID} className="group relative rounded-2xl overflow-hidden h-64 bg-slate-800 text-left cursor-default select-none">
                <img src={c.Country_Image} alt={c.Country_Name} className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">{c.Country_Specialty}</span>
                </div>
                {/* Default bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-5 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2">
                  <div className="text-2xl mb-1" style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{FLAGS[c.Country_ID]}</div>
                  <div className="text-xl font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</div>
                  <div className="text-xs text-white/50 mt-0.5">{c.display_city_count ?? cityCount} cities</div>
                </div>
                {/* Hover description panel */}
                <div className="absolute inset-0 flex flex-col justify-end opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <div className="bg-black/70 backdrop-blur-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{FLAGS[c.Country_ID]}</span>
                      <span className="text-base font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</span>
                    </div>
                    <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3">{c.Country_Description}</p>
                    <div className="mt-3">
                      <span className="text-white/40 text-[11px] font-semibold">Coming soon</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Popular Cities */}
        {!hasActiveFilter && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>Popular Cities</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handpicked</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scrollCities("left")} className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:bg-[#0b1f5c] hover:text-white hover:border-[#0b1f5c] transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => scrollCities("right")} className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:bg-[#0b1f5c] hover:text-white hover:border-[#0b1f5c] transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <div ref={citiesScrollRef} className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {[3,5,1,4,2].map((cityId) => {
                const city = CITIES.find((ci) => ci.City_ID === cityId);
                if (!city) return null;
                const co = COUNTRIES.find((c) => c.Country_ID === city.Country_ID);
                if (!co) return null;
                return (
                  <button
                    key={city.City_ID}
                    onClick={() => { setCountry(co); pickCity(city); }}
                    className="group relative flex-shrink-0 w-44 h-56 rounded-2xl overflow-hidden bg-slate-800 hover:shadow-2xl hover:shadow-blue-100/60 transition-all duration-300 hover:-translate-y-1"
                  >
                    <img src={city.City_Image} alt={city.City_Name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-base" style={{ color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{FLAGS[co.Country_ID]}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2">
                      <div className="text-base font-extrabold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{city.City_Name}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">{co.Country_Name}</div>
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-end opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <div className="bg-black/70 backdrop-blur-sm p-4">
                        <div className="text-sm font-extrabold text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{city.City_Name}</div>
                        <p className="text-white/70 text-[10px] leading-relaxed line-clamp-2">{city.City_Specialty}</p>
                        <div className="mt-2 flex items-center gap-1 text-sky-400 text-[10px] font-semibold">
                          <span>Explore</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Modals />
    </div>
  );

  // ── Cities ───────────────────────────────────────────────────────────────────

  if (screen === "cities" && country) return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}
      <div className="pt-20 max-w-5xl mx-auto px-5 pb-16">

        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden h-48 mt-4 mb-8">
          <img src={country.Country_Image} alt={country.Country_Name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f5c]/90 via-[#0b1f5c]/60 to-transparent" />
          <div className="absolute inset-0 p-7 flex flex-col justify-between">
            <div><BackBtn onClick={() => go("countries")} label="All Countries" /></div>
            <div>
              <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{FLAGS[country.Country_ID]} {country.Country_Name}</h1>
              <p className="text-white/60 text-sm mt-1">{country.Country_Specialty} · {citiesForCountry.length} cities</p>
            </div>
          </div>
        </div>

        {/* Country description */}
        <div className="bg-white rounded-2xl border border-slate-100 px-7 py-5 mb-8 flex gap-5 items-start">
          <div className="text-4xl flex-shrink-0 mt-0.5" style={{ color: "#0b1f5c", textShadow: "none" }}>{FLAGS[country.Country_ID]}</div>
          <div>
            <h2 className="text-lg font-extrabold text-[#0b1f5c] mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{country.Country_Name}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{country.Country_Description}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold px-3 py-1 rounded-full">
              ✦ Best for: {country.Country_Specialty}
            </div>
          </div>
        </div>

        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Cities in {country.Country_Name}</h2>

        <div className="grid md:grid-cols-3 gap-5">
          {citiesForCountry.map((c) => {
            const cat = CATEGORIES.find((cat) => cat.Category_ID === c.Category_ID);
            const dCount = DESTINATIONS.filter((d) => d.City_ID === c.City_ID).length;
            const presentTypes = [...new Set(DESTINATIONS.filter((d) => d.City_ID === c.City_ID).map((d) => CATEGORIES.find((cat) => cat.Category_ID === d.Category_ID)?.Category_Type).filter(Boolean))] as CategoryType[];
            return (
              <button key={c.City_ID} onClick={() => pickCity(c)} className="group bg-white rounded-2xl overflow-hidden text-left border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300 hover:-translate-y-0.5">
                <div className="relative h-40 bg-slate-200 overflow-hidden">
                  <img src={c.City_Image} alt={c.City_Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {cat && <span className={`absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${CAT_COLOR[cat.Category_Type].badge}`}>{CAT_ICON[cat.Category_Type]} {cat.Category_Type}</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-base font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>{c.City_Name}</h3>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{c.City_Specialty}</p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.City_Description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {presentTypes.map((t) => <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[t].badge}`}>{CAT_ICON[t]}</span>)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                    <span>CT-{String(c.City_ID).padStart(2, "0")}</span>
                    <span>{dCount} destinations</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <Modals />
    </div>
  );

  // ── City Detail (category tabs) ───────────────────────────────────────────────

  if (screen === "city" && city && country) {
    const activeCat = CATEGORIES.find((c) => c.Category_ID === activeCatId)!;
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <Navbar />
        {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}
        <div className="pt-20 max-w-5xl mx-auto px-5 pb-16">

          <div className="pt-6 pb-4 flex items-center gap-3">
            <BackBtn onClick={() => go("cities")} label={country.Country_Name} />
            <p className="text-xs font-bold tracking-wider uppercase hidden sm:block" style={{ color: "#c2610a" }}>
              {country.Country_Name} / {city.City_Name} · CT-{String(city.City_ID).padStart(2, "0")}
            </p>
          </div>

          <h1 className="text-4xl font-extrabold text-[#0b1f5c] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>{city.City_Name}</h1>
          <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
            <span className="font-semibold">Specialty:</span> {city.City_Specialty} &nbsp;·&nbsp; {city.City_Description}
          </p>

          {/* Category tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex flex-wrap gap-2">
                {presentCatIds.map((cid) => {
                  const cat = CATEGORIES.find((c) => c.Category_ID === cid)!;
                  const isActive = cid === activeCatId;
                  return (
                    <button
                      key={cid}
                      onClick={() => setActiveCatId(cid)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isActive ? "bg-[#0b1f5c] text-white border-[#0b1f5c]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-[#0b1f5c]"}`}
                    >
                      {CAT_ICON[cat.Category_Type]} {cat.Category_Type}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2.5 py-1 rounded-full">reads {DB_TABLE[activeCat.Category_Type]}</span>
            </div>
            <p className="text-xs text-slate-400">
              Showing {filteredDests.length} {activeCat.Category_Type.toLowerCase()} {filteredDests.length === 1 ? "record" : "records"} in {city.City_Name}
            </p>
          </div>

          {/* Destination cards */}
          {filteredDests.length === 0 ? (
            <div className="text-center py-20 text-slate-400"><div className="text-4xl mb-2">🗂️</div><p className="text-sm">No {activeCat.Category_Name} listed yet.</p></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDests.map((d) => {
                const revCount = (REVIEWS[d.Destination_ID] ?? []).length;
                return (
                  <button key={d.Destination_ID} onClick={() => pickDest(d)} className="group bg-white rounded-2xl overflow-hidden text-left border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">
                    <div className={`${CAT_COLOR[activeCat.Category_Type].card} h-28 relative overflow-hidden flex items-end p-4`}>
                      <img src={d.Destination_Image} alt={d.Destination_Name} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-35 transition-opacity duration-300" />
                      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/80 relative z-10">{activeCat.Category_Type}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-extrabold text-[#0b1f5c] text-sm mb-1 group-hover:text-blue-700 transition-colors leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>{d.Destination_Name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{d.Destination_Description}</p>
                      <div className="flex items-center justify-between">
                        <Stars n={d.Rating} />
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">D-{String(d.Destination_ID).padStart(3,"0")}</span>
                      </div>
                      {revCount > 0 && <p className="text-[10px] text-slate-400 mt-2">💬 {revCount} review{revCount > 1 ? "s" : ""}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Modals />
      </div>
    );
  }

  // ── Destination Detail ────────────────────────────────────────────────────────

  if (screen === "destination" && dest && destCat && city && country) return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}

      <div className="relative h-72 md:h-[380px] bg-slate-800 overflow-hidden mt-14">
        <img src={dest.Destination_Image} alt={dest.Destination_Name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f5c]/90 via-[#0b1f5c]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-5 pb-7">
          <p className="text-[11px] font-bold tracking-wider uppercase mb-3" style={{ color: "#fb923c" }}>
            <button onClick={() => go("countries")} className="hover:underline">{country.Country_Name}</button>
            {" / "}
            <button onClick={() => go("cities")} className="hover:underline">{city.City_Name}</button>
            {" / "}
            <button onClick={() => go("city")} className="hover:underline">{destCat.Category_Name}</button>
          </p>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 inline-block ${CAT_COLOR[destCat.Category_Type].badge}`}>{CAT_ICON[destCat.Category_Type]} {destCat.Category_Type}</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>{dest.Destination_Name}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-20">
        {/* Back button */}
        <div className="pt-5 mb-2">
          <BackBtn onClick={() => go("city")} label={`Back to ${city.City_Name}`} />
        </div>

        {/* Quick facts */}
        <div className="bg-white border border-slate-100 rounded-2xl px-6 py-4 mt-4 shadow-lg flex flex-wrap gap-6 mb-8">
          {[
            { icon: "📍", label: "Address",   val: dest.Address },
            { icon: "📞", label: "Contact",   val: dest.Contact_Number },
            { icon: "⏰", label: "Hours",     val: dest.Operating_Hours },
            { icon: "🗂️", label: "Category",  val: destCat.Category_Name },
            { icon: "🆔", label: "ID",        val: `D-${String(dest.Destination_ID).padStart(3,"0")}` },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2">
              <span className="text-lg">{f.icon}</span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{f.label}</div>
                <div className="text-sm font-semibold text-[#0b1f5c] max-w-44 truncate">{f.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-extrabold text-[#0b1f5c] mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>About</h2>
              <p className="text-slate-600 leading-relaxed text-sm">{dest.Destination_Description}</p>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Reviews <span className="text-sm font-normal text-slate-400">({destReviews.length})</span>
                </h2>
                {isLoggedIn
                  ? <button onClick={() => setModal("review")} className="text-xs font-semibold bg-[#0b1f5c] text-white px-4 py-2 rounded-xl hover:bg-[#162d7a]">+ Write Review</button>
                  : <button onClick={() => setModal("register")} className="text-xs font-semibold border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50">Sign in to review</button>
                }
              </div>
              {destReviews.length === 0 ? (
                <div className="text-center py-10 text-slate-400"><div className="text-3xl mb-2">💬</div><p className="text-sm">No reviews yet. Be the first!</p></div>
              ) : (
                <div className="space-y-4">
                  {destReviews.map((r) => {
                    const isOwnReview =
                      isLoggedIn &&
                      currentUserId !== null &&
                      r.user_id === currentUserId;

                    return (
                    <div key={r.Review_ID} className="border border-slate-100 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <img src={r.reviewer_avatar} alt={r.reviewer_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#0b1f5c] text-sm">{r.reviewer_name}</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${r.Review_Status === "Approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{r.Review_Status}</span>
                          </div>
                          <div className="text-xs text-slate-400">{r.Review_Date}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Stars n={r.Rating} />
                          {isOwnReview && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingReview(r)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Are you sure you want to delete your review?")) return;
                                  try {
                                    await deleteReviewFromSupabase(r);
                                    setLiveReviews((prev) => ({
                                      ...prev,
                                      [dest.Destination_ID]: (prev[dest.Destination_ID] ?? []).filter(
                                        (item) => item.Review_ID !== r.Review_ID
                                      ),
                                    }));
                                    alert("Review deleted successfully!");
                                  } catch (error: any) {
                                    alert(error.message || "Failed to delete review.");
                                  }
                                }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">"{r.Review_Comment}"</p>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{CAT_ICON[destCat.Category_Type]} {destCat.Category_Type} · {r.subtype_rating}/5</p>
                        <p className="text-xs text-slate-500">{r.subtype_feedback}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#0b1f5c] rounded-2xl p-5 text-white">
              <h3 className="font-extrabold text-base mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Add to Travel Plan</h3>
              <p className="text-white/50 text-xs mb-4">Save this destination to your personal itinerary.</p>
              {isLoggedIn
                ? <button onClick={() => setModal("plan")} className="w-full bg-white text-[#0b1f5c] font-semibold py-2.5 rounded-xl hover:bg-slate-100 text-sm">+ Save to Plan</button>
                : <button onClick={() => setModal("register")} className="w-full bg-white text-[#0b1f5c] font-semibold py-2.5 rounded-xl text-sm">Sign in to save</button>
              }
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-[#0b1f5c] text-sm mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>More in {city.City_Name}</h3>
              <div className="space-y-2">
                {destsForCity.filter((d) => d.Destination_ID !== dest.Destination_ID).slice(0,4).map((d) => {
                  const c = CATEGORIES.find((cat) => cat.Category_ID === d.Category_ID)!;
                  return (
                    <button key={d.Destination_ID} onClick={() => pickDest(d)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                      <img src={d.Destination_Image} alt={d.Destination_Name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#0b1f5c] truncate">{d.Destination_Name}</div>
                        <div className="text-[10px] text-slate-400">{CAT_ICON[c.Category_Type]} {c.Category_Type}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modals />
    </div>
  );

  // ── Travel Plans ──────────────────────────────────────────────────────────────

  if (screen === "plans") return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}
      <div className="pt-20 max-w-3xl mx-auto px-5 pb-16">
        <div className="py-6 flex items-center gap-4">
          <BackBtn onClick={() => go("countries")} label="Explore" />
          <div>
            <h1 className="text-3xl font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>My Travel Plans</h1>
            <p className="text-slate-400 text-sm">Your saved destinations and upcoming trips.</p>
          </div>
        </div>

        <div className="space-y-4">
          {dbTravelPlans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <h3 className="font-bold text-[#0b1f5c] text-lg">No Travel Plans Yet</h3>
              <p className="text-sm text-slate-400 mt-1">
                Save a destination to create your first travel plan.
              </p>
            </div>
          ) : (
            dbTravelPlans.map((p: any) => (
              <div key={p.travelplan_id} className="bg-white rounded-2xl border border-slate-100 p-6 flex gap-4 items-start">
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${p.travel_status === "Completed" ? "bg-green-400" : p.travel_status === "Ongoing" ? "bg-blue-400" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-extrabold text-[#0b1f5c] text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {p.plan_name}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {p.destination_name}
                        {p.category_name ? ` · ${p.category_name}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${p.travel_status === "Completed" ? "bg-green-100 text-green-700" : p.travel_status === "Ongoing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.travel_status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-5 mt-2 text-sm text-slate-500">
                    <span>📅 {p.start_date}</span>
                    <span>🗓 {p.number_of_days} days</span>
                    {p.budget !== null && p.budget !== undefined && (
                      <span>💰 ₱{Number(p.budget).toLocaleString()}</span>
                    )}
                    <span className="font-mono text-xs text-slate-400">
                      TP-{String(p.travelplan_id).padStart(3, "0")}
                    </span>
                  </div>

                  {p.notes && (
                    <p className="mt-1.5 text-xs text-slate-400 italic">📝 {p.notes}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setEditingPlan(p)}
                    className="px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Are you sure you want to delete "${p.plan_name}"?`
                      );

                      if (!confirmed) return;

                      try {
                        const {
                          data: { user },
                          error: userError,
                        } = await supabase.auth.getUser();

                        if (userError || !user) {
                          throw new Error("You must be logged in to delete a travel plan.");
                        }

                        const { data, error } = await supabase
                          .from("TRAVEL_PLAN")
                          .delete()
                          .eq("travelplan_id", p.travelplan_id)
                          .eq("user_id", user.id)
                          .select();

                        if (error) {
                          throw error;
                        }

                        if (!data || data.length === 0) {
                          throw new Error(
                            "Travel plan could not be deleted. Make sure this plan belongs to your account."
                          );
                        }

                        await loadTravelPlans();

                        alert("Travel plan deleted successfully!");
                      } catch (error: any) {
                        console.error("Error deleting travel plan:", error);
                        alert(error.message || "Failed to delete travel plan.");
                      }
                    }}
                    className="px-4 py-2 text-xs font-semibold border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>

                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={() => go("countries")} className="mt-8 w-full border-2 border-dashed border-blue-200 text-blue-500 font-semibold py-4 rounded-2xl hover:bg-blue-50 transition-all text-sm">
          + Explore destinations to add a new plan
        </button>
      </div>
      <Modals />
    </div>
  );

  if (screen === "partner-dashboard") return (
    <PartnerDashboard
      partner={partnerData!}
      listings={partnerListings}
      onAddListing={(l) => setPartnerListings((prev) => [...prev, { ...l, id: Date.now(), status: "Pending" }])}
      onBack={() => go("countries")}
      Navbar={Navbar}
      Modals={Modals}
      modal={modal}
      setModal={setModal}
    />
  );

  return null;
}