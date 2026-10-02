import type { Category, CategoryType } from "../types";

export const CATEGORIES: Category[] = [
  { Category_ID: 1, Category_Name: "Restaurants",          Category_Type: "Restaurant"          },
  { Category_ID: 2, Category_Name: "Accommodations",       Category_Type: "Accommodation"       },
  { Category_ID: 3, Category_Name: "Convenience Stores",   Category_Type: "Convenience Store"   },
  { Category_ID: 4, Category_Name: "Landmarks",            Category_Type: "Landmark"            },
  { Category_ID: 5, Category_Name: "Tourist Destinations", Category_Type: "Tourist Destination" },
];

export const DB_TABLE: Record<CategoryType, string> = {
  "Restaurant":          "RESTAURANT",
  "Accommodation":       "ACCOMMODATIONS",
  "Convenience Store":   "CONVENIENCE_STORES",
  "Landmark":            "LANDMARK",
  "Tourist Destination": "TOURIST_DESTINATION",
};

export const CAT_COLOR: Record<CategoryType, { card: string; badge: string }> = {
  "Restaurant":          { card: "bg-orange-600",  badge: "bg-orange-100 text-orange-700"  },
  "Accommodation":       { card: "bg-blue-600",    badge: "bg-blue-100 text-blue-700"      },
  "Convenience Store":   { card: "bg-green-600",   badge: "bg-green-100 text-green-700"    },
  "Landmark":            { card: "bg-violet-700",  badge: "bg-violet-100 text-violet-700"  },
  "Tourist Destination": { card: "bg-purple-700",  badge: "bg-purple-100 text-purple-700"  },
};


export const FLAGS: Record<number, string> = { 1: "🇵🇭", 2: "🇯🇵", 3: "🇬🇷", 4: "🇮🇩", 5: "🇰🇷", 6: "🇹🇭", 7: "🇮🇹", 8: "🇫🇷", 9: "🇦🇺", 10: "🇺🇸" };
