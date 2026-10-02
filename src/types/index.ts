export type CategoryType = "Restaurant" | "Accommodation" | "Convenience Store" | "Landmark" | "Tourist Destination";

export interface Category { Category_ID: number; Category_Name: string; Category_Type: CategoryType; }
export interface Country { Country_ID: number; Country_Name: string; Country_Description: string; Country_Specialty: string; Country_Image: string; interactable: boolean; display_city_count?: number; }
export interface City { City_ID: number; Country_ID: number; Category_ID: number; City_Name: string; City_Description: string; City_Specialty: string; City_Image: string; }
export interface Destination { Destination_ID: number; City_ID: string | number; Category_ID: number; Place_Type_ID?: number; Destination_Name: string; Destination_Description: string; Address: string; Contact_Number: string; Operating_Hours: string; Destination_Image: string; Rating: number; }
export interface ReviewEntry { Review_ID: number; user_id?: string; reviewer_name: string; reviewer_avatar: string; Rating: number; Review_Comment: string; Review_Date: string; Review_Status: "Approved" | "Pending"; subtype_rating: number; subtype_feedback: string; }
export interface TravelPlan { TravelPlan_ID: number; Plan_Name: string; Start_Date: string; Number_of_Days: number; Budget: number; Travel_Status: "Planned" | "Ongoing" | "Completed"; Notes: string; destination_name: string; category_name: string; }
export interface BusinessPartner { partnerId?: string; userId?: string; businessName: string; businessCategory: string; contactPerson: string; contactNumber: string; email: string; username: string; registrationDate?: string | null; }
export interface SearchHistoryEntry { search_id: number; user_id: string; country_id: string | null; city_id: string | null; category_id: number | null; search_category: string; search_keyword: string; search_date_time: string | null; country_name: string; city_name: string; }
export interface UserProfile { user_id: string; full_name: string; username: string | null; email: string | null; contact_number: string | null; address: string | null; travel_preference: string | null; account_status: string | null; registration_date: string | null; }
