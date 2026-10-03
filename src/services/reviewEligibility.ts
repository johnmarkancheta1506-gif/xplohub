import supabase from "../config/supabaseClient";

export type ReviewEligibility = {
  eligible: boolean;
  reason: string;
  completedPlanId?: number;
};

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEndDate(startDate: string, numberOfDays: number) {
  if (!startDate || !numberOfDays || numberOfDays < 1) return "";

  const normalizedStart = String(startDate).trim().slice(0, 10);
  const date = new Date(`${normalizedStart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + numberOfDays - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Review rule for Mission 4:
 * - the user must be authenticated;
 * - the user must have a TRAVEL_PLAN for this exact destination;
 * - the plan must be marked Completed;
 * - the calculated end date must already have passed.
 *
 * The current schema has no booking/check-in/visit table, so this rule uses
 * the completed Travel Plan as the application's explicit visit proxy.
 */
export async function checkReviewEligibility(
  userId: string | null,
  destinationId: number,
): Promise<ReviewEligibility> {
  if (!userId) {
    return {
      eligible: false,
      reason: "Sign in to review this place.",
    };
  }

  // Fetch the user's plans first, then normalize IDs/status values locally.
  // This avoids false negatives when PostgreSQL returns numeric IDs as strings
  // or when an older row contains a different casing/spacing for the status.
  const { data, error } = await supabase
    .from("TRAVEL_PLAN")
    .select("travelplan_id, destination_id, start_date, number_of_days, travel_status")
    .eq("user_id", userId)
    .order("travelplan_id", { ascending: false });

  if (error) {
    console.error("Review eligibility check failed:", error);
    return {
      eligible: false,
      reason: "We could not verify your completed travel plan right now.",
    };
  }

  const today = getTodayInputValue();
  const plans = (data ?? []).filter((plan: any) => {
    const sameDestination = Number(plan.destination_id) === Number(destinationId);
    const status = String(plan.travel_status ?? "").trim().toLowerCase();
    return sameDestination && status === "completed";
  });

  const completedPlan = plans.find((plan: any) => {
    const endDate = getEndDate(
      String(plan.start_date ?? ""),
      Number(plan.number_of_days ?? 0),
    );

    return Boolean(endDate) && endDate <= today;
  });

  if (completedPlan) {
    return {
      eligible: true,
      reason: "Eligible: you have a completed Travel Plan for this destination.",
      completedPlanId: Number(completedPlan.travelplan_id),
    };
  }

  const futureCompletedEndDates = plans
    .map((plan: any) =>
      getEndDate(
        String(plan.start_date ?? ""),
        Number(plan.number_of_days ?? 0),
      )
    )
    .filter((value): value is string => Boolean(value) && value > today)
    .sort();

  if (futureCompletedEndDates.length > 0) {
    const endDate = new Date(`${futureCompletedEndDates[0]}T00:00:00`);
    const formatted = endDate.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      eligible: false,
      reason: `Review unavailable until your completed Travel Plan ends on ${formatted}.`,
    };
  }

  return {
    eligible: false,
    reason:
      "Review unavailable. This exact destination needs a Travel Plan marked Completed, and the trip end date must be today or earlier.",
  };
}
