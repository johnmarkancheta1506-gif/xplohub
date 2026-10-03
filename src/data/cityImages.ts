import type { City } from "../types";

/**
 * City-card image overrides. These reuse the destination imagery already
 * sourced for the project, so city cards show a recognizable local place
 * instead of unrelated stock imagery. The existing City_Image remains the
 * fallback.
 */
const commonsFile = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;

const CITY_IMAGE_OVERRIDES: Record<string, string> = {
  "baguio city": "https://commons.wikimedia.org/wiki/Special:FilePath/BAGUIO%20BOTANICAL%20GARDEN.jpg?width=1200",
  "vigan": "https://angelynloves.wordpress.com/wp-content/uploads/2017/01/img_48021.jpg?w=1200",
  "vigan city": "https://angelynloves.wordpress.com/wp-content/uploads/2017/01/img_48021.jpg?w=1200",
  "el nido": "https://i.pinimg.com/originals/64/45/8b/64458b4ec3493cab84f8a908df5d602c.jpg",
  "kyoto": "https://mediaim.expedia.com/destination/2/6f024abcd72a361f2ef55a471e0d51a6.jpg",
  "tokyo": "https://media.triple.guide/triple-cms/c_limit%2Cf_auto%2Ch_1024%2Cw_1024/5de87c40-3bf5-440d-b693-d6659017eefd.jpeg",
};

export function getCityImage(city: City): string {
  const normalizedName = String(city.City_Name ?? "").trim().toLowerCase();
  return CITY_IMAGE_OVERRIDES[normalizedName] ?? city.City_Image;
}
