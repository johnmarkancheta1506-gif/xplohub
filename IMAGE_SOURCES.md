# TravelMate destination image sources

This phase adds a per-destination image override system so the UI can use a specific photo for a destination without changing the Supabase schema. The database image remains the fallback.

The initial overrides are Wikimedia Commons files. Reuse terms are recorded here and in `src/data/destinationImages.ts`.

| Destination | Destination ID | Source | Author | License |
|---|---:|---|---|---|
| The Manor at Camp John Hay | 103 | https://commons.wikimedia.org/wiki/File:The_Manor_Camp_John_Hay_In_Baguio_City.jpg | Shella Marie L. Olea | CC BY-SA 4.0 |
| Baguio City Public Market | 105 | https://commons.wikimedia.org/wiki/File:Baguio_City_Public_Market,_Feb_2025.jpg | Ralff Nestor Nacor | CC BY-SA 4.0 |
| BenCab Museum | 106 | https://commons.wikimedia.org/wiki/File:Bencab_Museum_in_Benguet,_Philippines.JPG | Boranzohn | CC0 |
| Mines View Park | 107 | https://commons.wikimedia.org/wiki/File:Mines_View_Park,_Baguio_City_Philippines.jpg | Gramovill | CC BY-SA 4.0 |
| Burnham Park | 108 | https://commons.wikimedia.org/wiki/File:Burnham_Park_Lake_Philippines.jpeg | Hariboneagle927 | Public domain |
| Camp John Hay | 109 | https://commons.wikimedia.org/wiki/File:Camp_John_Hay_Picnic_Area,_Baguio,_Jul_2025_(3).jpg | Ralff Nestor Nacor | CC BY-SA 4.0 |
| Café Leona | 201 | https://commons.wikimedia.org/wiki/File:Leona_Cafe_in_Vigan.jpg | Derk29 | CC0 |

The image-source pass is intentionally being done in batches. For destinations that do not yet have a verified open-license exact image, the existing database image is kept as a fallback rather than silently presenting a generic photo as though it were the place.
