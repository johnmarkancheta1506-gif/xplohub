import type { Destination } from "../types";

/**
 * Destination image overrides.
 *
 * The main database image remains the fallback. This lets us replace repeated
 * or generic database images one destination at a time without changing the
 * database schema. Prefer openly licensed sources for assets we ship directly.
 */
const commonsFile = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;

export const DESTINATION_IMAGE_OVERRIDES: Record<number, string> = {
  103: commonsFile("The Manor Camp John Hay In Baguio City.jpg"),
  105: commonsFile("Baguio City Public Market, Feb 2025.jpg"),
  106: commonsFile("Bencab Museum in Benguet, Philippines.JPG"),
  107: commonsFile("Mines View Park, Baguio City Philippines.jpg"),
  108: commonsFile("Burnham Park Lake Philippines.jpeg"),
  109: commonsFile("Camp John Hay Picnic Area, Baguio, Jul 2025 (3).jpg"),
  201: commonsFile("Leona Cafe in Vigan.jpg"),
};

export const DESTINATION_IMAGE_CREDITS: Record<number, {
  author: string;
  license: string;
  sourceUrl: string;
}> = {
  103: {
    author: "Shella Marie L. Olea",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Manor_Camp_John_Hay_In_Baguio_City.jpg",
  },
  105: {
    author: "Ralff Nestor Nacor",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Baguio_City_Public_Market,_Feb_2025.jpg",
  },
  106: {
    author: "Boranzohn",
    license: "CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bencab_Museum_in_Benguet,_Philippines.JPG",
  },
  107: {
    author: "Gramovill",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mines_View_Park,_Baguio_City_Philippines.jpg",
  },
  108: {
    author: "Hariboneagle927",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Burnham_Park_Lake_Philippines.jpeg",
  },
  109: {
    author: "Ralff Nestor Nacor",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Camp_John_Hay_Picnic_Area,_Baguio,_Jul_2025_(3).jpg",
  },
  201: {
    author: "Derk29",
    license: "CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Leona_Cafe_in_Vigan.jpg",
  },
};

export function getDestinationImage(destination: Destination): string {
  return DESTINATION_IMAGE_OVERRIDES[destination.Destination_ID] ?? destination.Destination_Image;
}
