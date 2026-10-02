import supabase from "../config/supabaseClient";

/**
 * Ensures every authenticated Supabase user also has a USER_INFO profile row.
 * The database trigger should normally create this row, but OAuth callbacks
 * can reach the app before the profile row is available. This helper makes
 * the operation idempotent and provides a safe frontend fallback.
 */
export async function ensureUserInfo(user: any) {
  if (!user?.id) {
    throw new Error("No authenticated user was provided.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("USER_INFO")
    .select("user_id, full_name, username, email, account_status, registration_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return existing;
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "New User";

  const username = user.user_metadata?.username || null;

  const { data: inserted, error: insertError } = await supabase
    .from("USER_INFO")
    .insert({
      user_id: user.id,
      full_name: fullName,
      username,
      email: user.email ?? null,
      account_status: "Active",
      registration_date: new Date().toISOString().slice(0, 10),
    })
    .select("user_id, full_name, username, email, account_status, registration_date")
    .maybeSingle();

  if (!insertError && inserted) {
    return inserted;
  }

  // A trigger may have created the row between our first lookup and insert.
  if (insertError) {
    const { data: afterInsert, error: retryError } = await supabase
      .from("USER_INFO")
      .select("user_id, full_name, username, email, account_status, registration_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!retryError && afterInsert) {
      return afterInsert;
    }

    throw insertError;
  }

  throw new Error("Unable to create your USER_INFO profile.");
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "select_account",
      },
      scopes: "openid email profile",
    },
  });
}
