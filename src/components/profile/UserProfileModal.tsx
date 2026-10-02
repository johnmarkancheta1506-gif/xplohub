import { useEffect, useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import type { UserProfile } from "../../types";
import UserAvatar from "../common/UserAvatar";
import { ensureUserInfo } from "../../services/authService";
import { Icon } from "../common/Icon";


export default function UserProfileModal({
  onClose,
  onProfileUpdated,
}: {
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [travelPreference, setTravelPreference] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to view your profile.");
      }

      const authGender = user.user_metadata?.gender;
      const googleIdentity = user.identities?.find((item: any) => item.provider === "google");
      const authAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.avatar || googleIdentity?.identity_data?.picture || null;
      const authProvider = user.app_metadata?.provider ?? null;
      setGender(authGender === "Male" || authGender === "Female" ? authGender : "");
      setAvatarUrl(authAvatar);

      try {
        await ensureUserInfo(user);
      } catch (profileInitError) {
        console.error("USER_INFO profile initialization error:", profileInitError);
      }

      const { data, error } = await supabase
        .from("USER_INFO")
        .select(
          "user_id, full_name, username, email, contact_number, address, travel_preference, account_status, registration_date"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        throw new Error(
          "Your profile could not be loaded. Please try opening it again."
        );
      }

      const loadedProfile: UserProfile = {
        user_id: data.user_id,
        full_name: data.full_name ?? "",
        username: data.username ?? null,
        email: data.email ?? user.email ?? null,
        contact_number: data.contact_number ?? null,
        address: data.address ?? null,
        travel_preference: data.travel_preference ?? null,
        account_status: data.account_status ?? null,
        registration_date: data.registration_date ?? null,
        gender: authGender === "Male" || authGender === "Female" ? authGender : null,
        avatar_url: authAvatar,
        auth_provider: authProvider,
      };

      setProfile(loadedProfile);
      setFullName(loadedProfile.full_name);
      setUsername(loadedProfile.username ?? "");
      setContactNumber(loadedProfile.contact_number ?? "");
      setAddress(loadedProfile.address ?? "");
      setTravelPreference(loadedProfile.travel_preference ?? "");
    } catch (error: any) {
      console.error("USER_INFO profile load error:", error);
      setErrorMsg(error.message || "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMsg("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to update your profile.");
      }

      const { error: authProfileError } = await supabase.auth.updateUser({
        data: { gender: gender || null },
      });

      if (authProfileError) {
        throw authProfileError;
      }

      const { data, error } = await supabase
        .from("USER_INFO")
        .update({
          full_name: fullName.trim(),
          username: username.trim() || null,
          contact_number: contactNumber.trim() || null,
          address: address.trim() || null,
          travel_preference: travelPreference.trim() || null,
        })
        .eq("user_id", user.id)
        .select(
          "user_id, full_name, username, email, contact_number, address, travel_preference, account_status, registration_date"
        )
        .single();

      if (error || !data) {
        throw error || new Error("Your profile could not be updated.");
      }

      const updatedProfile: UserProfile = {
        user_id: data.user_id,
        full_name: data.full_name ?? "",
        username: data.username ?? null,
        email: data.email ?? user.email ?? null,
        contact_number: data.contact_number ?? null,
        address: data.address ?? null,
        travel_preference: data.travel_preference ?? null,
        account_status: data.account_status ?? null,
        registration_date: data.registration_date ?? null,
        gender: gender || null,
        avatar_url: avatarUrl,
        auth_provider: user.app_metadata?.provider ?? null,
      };

      setProfile(updatedProfile);
      onProfileUpdated?.(updatedProfile);
      setFullName(updatedProfile.full_name);
      setUsername(updatedProfile.username ?? "");
      setContactNumber(updatedProfile.contact_number ?? "");
      setAddress(updatedProfile.address ?? "");
      setTravelPreference(updatedProfile.travel_preference ?? "");
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (error: any) {
      console.error("USER_INFO profile update error:", error);
      setErrorMsg(error.message || "Failed to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setFullName(profile.full_name);
    setUsername(profile.username ?? "");
    setContactNumber(profile.contact_number ?? "");
    setAddress(profile.address ?? "");
    setTravelPreference(profile.travel_preference ?? "");
    setGender(profile.gender ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setErrorMsg("");
    setEditing(false);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="My Profile" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-4 max-h-[78vh] overflow-y-auto">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading your profile...
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <UserAvatar
                userId={profile.user_id}
                gender={profile.gender}
                avatarUrl={profile.avatar_url}
                name={profile.full_name}
                sizeClass="h-16 w-16"
                showBorder
              />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-extrabold text-[#0b1f5c]">
                  {profile.full_name || "User"}
                </h3>
                <p className="truncate text-xs text-slate-400">
                  {profile.username ? `@${profile.username}` : "No username set"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Icon name={profile.auth_provider === "google" ? "globe" : "user"} size={11} />
                  {profile.auth_provider === "google" ? "Google account" : "Email account"}
                </p>
              </div>
            </div>

            {!editing ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.full_name || "—"}</p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.username || "—"}</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1 break-all">{profile.email || "—"}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Number</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.contact_number || "—"}</p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travel Preference</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.travel_preference || "—"}</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{profile.address || "—"}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.account_status || "—"}</p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Date</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{profile.registration_date || "—"}</p>
                  </div>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm"
                >
                  <span className="inline-flex items-center justify-center gap-2"><Icon name="edit" size={15} /> Edit Profile</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Field
                  label="Full Name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFullName(e.target.value)}
                />
                <Field
                  label="Username"
                  placeholder="Your username"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setUsername(e.target.value)}
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={profile.email ?? ""}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Email is managed by your login provider.</p>
                </div>
                <Field
                  label="Contact Number"
                  placeholder="+63 9XX XXX XXXX"
                  value={contactNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContactNumber(e.target.value)}
                />
                <Field
                  label="Address"
                  placeholder="Your address"
                  value={address}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAddress(e.target.value)}
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Travel Preference</label>
                  <textarea
                    rows={2}
                    value={travelPreference}
                    onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTravelPreference(e.target.value)}
                    placeholder="e.g. Beaches, culture, food, nature..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avatar style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Male", "Female"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGender(option)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${gender === option ? "border-[#0b1f5c] bg-[#0b1f5c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        <Icon name={option === "Male" ? "male" : "female"} size={16} />
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">Google profile photos stay in place when available.</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                  Account Status: <span className="font-semibold text-slate-700">{profile.account_status || "—"}</span>
                  <span className="mx-2">•</span>
                  Registration Date: <span className="font-semibold text-slate-700">{profile.registration_date || "—"}</span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-[#0b1f5c] text-white font-semibold py-2.5 rounded-xl hover:bg-[#162d7a] text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            Your profile could not be loaded.
          </div>
        )}
      </div>
    </Overlay>
  );
}

