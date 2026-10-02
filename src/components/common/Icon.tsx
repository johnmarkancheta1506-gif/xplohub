import type { ReactNode, SVGProps } from "react";
import type { CategoryType } from "../../types";

export type IconName =
  | "search"
  | "history"
  | "user"
  | "business"
  | "calendar"
  | "wallet"
  | "notes"
  | "edit"
  | "trash"
  | "arrow-right"
  | "arrow-left"
  | "location"
  | "globe"
  | "restaurant"
  | "accommodation"
  | "store"
  | "landmark"
  | "compass"
  | "spark"
  | "folder"
  | "star"
  | "x"
  | "phone"
  | "clock"
  | "tag"
  | "hash"
  | "male"
  | "female";

const CATEGORY_ICON: Record<CategoryType, IconName> = {
  Restaurant: "restaurant",
  Accommodation: "accommodation",
  "Convenience Store": "store",
  Landmark: "landmark",
  "Tourist Destination": "compass",
};

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.7"/><path d="m16 16 4.2 4.2" /></>,
  history: <><circle cx="12" cy="12" r="8.8"/><path d="M12 7.5v4.9l3.1 2" /></>,
  user: <><circle cx="12" cy="8" r="3.2"/><path d="M5.2 19.1c1.5-3.2 4-4.8 6.8-4.8s5.3 1.6 6.8 4.8" /></>,
  business: <><path d="M4 20V8.5h6V20M10 20V4h10v16M7 11h0M7 14h0M7 17h0M14 8h3M14 11h3M14 14h3M14 17h3" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01" strokeWidth="2.4" /></>,
  wallet: <><path d="M4.5 7.5h13.2a2.3 2.3 0 0 1 2.3 2.3v6.7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11.5"/><path d="M20 11.5h-4.2a2 2 0 1 0 0 4H20"/><path d="M15.8 13.5h0" strokeWidth="2.4" /></>,
  notes: <><path d="M7 3.8h7.2L19 8.6V20H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z"/><path d="M14 3.8v5h5M9 13h6M9 16h6" /></>,
  edit: <><path d="M4 17.5V20h2.5L18.7 7.8l-2.5-2.5L4 17.5Z"/><path d="m14.7 6.3 2.5 2.5M5 20h5" /></>,
  trash: <><path d="M5 7h14M9 7V4.5h6V7M7.5 7l.7 12.1a1.8 1.8 0 0 0 1.8 1.7h4a1.8 1.8 0 0 0 1.8-1.7L16.5 7M10 10.5v6M14 10.5v6" /></>,
  "arrow-right": <path d="m9 5 7 7-7 7M3.5 12H16" />,
  "arrow-left": <path d="m15 5-7 7 7 7M20.5 12H8" />,
  location: <><path d="M19 10.3c0 4.7-7 10-7 10s-7-5.3-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10.3" r="2.3"/></>,
  globe: <><circle cx="12" cy="12" r="8.8"/><path d="M3.5 12h17M12 3.2c2.3 2.4 3.4 5.2 3.4 8.8S14.3 18.4 12 20.8M12 3.2c-2.3 2.4-3.4 5.2-3.4 8.8s1.1 6.4 3.4 8.8" /></>,
  restaurant: <><path d="M6 3v7M4 3v7M8 3v7M4 7h4M6 10v11"/><path d="M14 3v7c0 2 1.3 3 3.1 3H19M18 3v18" /></>,
  accommodation: <><path d="M4 18V8.5h16V18M4 14h16M7 11h4.5c1.7 0 3 1.3 3 3M7 8.5V6.8h4.5v1.7" /></>,
  store: <><path d="M4 10.2V20h16v-9.8M3 10l2-5h14l2 5M3 10c0 1.2 1 2.2 2.2 2.2S7.5 11.2 7.5 10c0 1.2 1 2.2 2.2 2.2S12 11.2 12 10c0 1.2 1 2.2 2.3 2.2s2.2-1 2.2-2.2c0 1.2 1 2.2 2.3 2.2S21 11.2 21 10" /></>,
  landmark: <><path d="M4 20h16M6 20V9M10 20V9M14 20V9M18 20V9M3 9l9-5 9 5H3Z" /></>,
  compass: <><circle cx="12" cy="12" r="8.8"/><path d="m15.7 8.3-2.2 5.2-5.2 2.2 2.2-5.2 5.2-2.2Z" /></>,
  spark: <path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Zm5 11 .7 2.3L20 17l-2.3.7L17 20l-.7-2.3L14 17l2.3-.7L17 14Z" />,
  folder: <path d="M4.5 6.5h5l1.5 2h8.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5Z" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" strokeLinejoin="round" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  phone: <path d="M7.2 4.2 4.8 6.6c-.7.7-.8 1.8-.2 2.6 2.8 4 5.9 7.1 9.9 9.9.8.6 1.9.5 2.6-.2l2.4-2.4c.6-.6.6-1.7-.1-2.2l-2.8-2.2c-.6-.5-1.5-.4-2 .2l-1.1 1.4c-1.4-.9-2.6-2.1-3.5-3.5l1.4-1.1c.6-.5.7-1.4.2-2L9.4 4.3c-.5-.7-1.6-.7-2.2-.1Z" strokeLinejoin="round" />,
  clock: <><circle cx="12" cy="12" r="8.8"/><path d="M12 7.5v4.9l3.1 2" /></>,
  tag: <><path d="m4 5 7.6-.2L20 13.2 13.2 20 4.8 11.6 4 5Z" strokeLinejoin="round"/><circle cx="8.2" cy="8.2" r="1.1" /></>,
  hash: <path d="M9 3 7 21M17 3l-2 18M4 9h17M3 15h17" />,
  male: <><circle cx="10.5" cy="8" r="3.1"/><path d="M4.8 20c1.1-3.4 3.2-5.1 5.7-5.1S15.1 16.6 16.2 20"/><path d="M15.5 5.2h4v4M16.7 8.3l2.8-2.8" /></>,
  female: <><circle cx="11" cy="8" r="3.1"/><path d="M5.2 20c1.1-3.4 3.2-5.1 5.8-5.1s4.7 1.7 5.8 5.1"/><path d="M19 5.5a3.4 3.4 0 1 0-1.7 5.2" /></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.9, className = "", ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function CategoryIcon({ type, size = 16, className = "" }: { type: CategoryType; size?: number; className?: string }) {
  return <Icon name={CATEGORY_ICON[type]} size={size} className={className} />;
}
