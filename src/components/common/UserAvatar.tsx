import { useEffect, useState } from "react";

type Gender = "Male" | "Female" | null | undefined;

type Props = {
  userId?: string | null;
  gender?: Gender;
  avatarUrl?: string | null;
  name?: string | null;
  sizeClass?: string;
  className?: string;
  showBorder?: boolean;
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function getInitial(name?: string | null): string {
  const clean = (name ?? "").trim();
  if (!clean) return "U";
  if (clean.includes(",")) {
    const first = clean.split(",")[1]?.trim();
    if (first) return first.charAt(0).toUpperCase();
  }
  return clean.split(/\s+/)[0]?.charAt(0).toUpperCase() || "U";
}

const backgroundClasses = [
  "bg-[#b8c1df]",
  "bg-[#aebbdc]",
  "bg-[#c1cbe8]",
  "bg-[#a9b7d8]",
];

export default function UserAvatar({
  userId,
  gender,
  avatarUrl,
  name,
  sizeClass = "h-10 w-10",
  className = "",
  showBorder = false,
}: Props) {
  const tone = backgroundClasses[(userId ? hashString(userId) : 0) % backgroundClasses.length];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div
      className={`${sizeClass} ${tone} ${showBorder ? "ring-2 ring-white" : ""} overflow-hidden rounded-full flex items-center justify-center text-[#0b1f5c] ${className}`}
      title={name || undefined}
    >
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={name || "User profile"}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : gender === "Female" ? (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="42" r="24" fill="white" />
          <path d="M25 108c2-26 16-40 35-44 19 4 33 18 35 44Z" fill="white" />
          <path d="M36 47c-3-15 2-35 24-38 18-2 30 7 31 26 0 4-1 8-2 12-4-7-6-12-8-18-8 5-20 7-36 4-2 5-3 10-9 14Z" fill="white" />
          <path d="M44 63c-3 6-8 11-12 15M76 63c3 6 8 11 12 15" stroke="white" strokeWidth="8" strokeLinecap="round" />
        </svg>
      ) : gender === "Male" ? (
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="42" r="24" fill="white" />
          <path d="M24 108c2-26 17-40 36-44 19 4 34 18 36 44Z" fill="white" />
          <path d="M36 38c2-18 13-29 29-30 15 0 25 9 28 23-14-5-25-7-39-6-4 0-11 5-18 13Z" fill="white" />
          <path d="M42 64c-4 7-7 13-9 19M78 64c4 7 7 13 9 19" stroke="white" strokeWidth="8" strokeLinecap="round" />
        </svg>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#0b1f5c] text-[34%] font-black text-white">
          {getInitial(name)}
        </div>
      )}
    </div>
  );
}
