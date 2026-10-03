import type { CategoryType } from "../types";

/**
 * Visual image pool for destination cards/details.
 * A few venue-specific images are sourced from current web results; the remaining
 * pool uses travel imagery already present in the project. The resolver keeps
 * repeated placeholder images from being reused across every item in a category.
 */

const restaurantImages = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=900&h=600&fit=crop&auto=format",
  "https://blog.markkulab.net/content/markku/posts/visit-vigan-heritage-town/images/coffee-shop.jpg?w=1200",
  "https://seoulfoodenvy.weebly.com/uploads/5/9/6/7/59675103/7235031_orig.jpg",
  "https://megapx-assets.dcard.tw/images/90285e87-c3fa-4e59-9999-cb3ffa77ccbc/1280.jpeg",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=900&h=600&fit=crop&auto=format",
];

const accommodationImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&h=600&fit=crop&auto=format",
  "https://gttp.images.tshiftcdn.com/380201/x/0/.jpg?crop=1.91%3A1&fit=crop&width=1200",
  "https://stat.ameba.jp/user_images/20210703/17/kokutano/4b/6a/j/o1080081014966730965.jpg",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&h=600&fit=crop&auto=format",
];

const convenienceImages = [
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1601598851547-4302969d3f9a?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&h=600&fit=crop&auto=format",
];

const landmarkImages = [
  "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=900&h=600&fit=crop&auto=format",
  "https://news.annisatravel.com/wp-content/uploads/2024/07/Fushimi-Inari-1024x575.webp",
  "https://wanderon-images.gumlet.io/blogs/new/2024/11/senso-ji-temple-main-hall.jpg",
  "https://media.triple.guide/triple-cms/c_limit%2Cf_auto%2Ch_1024%2Cw_1024/5de87c40-3bf5-440d-b693-d6659017eefd.jpeg",
  "https://ppap.kinto-jp.com/spots_images/10-images/7.jpg",
  "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&h=600&fit=crop&auto=format",
  "https://getaway.ph/storage/2023/02/Baguio-Museum-1-1024x768.jpg",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&h=600&fit=crop&auto=format",
];

const touristImages = [
  "https://images.unsplash.com/photo-1609779340167-207589f3f94f?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=900&h=600&fit=crop&auto=format",
  "https://i.pinimg.com/originals/64/45/8b/64458b4ec3493cab84f8a908df5d602c.jpg",
  "https://mediaim.expedia.com/destination/2/6f024abcd72a361f2ef55a471e0d51a6.jpg",
  "https://res-3.cloudinary.com/jnto/image/upload/w_1000%2Ch_667%2Cc_fill%2Cf_auto%2Cfl_lossy%2Cq_auto/v1648006915/kyoto/H_00480_001",
  "https://images.unsplash.com/photo-1654270851174-132b074a6454?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1711609110590-5ad5c4599e56?w=900&h=600&fit=crop&auto=format",
];

const poolByCategory: Record<CategoryType, string[]> = {
  Restaurant: restaurantImages,
  Accommodation: accommodationImages,
  "Convenience Store": convenienceImages,
  Landmark: landmarkImages,
  "Tourist Destination": touristImages,
};

const exactImages: Record<string, string> = {
  // Baguio restaurant-specific images. These are exact venue photos rather than
  // generic restaurant-category imagery. Source links are documented in IMAGE_SOURCES.md.
  "Hill Station": "https://i0.wp.com/c3.staticflickr.com/8/7370/27581275482_8f318e9a45_b.jpg?quality=89&resize=1024%2C683&ssl=1",
  "Oh My Gulay!": "https://lh6.ggpht.com/_swDNJlku5mI/S1sGvz1T4xI/AAAAAAAAANs/nzJS3PR4M2c/20090208BAGUIOD8001063.jpg?imgmax=800",
  "Café by the Ruins": "https://ik.imagekit.io/tvlk/blog/2018/06/ruins21-750x400.png?tr=q-70%2Cc-at_max%2Cw-1000%2Ch-600",
  "Cafe by the Ruins": "https://ik.imagekit.io/tvlk/blog/2018/06/ruins21-750x400.png?tr=q-70%2Cc-at_max%2Cw-1000%2Ch-600",
  "Forest House Baguio": "https://cdn.tatlerasia.com/asiatatler/i/ph/2020/02/13153244-forest-house-bistro_cover_2000x1333.jpg",
  "Azalea Residences": "https://24seventoanywhere.files.wordpress.com/2015/10/one-bedroom-suite.jpg?w=1200",
  "The Manor at Camp John Hay": "https://gttp.images.tshiftcdn.com/380201/x/0/.jpg?crop=1.91%3A1&fit=crop&width=1200",
  "Forest Lodge at Camp John Hay": "https://1.bp.blogspot.com/-cvrU25HtNBw/VM4NxXzxwDI/AAAAAAAANhA/43wZWhx0nyA/s1600/Forest%2BLodge%2C%2BCamp%2BJohn%2BHay%2BBaguio%2B023%2Bvia%2Btinavilla.com.JPG",
  "Baguio Public Market": "https://i0.wp.com/mymonol.com/wp-content/uploads/2023/07/public-market.png?ssl=1",
  "BenCab Museum": "https://cdn.prod.website-files.com/66933220a06a8a1f103c184b/6816108a9a0b76e6feaea609_2021-08-13.webp",
  "Hotel Veniz Burnham": "https://res.klook.com/klook-hotel/image/upload/w_750%2Cc_fill%2Cq_85/travelapi/28000000/27850000/27849100/27849074/b7d0c2da_z.jpg",
  "SM City Baguio Supermarket": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/SM_City_Baguio_%28Pictured_02-25-2023%29.jpg/1280px-SM_City_Baguio_%28Pictured_02-25-2023%29.jpg",
  "The Mansion": "https://images.gmanews.tv/webpics/2024/05/IMG_4108_2024_05_13_13_25_23.jpg",
  "Strawberry Farm La Trinidad": "https://baguioheraldexpressonline.com/wp-content/uploads/2017/10/12312017-sweet-charlie-road-strawberry-farm.jpg",
  "Wright Park & The Mansion": "https://wanderingsoulscamper.files.wordpress.com/2015/09/img_6411-1.jpg",
  "Cafe Leona": "https://blog.markkulab.net/content/markku/posts/visit-vigan-heritage-town/images/coffee-shop.jpg?w=1200",
  "Café Leona": "https://1.bp.blogspot.com/-QjqBW7CoXus/U50h2vwMGZI/AAAAAAAAFSE/8Diy3kik0zU/s1600/CL1.jpg",
  "Altrove Restaurant": "https://www.tripatrek.com/wp-content/uploads/2017/04/Trattoria-Altrove-Restaurant-El-Nido.jpg",
  "Trattoria Altrove": "https://www.tripatrek.com/wp-content/uploads/2017/04/Trattoria-Altrove-Restaurant-El-Nido.jpg",
  "Big Lagoon": "https://i.pinimg.com/originals/64/45/8b/64458b4ec3493cab84f8a908df5d602c.jpg",
  "Nishiki Market": "https://res-3.cloudinary.com/jnto/image/upload/w_1000%2Ch_667%2Cc_fill%2Cf_auto%2Cfl_lossy%2Cq_auto/v1648006915/kyoto/H_00480_001",
  "Kikunoi Honten": "https://d3ogb7c2z54v1k.cloudfront.net/system/App/BlogBody/photos/000/295/552/original/71a2a12b41ae943f85f8cbfa049ec7dd.jpeg",
  "Tawaraya Ryokan": "https://stat.ameba.jp/user_images/20210703/17/kokutano/4b/6a/j/o1080081014966730965.jpg",
  "Arashiyama Bamboo Grove": "https://mediaim.expedia.com/destination/2/6f024abcd72a361f2ef55a471e0d51a6.jpg",
  "Fushimi Inari Shrine": "https://news.annisatravel.com/wp-content/uploads/2024/07/Fushimi-Inari-1024x575.webp",
  "Ichiran Ramen": "https://megapx-assets.dcard.tw/images/90285e87-c3fa-4e59-9999-cb3ffa77ccbc/1280.jpeg",
  "Senso-ji Temple": "https://wanderon-images.gumlet.io/blogs/new/2024/11/senso-ji-temple-main-hall.jpg",
  "Shibuya Scramble Crossing": "https://media.triple.guide/triple-cms/c_limit%2Cf_auto%2Ch_1024%2Cw_1024/5de87c40-3bf5-440d-b693-d6659017eefd.jpeg",
  "Tokyo Skytree": "https://ppap.kinto-jp.com/spots_images/10-images/7.jpg",
  "BenCab Museum": "https://getaway.ph/storage/2023/02/Baguio-Museum-1-1024x768.jpg",
  "Baguio Public Market": "https://i0.wp.com/shellwanders.com/wp-content/uploads/2023/05/Baguio-Public-Market.jpg?fit=1024%2C683&ssl=1",
  "Baguio Botanical Garden": "https://commons.wikimedia.org/wiki/Special:FilePath/BAGUIO%20BOTANICAL%20GARDEN.jpg?width=1200",
  "Burnham Park": "https://commons.wikimedia.org/wiki/Special:FilePath/Burnham%20Park%20Lake%20Philippines.jpeg?width=1200",
  "Mines View Park": "https://commons.wikimedia.org/wiki/Special:FilePath/Mines%20View%20Park%2C%20Baguio%20City%2C%20March%202023.jpg?width=1200",
  "Calle Crisologo": "https://angelynloves.wordpress.com/wp-content/uploads/2017/01/img_48021.jpg?w=768",
  "Burnay Pottery District": "https://i.pinimg.com/736x/b0/94/e7/b094e7071210fec8155cb888e8cc8d18.jpg",
};


function isKnownGenericImage(url: string) {
  return [
    "photo-1517248135467-4c7edcad34c4",
    "photo-1414235077428-338989a2e8c0",
    "photo-1424847651672-bf20a4b0982b",
    "photo-1566073771259-6a8506099945",
    "photo-1582719478250-c89cae4dc85b",
    "photo-1488459716781-31db52582fe9",
    "photo-1601598851547-4302969d3f9a",
    "photo-1556742049-0cfed4f6a45d",
    "photo-1604719312566-8912e9227c6a",
    "photo-1554907984-15263bfd63bd",
    "photo-1501854140801-50d01698950b",
    "photo-1609779340167-207589f3f94f",
    "photo-1503079230625-8a7c589a9007",
  ].some((token) => url.includes(token));
}

export function getPlaceImage(
  name: string,
  destinationId: number,
  categoryType: CategoryType,
  fallback?: string | null,
): string {
  const exact = exactImages[name.trim()];
  if (exact) return exact;

  // Prefer a database-provided image over a generic category pool. The pool is
  // only a last resort for destinations that have neither a sourced exact image
  // nor a usable image in Supabase.
  if (fallback && !isKnownGenericImage(fallback)) return fallback;

  const pool = poolByCategory[categoryType];
  if (pool?.length) {
    return pool[Math.abs(destinationId) % pool.length];
  }

  return fallback || "https://images.unsplash.com/photo-1503079230625-8a7c589a9007?w=900&h=600&fit=crop&auto=format";
}
