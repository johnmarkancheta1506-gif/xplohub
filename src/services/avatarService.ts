import supabase from "../config/supabaseClient";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_SIZE = 1024 * 1024; // 1 MB

function getAvatarPath(userId: string) {
  return `${userId}/avatar`;
}

export function getAvatarPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data?.publicUrl ? `${data.publicUrl}?v=stored` : null;
}


export async function getStoredAvatarPath(userId: string) {
  if (!userId) return null;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 20 });

  if (error) {
    console.warn("Could not check stored avatar:", error);
    return null;
  }

  const avatar = (data ?? []).find((file: any) => file?.name === "avatar");
  return avatar ? getAvatarPath(userId) : null;
}

export async function getStoredAvatarPublicUrl(userId: string) {
  const path = await getStoredAvatarPath(userId);
  return path ? getAvatarPublicUrl(path) : null;
}

export async function uploadAvatar(userId: string, file: File) {
  if (!userId) {
    throw new Error("You must be logged in to upload an avatar.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Avatar image must be 1 MB or smaller.");
  }

  const path = getAvatarPath(userId);

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Avatar uploaded, but its public URL could not be generated.");
  }

  // The fixed storage path keeps ownership/security simple. The timestamp
  // prevents the browser from displaying a cached copy after replacement.
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      avatar_url: publicUrl,
      avatar_path: path,
    },
  });

  if (metadataError) {
    throw metadataError;
  }

  return { publicUrl, path };
}

export async function removeAvatar(userId: string, avatarPath?: string | null) {
  if (!userId) {
    throw new Error("You must be logged in to remove an avatar.");
  }

  const path = avatarPath || getAvatarPath(userId);

  const { error: removeError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([path]);

  if (removeError) {
    throw removeError;
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      avatar_url: null,
      avatar_path: null,
    },
  });

  if (metadataError) {
    throw metadataError;
  }
}
