/**
 * ============================================================================
 * TRAVELMATE — APPLICATION NOTES / DEVELOPMENT LOG
 * ============================================================================
 *
 * This App.tsx is the current Supabase-connected application shell.
 * UI components, static data, shared types, and small services are now split
 * into dedicated modules to keep this file focused on application state,
 * navigation, and database orchestration.
 *
 * ============================================================================
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import supabase from "./config/supabaseClient";

import type {
  CategoryType,
  Category,
  Country,
  City,
  Destination,
  ReviewEntry,
  TravelPlan,
  BusinessPartner,
  SearchHistoryEntry,
} from "./types";

import { normId } from "./services/idUtils";
import { ensureUserInfo } from "./services/authService";
import { CATEGORIES, DB_TABLE, CAT_COLOR, FLAGS } from "./data/constants";
import { COUNTRIES } from "./data/countries";
import { CITIES } from "./data/cities";
import { DESTINATIONS } from "./data/destinations";
import { REVIEWS } from "./data/reviews";

import Stars from "./components/common/Stars";
import BackBtn from "./components/common/BackBtn";
import Overlay from "./components/common/Overlay";
import { CategoryIcon, Icon } from "./components/common/Icon";
import UserAvatar from "./components/common/UserAvatar";
import Field from "./components/common/Field";
import ModalHeader from "./components/common/ModalHeader";

import RegisterModal from "./components/auth/RegisterModal";
import LoginModal from "./components/auth/LoginModal";

import BusinessPartnerModal from "./components/business/BusinessPartnerModal";
import MyBusinessesScreen from "./components/business/MyBusinessesScreen";
import PartnerDashboard from "./components/business/PartnerDashboard";

import WriteReviewModal from "./components/reviews/WriteReviewModal";
import EditReviewModal from "./components/reviews/EditReviewModal";

import EditTravelPlanModal from "./components/travel/EditTravelPlanModal";
import SavePlanModal from "./components/travel/SavePlanModal";
import MyTripsScreen from "./components/travel/MyTripsScreen";

import SearchHistoryModal from "./components/search/SearchHistoryModal";
import UserProfileModal from "./components/profile/UserProfileModal";
import LandingPage from "./components/landing/LandingPage";
import DestinationDetailsScreen from "./components/destination/DestinationDetailsScreen";
import { getDestinationImage } from "./data/destinationImages";

console.log("APP.TSX LOADED");
console.log("SUPABASE FROM APP:", supabase);

type Screen = "countries" | "cities" | "city" | "destination" | "plans" | "partner-businesses" | "partner-dashboard";
type ModalKind = "register" | "login" | "partner" | "review" | "plan" | "profile" | "menu" | null;

// Popular Cities showcase order: live cities first, coming-soon cities after.
const POPULAR_CITY_IDS = [3, 5, 1, 4, 2, 6, 7, 8];

function getAuthAvatar(user: any): string | null {
  const identity = user?.identities?.find((item: any) => item?.provider === "google");
  return user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture
    || user?.user_metadata?.avatar
    || identity?.identity_data?.picture
    || null;
}

function getAuthGender(user: any): "Male" | "Female" | null {
  const gender = user?.user_metadata?.gender;
  return gender === "Male" || gender === "Female" ? gender : null;
}

function syncAuthProfileMeta(user: any, setAvatar: (value: string | null) => void, setGender: (value: "Male" | "Female" | null) => void) {
  setAvatar(getAuthAvatar(user));
  setGender(getAuthGender(user));
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
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserGender, setCurrentUserGender] = useState<"Male" | "Female" | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [liveReviews, setLiveReviews] = useState<Record<number, ReviewEntry[]>>({});
  const [dbTravelPlans, setDbTravelPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewEntry | null>(null);
  const [isPartner, setIsPartner] = useState(false);
  const [partnerBusinesses, setPartnerBusinesses] = useState<BusinessPartner[]>([]);
  const [partnerData, setPartnerData] = useState<BusinessPartner | null>(null);
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
      try {
        await ensureUserInfo(session.user);
      } catch (profileError) {
        console.error("USER_INFO session initialization error:", profileError);
      }

      setIsLoggedIn(true);
      setCurrentUserId(session.user.id);
      syncAuthProfileMeta(session.user, setCurrentUserAvatar, setCurrentUserGender);

      console.log("Session restored:", session.user.id);
    } else {
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setCurrentUserAvatar(null);
      setCurrentUserGender(null);

      console.log("No active session");
    }

    setAuthLoading(false);
  };

  restoreSession();

  // Keep React state synchronized with Supabase Auth
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event: any, session: any) => {
    console.log("Auth state changed:", event);

    if (session?.user) {
      setIsLoggedIn(true);
      setCurrentUserId(session.user.id);
      syncAuthProfileMeta(session.user, setCurrentUserAvatar, setCurrentUserGender);
    } else {
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setCurrentUserAvatar(null);
      setCurrentUserGender(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!currentUserId) {
    setCurrentUserName("");
    return;
  }

  const loadCurrentUserName = async () => {
    const { data: authData } = await supabase.auth.getUser();
    syncAuthProfileMeta(authData.user, setCurrentUserAvatar, setCurrentUserGender);

    const { data, error } = await supabase
      .from("USER_INFO")
      .select("full_name")
      .eq("user_id", currentUserId)
      .single();

    if (error) {
      console.error("USER_INFO current user load error:", error);
      setCurrentUserName(authData.user?.user_metadata?.full_name ?? authData.user?.user_metadata?.name ?? "");
      return;
    }

    setCurrentUserName(data?.full_name ?? authData.user?.user_metadata?.full_name ?? authData.user?.user_metadata?.name ?? "");
  };

  loadCurrentUserName();
}, [currentUserId]);

useEffect(() => {
  if (!currentUserId) {
    setIsPartner(false);
    setPartnerData(null);
    return;
  }

  const loadBusinessPartner = async () => {
    const { data, error } = await supabase
      .from("BUSINESS_PARTNER")
      .select("Partner_ID, user_id, Business_Name, Business_Category, Contact_Person, Contact_Number, Email, Username, Registration_Date")
      .eq("user_id", currentUserId)
      .order("Registration_Date", { ascending: false });

    if (error) {
      console.error("BUSINESS_PARTNER load error:", error);
      setIsPartner(false);
      setPartnerBusinesses([]);
      setPartnerData(null);
      return;
    }

    const businesses: BusinessPartner[] = (data ?? []).map((item: any) => ({
      partnerId: item.Partner_ID,
      userId: item.user_id,
      businessName: item.Business_Name ?? "",
      businessCategory: item.Business_Category ?? "Restaurant",
      contactPerson: item.Contact_Person ?? "",
      contactNumber: item.Contact_Number ?? "",
      email: item.Email ?? "",
      username: item.Username ?? "",
      registrationDate: item.Registration_Date ?? null,
    }));

    setPartnerBusinesses(businesses);
    setIsPartner(businesses.length > 0);

    setPartnerData((current) => {
      if (!current) return businesses[0] ?? null;
      return businesses.find((item) => item.partnerId === current.partnerId) ?? businesses[0] ?? null;
    });
  };

  loadBusinessPartner();
}, [currentUserId]);

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
    const { data: rawReviews, error: reviewError } = await supabase
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

    const reviews: any[] = rawReviews ?? [];

    if (reviews.length === 0) {
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
          (users ?? []).map((user: any) => [
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
    const restaurantReviews = new Map<any, any>(
      ((restaurantResult.data ?? []) as any[]).map((r: any) => [r.Review_ID, r])
    );

    const accommodationReviews = new Map<any, any>(
      ((accommodationResult.data ?? []) as any[]).map((r: any) => [r.Review_ID, r])
    );

    const convenienceReviews = new Map<any, any>(
      ((convenienceResult.data ?? []) as any[]).map((r: any) => [r.Review_ID, r])
    );

    const landmarkReviews = new Map<any, any>(
      ((landmarkResult.data ?? []) as any[]).map((r: any) => [r.Review_ID, r])
    );

    const touristReviews = new Map<any, any>(
      ((touristResult.data ?? []) as any[]).map((r: any) => [r.Review_ID, r])
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
    const restaurantDestinationMap = new Map<any, number | null>(
      ((restaurantDestinations.data ?? []) as any[]).map((r: any) => [
        r.restaurant_id,
        r.destination_id,
      ])
    );

    const accommodationDestinationMap = new Map<any, number | null>(
      ((accommodationDestinations.data ?? []) as any[]).map((r: any) => [
        r.accommodation_id,
        r.destination_id,
      ])
    );

    const convenienceDestinationMap = new Map<any, number | null>(
      ((convenienceDestinations.data ?? []) as any[]).map((r: any) => [
        r.convenience_store_id,
        r.destination_id,
      ])
    );

    const landmarkDestinationMap = new Map<any, number | null>(
      ((landmarkDestinations.data ?? []) as any[]).map((r: any) => [
        r.Landmark_ID,
        r.destination_id,
      ])
    );

    const touristDestinationMap = new Map<any, number | null>(
      ((touristDestinations.data ?? []) as any[]).map((r: any) => [
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-8 px-5 lg:px-8">
        <button
          onClick={() => { setCountry(null); setCity(null); setDest(null); clearFilters(); go("countries"); }}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#0b1f5c] text-white shadow-sm transition group-hover:shadow-md">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8.7"/><path d="M3.5 12h17M12 3.3c-4 4.4-4 13 0 17.4M12 3.3c4 4.4 4 13 0 17.4" strokeLinecap="round"/></svg>
          </div>
          <span className="text-[17px] font-black tracking-tight text-[#0b1f5c]">TRAVEL<span className="text-sky-400">MATE</span></span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          <button onClick={() => go("countries")} className={`rounded-full px-4 py-2 text-sm font-bold transition ${screen === "countries" || screen === "cities" || screen === "city" || screen === "destination" ? "bg-[#0b1f5c]/8 text-[#0b1f5c]" : "text-slate-500 hover:bg-slate-100 hover:text-[#0b1f5c]"}`}>Explore</button>
          <button onClick={() => go("plans")} className={`rounded-full px-4 py-2 text-sm font-bold transition ${screen === "plans" ? "bg-[#0b1f5c]/8 text-[#0b1f5c]" : "text-slate-500 hover:bg-slate-100 hover:text-[#0b1f5c]"}`}>My Trips</button>
          {isPartner && <button onClick={() => go("partner-businesses")} className={`rounded-full px-4 py-2 text-sm font-bold transition ${screen === "partner-businesses" || screen === "partner-dashboard" ? "bg-[#0b1f5c]/8 text-[#0b1f5c]" : "text-slate-500 hover:bg-slate-100 hover:text-[#0b1f5c]"}`}>Business</button>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowSearchHistory(true)} className="hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-[#0b1f5c] sm:flex">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"/></svg>
            Search history
          </button>

          <div className="relative">
            <button onClick={() => setModal(modal === "menu" ? null : "menu")} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">
              <span className="sr-only">Open menu</span>
              <span className="flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-current"/><span className="h-1.5 w-1.5 rounded-full bg-current"/><span className="h-1.5 w-1.5 rounded-full bg-current"/></span>
            </button>
            {modal === "menu" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />
                <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <button onClick={() => { setModal(null); setShowSearchHistory(true); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Search history</button>
                  <button onClick={() => setModal("profile")} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50">My profile</button>
                  <button onClick={() => { setModal(null); go("plans"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50">My trips</button>
                  {isPartner ? (
                    <button onClick={() => { setModal(null); go("partner-businesses"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50">My businesses</button>
                  ) : (
                    <button onClick={() => setModal("partner")} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Become a business partner</button>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.signOut();
                      if (error) { alert(error.message || "Failed to sign out."); return; }
                      setIsLoggedIn(false);
                      setCurrentUserId(null);
                      setCurrentUserName("");
                      setCurrentUserAvatar(null);
                      setCurrentUserGender(null);
                      setIsPartner(false);
                      setPartnerBusinesses([]);
                      setPartnerData(null);
                      setModal(null);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
                  >Sign out</button>
                </div>
              </>
            )}
          </div>

          <button onClick={() => setModal("profile")} className="rounded-full transition-transform hover:scale-105" aria-label="Open profile"><UserAvatar userId={currentUserId} gender={currentUserGender} avatarUrl={currentUserAvatar} name={currentUserName} sizeClass="h-10 w-10" showBorder /></button>
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
        onLogin={async (userId) => {
          setCurrentUserId(userId);
          setIsLoggedIn(true);
          const { data } = await supabase.auth.getUser();
          syncAuthProfileMeta(data.user, setCurrentUserAvatar, setCurrentUserGender);
        }}
      />
    )}

    {modal === "profile" && (
      <UserProfileModal
        onClose={() => setModal(null)}
        onProfileUpdated={(updatedProfile) => {
          setCurrentUserName(updatedProfile.full_name);
          setCurrentUserGender(updatedProfile.gender ?? null);
          setCurrentUserAvatar(updatedProfile.avatar_url ?? null);
        }}
      />
    )}

    {modal === "partner" && (
      <BusinessPartnerModal
        onClose={() => setModal(null)}
        onRegister={async (p) => {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            throw new Error("You must be logged in to register as a business partner.");
          }

          const { data: insertedPartner, error: insertError } = await supabase
            .from("BUSINESS_PARTNER")
            .insert({
              Partner_ID: crypto.randomUUID(),
              user_id: user.id,
              Business_Name: p.businessName,
              Business_Category: p.businessCategory,
              Contact_Person: p.contactPerson,
              Contact_Number: p.contactNumber,
              Email: p.email,
              Username: p.username,
              Registration_Date: new Date().toISOString().slice(0, 10),
            })
            .select("Partner_ID, user_id, Business_Name, Business_Category, Contact_Person, Contact_Number, Email, Username, Registration_Date")
            .single();

          if (insertError || !insertedPartner) {
            throw insertError || new Error("Business partner registration failed.");
          }

          const savedPartner: BusinessPartner = {
            partnerId: insertedPartner.Partner_ID,
            userId: insertedPartner.user_id,
            businessName: insertedPartner.Business_Name ?? "",
            businessCategory: insertedPartner.Business_Category ?? p.businessCategory,
            contactPerson: insertedPartner.Contact_Person ?? "",
            contactNumber: insertedPartner.Contact_Number ?? "",
            email: insertedPartner.Email ?? "",
            username: insertedPartner.Username ?? "",
            registrationDate: insertedPartner.Registration_Date ?? null,
          };

          setPartnerBusinesses((prev) => [savedPartner, ...prev]);
          setPartnerData(savedPartner);
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

  if (authLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f5c] text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8.7"/><path d="M3.5 12h17M12 3.3c-4 4.4-4 13 0 17.4M12 3.3c4 4.4 4 13 0 17.4" strokeLinecap="round"/></svg>
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading TRAVELMATE…</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return (
    <>
      <LandingPage
        onLogin={() => setModal("login")}
        onRegister={() => setModal("register")}
      />
      <Modals />
    </>
  );

  // ── Countries ────────────────────────────────────────────────────────────────

  if (screen === "countries") return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800">
      <Navbar />
      {modal === "menu" && <div className="fixed inset-0 z-40" onClick={() => setModal(null)} />}

      {/* Hero / discovery workspace */}
      <section className="relative overflow-hidden bg-[#0b1f5c] pt-[68px]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 85% 20%, rgba(56,189,248,0.32), transparent 28%), radial-gradient(circle at 12% 110%, rgba(255,255,255,0.10), transparent 32%)" }} />
        <div className="relative mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                Explore · Book · Enjoy
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: "Outfit, sans-serif" }}>
                Where do you<br />want to go?
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/55 sm:text-base">Pick a country, choose a city, then explore restaurants, accommodations, convenience stores, landmarks, and tourist destinations.</p>

              <div className="mt-8 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/20">
                <div className="grid divide-y divide-slate-200 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:divide-x md:divide-y-0">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Keyword</p>
                      <input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="e.g. Baguio" className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Zm0-17c2.2 2.4 3.4 5.2 3.4 8.5S14.2 18.6 12 21M3.8 10h16.4M3.8 14h16.4"/></svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Country</p>
                      <select value={filterCountry} onChange={(e: any) => { setFilterCountry(e.target.value); setFilterCity(""); }} className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none">
                        <option value="">All Countries</option>
                        {COUNTRIES.map((c) => <option key={c.Country_ID} value={c.Country_ID}>{c.Country_Name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">City</p>
                      <select value={filterCity} onChange={(e: any) => setFilterCity(e.target.value)} className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none">
                        <option value="">All Cities</option>
                        {citiesForFilter.map((c) => <option key={c.City_ID} value={c.City_ID}>{c.City_Name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8"/></svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Category</p>
                      <select value={filterCategory} onChange={(e: any) => setFilterCategory(e.target.value)} className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-slate-800 focus:outline-none">
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => <option key={c.Category_ID} value={c.Category_ID}>{c.Category_Type}</option>)}
                      </select>
                    </div>
                  </div>

                  <button onClick={handleSearchGo} className="flex min-h-[60px] items-center justify-center gap-2 bg-amber-500 px-7 text-sm font-black text-white transition hover:bg-amber-400 active:bg-amber-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
                    Search
                  </button>
                </div>
              </div>
              {hasActiveFilter && <button onClick={clearFilters} className="mt-3 text-xs font-semibold text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white">Clear filters</button>}
            </div>

            <div className="hidden lg:block">
              <div className="relative mx-auto h-[300px] max-w-[420px]">
                <div className="absolute left-0 top-8 h-60 w-44 -rotate-6 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl">
                  <img src={COUNTRIES[0].Country_Image} alt="Philippines" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061536]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Start here</p><p className="mt-1 text-lg font-black">Philippines</p></div>
                </div>
                <div className="absolute right-0 top-0 h-64 w-52 rotate-6 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl">
                  <img src={COUNTRIES[1].Country_Image} alt="Japan" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061536]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Go further</p><p className="mt-1 text-lg font-black">Japan</p></div>
                </div>
                <div className="absolute bottom-0 left-32 h-28 w-36 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-xl">
                  <img src={COUNTRIES[2].Country_Image} alt="Greece" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/15" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        {/* Countries */}
        <section className="pt-10 sm:pt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{hasActiveFilter ? "Search results" : "Start with a country"}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0b1f5c] sm:text-3xl" style={{ fontFamily: "Outfit, sans-serif" }}>{hasActiveFilter ? `${shownCountries.length} matching ${shownCountries.length === 1 ? "country" : "countries"}` : "Explore the world"}</h2>
            </div>
            <p className="hidden text-xs font-semibold text-slate-400 sm:block">{COUNTRIES.length} countries · {CITIES.length} featured cities</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shownCountries.map((c) => {
              const cityCount = CITIES.filter((ci) => ci.Country_ID === c.Country_ID).length;
              const canExplore = c.interactable;
              return canExplore ? (
                <button key={c.Country_ID} onClick={() => pickCountry(c)} className="group relative h-72 overflow-hidden rounded-3xl bg-slate-900 text-left ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/15">
                  <img src={c.Country_Image} alt={c.Country_Name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020816] via-[#020816]/15 to-black/5" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">{c.Country_Specialty}</div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-xl">{FLAGS[c.Country_ID]}</div>
                    <h3 className="mt-1 text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/65"><span>{cityCount} featured cities</span><span>·</span><span>Explore now</span><span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">→</span></div>
                  </div>
                </button>
              ) : (
                <div key={c.Country_ID} className="group relative h-72 overflow-hidden rounded-3xl bg-slate-900 text-left ring-1 ring-black/5">
                  <img src={c.Country_Image} alt={c.Country_Name} className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020816] via-[#020816]/20 to-black/5" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">Coming soon</div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-xl">{FLAGS[c.Country_ID]}</div>
                    <h3 className="mt-1 text-2xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{c.Country_Name}</h3>
                    <div className="mt-1 text-xs font-semibold text-white/55">{c.display_city_count ?? cityCount} cities planned</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Popular Cities carousel */}
        {!hasActiveFilter && (
          <section className="pt-16">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-500">Handpicked</p>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Popular Cities</p>
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0b1f5c] sm:text-3xl" style={{ fontFamily: "Outfit, sans-serif" }}>Places worth the trip</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scrollCities("left")} aria-label="Scroll popular cities left" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0b1f5c] hover:bg-[#0b1f5c] hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7"/></svg>
                </button>
                <button onClick={() => scrollCities("right")} aria-label="Scroll popular cities right" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0b1f5c] hover:bg-[#0b1f5c] hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            <div ref={citiesScrollRef} className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollBehavior: "smooth" }}>
              {POPULAR_CITY_IDS.map((cityId) => {
                const city = CITIES.find((ci) => ci.City_ID === cityId);
                if (!city) return null;
                const co = COUNTRIES.find((c) => c.Country_ID === city.Country_ID);
                if (!co) return null;
                const interactive = co.interactable;
                const card = (
                  <div className={`group relative h-64 w-[230px] shrink-0 overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-black/5 ${interactive ? "transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/15" : "opacity-90"}`}>
                    <img src={city.City_Image} alt={city.City_Name} className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${interactive ? "group-hover:scale-105" : "grayscale-[15%]"}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020816] via-[#020816]/10 to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <span className="text-lg drop-shadow">{FLAGS[co.Country_ID]}</span>
                      {!interactive && <span className="rounded-full bg-black/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-sm">Coming soon</span>}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">{co.Country_Name}</p>
                      <h3 className="mt-1 text-2xl font-black leading-tight text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{city.City_Name}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-white/65">{interactive ? city.City_Specialty : "Featured destination"}</p>
                        {interactive && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">→</span>}
                      </div>
                    </div>
                  </div>
                );
                return interactive ? (
                  <button key={city.City_ID} onClick={() => { setCountry(co); pickCity(city); }} className="block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1f5c] focus-visible:ring-offset-2 rounded-3xl">{card}</button>
                ) : (
                  <div key={city.City_ID} aria-disabled="true">{card}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* Logged-in quick actions */}
        <section className="pt-16">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Your TravelMate</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0b1f5c] sm:text-3xl" style={{ fontFamily: "Outfit, sans-serif" }}>Keep your trip moving</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <button onClick={() => go("plans")} className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f5c] text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.5h11a2 2 0 0 1 2 2v15l-7.5-3.8L4.5 20.5v-15a2 2 0 0 1 2-2Z"/><path strokeLinecap="round" d="M8 8h8M8 11h8"/></svg>
              </div>
              <h3 className="mt-4 text-lg font-black text-[#0b1f5c]">My Trips</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Open your saved travel plans, edit them, or continue planning.</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#0b1f5c]">View trips <span className="transition group-hover:translate-x-1">→</span></span>
            </button>

            <button onClick={() => setShowSearchHistory(true)} className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f5c]/8 text-[#0b1f5c]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
              </div>
              <h3 className="mt-4 text-lg font-black text-[#0b1f5c]">Search History</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Jump back to destinations and categories you recently searched.</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#0b1f5c]">View history <span className="transition group-hover:translate-x-1">→</span></span>
            </button>

            <button onClick={() => isPartner ? go("partner-businesses") : setModal("partner")} className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"/><path strokeLinecap="round" strokeLinejoin="round" d="m4 8.5 8 4.5 8-4.5M12 13v7"/></svg>
              </div>
              <h3 className="mt-4 text-lg font-black text-[#0b1f5c]">{isPartner ? "My Business" : "Become a Business Partner"}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{isPartner ? "Manage your registered businesses from one place." : "Register your travel-related business and manage its information."}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#0b1f5c]">{isPartner ? "Open dashboard" : "Get started"} <span className="transition group-hover:translate-x-1">→</span></span>
            </button>
          </div>
        </section>
      </main>
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
                  {cat && <span className={`absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${CAT_COLOR[cat.Category_Type].badge}`}><CategoryIcon type={cat.Category_Type} size={13} className="mr-1 inline-block align-[-2px]" />{cat.Category_Type}</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-base font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>{c.City_Name}</h3>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{c.City_Specialty}</p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.City_Description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {presentTypes.map((t) => <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[t].badge}`}><CategoryIcon type={t} size={12} className="inline-block align-[-2px]" /></span>)}
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
                      <CategoryIcon type={cat.Category_Type} size={13} className="mr-1 inline-block align-[-2px]" />{cat.Category_Type}
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
            <div className="py-20 text-center text-slate-400"><Icon name="folder" size={34} className="mx-auto mb-3" /><p className="text-sm">No {activeCat.Category_Name} listed yet.</p></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDests.map((d) => {
                const revCount = (REVIEWS[d.Destination_ID] ?? []).length;
                return (
                  <button key={d.Destination_ID} onClick={() => pickDest(d)} className="group bg-white rounded-2xl overflow-hidden text-left border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">
                    <div className={`${CAT_COLOR[activeCat.Category_Type].card} h-28 relative overflow-hidden flex items-end p-4`}>
                      <img src={getDestinationImage(d)} alt={d.Destination_Name} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-35 transition-opacity duration-300" />
                      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/80 relative z-10">{activeCat.Category_Type}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-extrabold text-[#0b1f5c] text-sm mb-1 group-hover:text-blue-700 transition-colors leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>{d.Destination_Name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{d.Destination_Description}</p>
                      <div className="flex items-center justify-between">
                        <Stars n={d.Rating} />
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">D-{String(d.Destination_ID).padStart(3,"0")}</span>
                      </div>
                      {revCount > 0 && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400"><Icon name="notes" size={12} />{revCount} review{revCount > 1 ? "s" : ""}</p>}
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
    <DestinationDetailsScreen
      dest={dest}
      destCat={destCat}
      country={country}
      city={city}
      destReviews={destReviews}
      destsForCity={destsForCity}
      isLoggedIn={isLoggedIn}
      currentUserId={currentUserId}
      onBack={() => go("city")}
      onRegister={() => setModal("register")}
      onWriteReview={() => setModal("review")}
      onOpenPlan={() => setModal("plan")}
      onPickDestination={pickDest}
      onEditReview={setEditingReview}
      onDeleteReview={async (review) => {
        if (!window.confirm("Are you sure you want to delete your review?")) return;
        try {
          await deleteReviewFromSupabase(review);
          setLiveReviews((prev) => ({
            ...prev,
            [dest.Destination_ID]: (prev[dest.Destination_ID] ?? []).filter(
              (item) => item.Review_ID !== review.Review_ID
            ),
          }));
          alert("Review deleted successfully!");
        } catch (error: any) {
          alert(error.message || "Failed to delete review.");
        }
      }}
      Navbar={Navbar}
      Modals={Modals}
    />
  );

  // ── Travel Plans ──────────────────────────────────────────────────────────────

  if (screen === "plans") return (
    <MyTripsScreen
      plans={dbTravelPlans}
      destinations={activeDestinations}
      onBack={() => go("countries")}
      onExplore={() => go("countries")}
      onEdit={(plan) => setEditingPlan(plan)}
      onDelete={async (plan) => {
        const confirmed = window.confirm(
          `Are you sure you want to delete "${plan.plan_name}"?`
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
            .eq("travelplan_id", plan.travelplan_id)
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
      onOpenDestination={(destination) => pickDest(destination)}
      Modals={Modals}
    />
  );

  if (screen === "partner-businesses") return (
    <MyBusinessesScreen
      businesses={partnerBusinesses}
      onSelectBusiness={(business) => {
        setModal(null);
        setPartnerData(business);
        go("partner-dashboard");
      }}
      onAddBusiness={() => setModal("partner")}
      onBack={() => go("countries")}
      Modals={Modals}
    />
  );

  if (screen === "partner-dashboard" && partnerData) return (
    <PartnerDashboard
      partner={partnerData}
      onUpdate={async (updatedPartner) => {
        if (!updatedPartner.partnerId) {
          throw new Error("This business does not have a valid partner ID.");
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to update a business.");
        }

        const { data, error } = await supabase
          .from("BUSINESS_PARTNER")
          .update({
            Business_Name: updatedPartner.businessName,
            Business_Category: updatedPartner.businessCategory,
            Contact_Person: updatedPartner.contactPerson,
            Contact_Number: updatedPartner.contactNumber,
            Email: updatedPartner.email,
            Username: updatedPartner.username,
          })
          .eq("Partner_ID", updatedPartner.partnerId)
          .eq("user_id", user.id)
          .select("Partner_ID, user_id, Business_Name, Business_Category, Contact_Person, Contact_Number, Email, Username, Registration_Date")
          .single();

        if (error || !data) {
          throw error || new Error("Business update failed.");
        }

        const savedPartner: BusinessPartner = {
          partnerId: data.Partner_ID,
          userId: data.user_id,
          businessName: data.Business_Name ?? "",
          businessCategory: data.Business_Category ?? updatedPartner.businessCategory,
          contactPerson: data.Contact_Person ?? "",
          contactNumber: data.Contact_Number ?? "",
          email: data.Email ?? "",
          username: data.Username ?? "",
          registrationDate: data.Registration_Date ?? null,
        };

        setPartnerBusinesses((prev) =>
          prev.map((item) => item.partnerId === savedPartner.partnerId ? savedPartner : item)
        );
        setPartnerData(savedPartner);
      }}
      onDelete={async (business: BusinessPartner) => {
        if (!business.partnerId) {
          throw new Error("This business does not have a valid partner ID.");
        }

        const confirmed = window.confirm(
          `Are you sure you want to permanently delete "${business.businessName}"?`
        );

        if (!confirmed) return;

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to delete a business.");
        }

        const { data, error } = await supabase
          .from("BUSINESS_PARTNER")
          .delete()
          .eq("Partner_ID", business.partnerId)
          .eq("user_id", user.id)
          .select("Partner_ID");

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("Business could not be deleted.");
        }

        setPartnerBusinesses((prev) => prev.filter((item) => item.partnerId !== business.partnerId));
        setPartnerData(null);

        const remaining = partnerBusinesses.filter((item) => item.partnerId !== business.partnerId);
        setIsPartner(remaining.length > 0);
        go(remaining.length > 0 ? "partner-businesses" : "countries");
      }}
      onBack={() => go("partner-businesses")}
      Navbar={Navbar}
      Modals={Modals}
    />
  );

  return null;
}
