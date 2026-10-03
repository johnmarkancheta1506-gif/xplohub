import { useEffect, useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import type { UserProfile } from "../../types";
import UserAvatar from "../common/UserAvatar";
import { ensureUserInfo } from "../../services/authService";
import { removeAvatar, uploadAvatar, getAvatarPublicUrl, getStoredAvatarPath, MAX_AVATAR_SIZE } from "../../services/avatarService";
import { Icon } from "../common/Icon";


function formatRegistrationDate(value?: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);

  const yy = String(parsed.getFullYear()).slice(-2);
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

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
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarRemoval, setPendingAvatarRemoval] = useState(false);
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");

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
      const metadataAvatarPath = user.user_metadata?.avatar_path || null;
      const storedAvatarPath = metadataAvatarPath || await getStoredAvatarPath(user.id);
      const customAvatar = user.user_metadata?.avatar_url || getAvatarPublicUrl(storedAvatarPath);
      const googleAvatar = user.user_metadata?.picture || user.user_metadata?.avatar || googleIdentity?.identity_data?.picture || null;
      const authAvatar = customAvatar || googleAvatar;
      const authAvatarPath = storedAvatarPath;
      const authProvider = user.app_metadata?.provider ?? null;
      setGender(authGender === "Male" || authGender === "Female" ? authGender : "");
      setAvatarUrl(authAvatar);
      setAvatarPath(authAvatarPath);
      setFallbackAvatarUrl(googleAvatar);
      setPendingAvatarFile(null);
      setPendingAvatarPreviewUrl(null);
      setPendingAvatarRemoval(false);
      setAvatarError("");

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
        registration_date: user.created_at ?? data.registration_date ?? null,
        gender: authGender === "Male" || authGender === "Female" ? authGender : null,
        avatar_url: authAvatar,
        avatar_path: authAvatarPath,
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

      // Avatar changes are staged locally when the user chooses/removes an image.
      // They are only written to Supabase after the user clicks Save Changes.
      let savedAvatarUrl = avatarUrl;
      let savedAvatarPath = avatarPath;

      if (pendingAvatarFile) {
        const result = await uploadAvatar(user.id, pendingAvatarFile);
        savedAvatarUrl = result.publicUrl;
        savedAvatarPath = result.path;
      } else if (pendingAvatarRemoval && avatarPath) {
        await removeAvatar(user.id, avatarPath);
        savedAvatarUrl = fallbackAvatarUrl;
        savedAvatarPath = null;
      }

      const { error: authProfileError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          username: username.trim() || null,
          contact_number: contactNumber.trim() || null,
          address: address.trim() || null,
          travel_preference: travelPreference.trim() || null,
          gender: gender || null,
          avatar_url: savedAvatarUrl,
          avatar_path: savedAvatarPath,
        },
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
        registration_date: user.created_at ?? data.registration_date ?? null,
        gender: gender || null,
        avatar_url: savedAvatarUrl,
        avatar_path: savedAvatarPath,
        auth_provider: user.app_metadata?.provider ?? null,
      };

      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
      setPendingAvatarFile(null);
      setPendingAvatarPreviewUrl(null);
      setPendingAvatarRemoval(false);
      setAvatarUrl(savedAvatarUrl);
      setAvatarPath(savedAvatarPath);
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

    if (pendingAvatarPreviewUrl) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl);
    }

    setFullName(profile.full_name);
    setUsername(profile.username ?? "");
    setContactNumber(profile.contact_number ?? "");
    setAddress(profile.address ?? "");
    setTravelPreference(profile.travel_preference ?? "");
    setGender(profile.gender ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setAvatarPath(profile.avatar_path ?? null);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
    setPendingAvatarRemoval(false);
    setErrorMsg("");
    setAvatarError("");
    setEditing(false);
  };


  return (
    <Overlay onClose={onClose} contentClassName="max-w-2xl">
      <div className="bg-white">
        <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca0c2]">Account</p>
              <h2 className="mt-0.5 text-xl font-extrabold text-[#0b1f5c]" style={{ fontFamily: "Outfit, sans-serif" }}>
                My Profile
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-scroll-area max-h-[78vh] overflow-y-auto px-6 pb-7 sm:px-7">
          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
              <Icon name="notes" size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-slate-100" />
              <p className="mt-3 text-sm font-medium text-slate-400">Loading your profile...</p>
            </div>
          ) : profile ? (
            <>
              {/* Profile hero */}
              <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#0b1f5c] p-6 text-white sm:p-7">
                <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-white/10" />
                <div className="absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-[#ff9b2f]/20" />
                <div className="relative flex items-center gap-4">
                  <div className="shrink-0 rounded-full bg-white/15 p-1.5">
                    <UserAvatar
                      userId={profile.user_id}
                      gender={profile.gender}
                      avatarUrl={profile.avatar_url}
                      name={profile.full_name}
                      sizeClass="h-24 w-24 sm:h-28 sm:w-28"
                      showBorder
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl font-extrabold">{profile.full_name || "User"}</h3>
                    <p className="mt-0.5 truncate text-sm text-blue-100">
                      {profile.username ? `@${profile.username}` : "No username set"}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-100">
                      <Icon name={profile.auth_provider === "google" ? "globe" : "user"} size={11} />
                      {profile.auth_provider === "google" ? "Google account" : "Email account"}
                    </div>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8ca0c2]">Profile information</p>
                      <p className="mt-0.5 text-sm text-slate-400">Your account details and travel preferences.</p>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#0b1f5c] shadow-sm transition hover:border-[#0b1f5c]/20 hover:bg-slate-50"
                    >
                      <Icon name="edit" size={13} /> Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      ["Full Name", profile.full_name || "—"],
                      ["Username", profile.username ? `@${profile.username}` : "—"],
                      ["Contact", profile.contact_number || "—"],
                      ["Preference", profile.travel_preference || "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0b1f5c]"><Icon name="user" size={15} /></div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                        <p className="truncate text-sm font-semibold text-slate-700">{profile.email || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{profile.address || "No address set"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {profile.account_status || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registered</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatRegistrationDate(profile.registration_date)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8ca0c2]">Edit profile</p>
                    <p className="mt-0.5 text-sm text-slate-400">Update your details. Nothing is saved until you confirm.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full Name" placeholder="Your full name" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFullName(e.target.value)} />
                    <Field label="Username" placeholder="Your username" value={username} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setUsername(e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                    <input type="email" value={profile.email ?? ""} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-400" />
                    <p className="mt-1 text-xs text-slate-400">Email is managed by your login provider.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact Number" placeholder="+63 9XX XXX XXXX" value={contactNumber} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContactNumber(e.target.value)} />
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Travel Preference</label>
                      <input value={travelPreference} onChange={(e) => setTravelPreference(e.target.value)} placeholder="Nature, food..." className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0b1f5c] focus:ring-2 focus:ring-blue-50" />
                    </div>
                  </div>

                  <Field label="Address" placeholder="Your address" value={address} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAddress(e.target.value)} />

                  {/* Avatar */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <UserAvatar userId={profile.user_id} gender={gender || profile.gender} avatarUrl={avatarUrl} name={fullName || profile.full_name} sizeClass="h-16 w-16" showBorder />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-slate-700">Profile picture</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Use JPG, PNG, WebP, GIF, or another image up to 1 MB.</p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0b1f5c] ring-1 ring-slate-200 transition hover:bg-slate-50 ${saving ? "pointer-events-none opacity-50" : ""}`}>
                            <Icon name="edit" size={12} /> Choose image
                            <input type="file" accept="image/*" className="hidden" disabled={saving} onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;
                              if (!file.type.startsWith("image/")) { setAvatarError("Please choose an image file."); return; }
                              if (file.size > MAX_AVATAR_SIZE) { setAvatarError("Image is too large. Please choose an image under 1 MB."); return; }
                              if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
                              const previewUrl = URL.createObjectURL(file);
                              setPendingAvatarFile(file); setPendingAvatarPreviewUrl(previewUrl); setPendingAvatarRemoval(false); setAvatarUrl(previewUrl); setAvatarError("");
                            }} />
                          </label>
                          {(avatarPath || pendingAvatarFile) && !pendingAvatarRemoval && (
                            <button type="button" disabled={saving} onClick={() => {
                              if (pendingAvatarPreviewUrl) { URL.revokeObjectURL(pendingAvatarPreviewUrl); setPendingAvatarPreviewUrl(null); }
                              setPendingAvatarFile(null); setPendingAvatarRemoval(true); setAvatarUrl(fallbackAvatarUrl); setAvatarError(""); setErrorMsg("Avatar removal is pending. Click Save Changes to confirm.");
                            }} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:opacity-50">Remove image</button>
                          )}
                          {pendingAvatarRemoval && (
                            <button type="button" disabled={saving} onClick={() => { setPendingAvatarRemoval(false); setAvatarUrl(profile.avatar_url ?? fallbackAvatarUrl); setErrorMsg("Avatar removal canceled. Click Save Changes to keep your current image."); }} className="rounded-lg px-3 py-2 text-xs font-bold text-[#0b1f5c] ring-1 ring-slate-200 transition hover:bg-white disabled:opacity-50">Undo remove</button>
                          )}
                        </div>
                        {avatarError && <p className="mt-2 text-xs font-bold text-red-600" role="alert">{avatarError}</p>}
                        {(pendingAvatarFile || pendingAvatarRemoval) && <p className="mt-2 text-xs font-bold text-amber-600">Changes are pending. Click Save Changes to confirm.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Avatar style */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Avatar style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Male", "Female"] as const).map((option) => (
                        <button key={option} type="button" onClick={() => setGender(option)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${gender === option ? "border-[#0b1f5c] bg-[#0b1f5c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                          <Icon name={option === "Male" ? "male" : "female"} size={15} /> {option}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Google profile photos stay in place when available.</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 text-xs text-slate-500">
                    <span>Account status: </span><span className="font-bold text-slate-700">{profile.account_status || "—"}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span>Registered: </span><span className="font-bold text-slate-700">{formatRegistrationDate(profile.registration_date)}</span>
                  </div>

                  <div className="sticky bottom-0 flex gap-2.5 border-t border-slate-100 bg-white pt-3">
                    <button onClick={handleCancel} disabled={saving} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#0b1f5c] py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#162d7a] disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">Your profile could not be loaded.</div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
