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

## City card image overrides

City cards now reuse recognizable place imagery already used by destination cards:

- Baguio City — Baguio Botanical Garden (Wikimedia Commons)
- Vigan — Calle Crisologo image used by the destination visual mapping
- El Nido — Big Lagoon image used by the destination visual mapping
- Kyoto — Arashiyama Bamboo Grove image used by the destination visual mapping
- Tokyo — Shibuya Scramble Crossing image used by the destination visual mapping

The frontend keeps the original `City_Image` as a fallback.


## Additional venue image sources used by destination cards

The following Baguio restaurant cards now use venue-specific photos instead of category-pool images. These source pages were checked during the image pass; their reuse/license terms are not asserted here, so they should be replaced with explicitly licensed/open-license assets if the project is published commercially.

| Destination | Source |
|---|---|
| Hill Station | https://awesome.blog/2016/06/hill-station-2016.html |
| Oh My Gulay! | https://www.lakadpilipinas.com/2010/01/baguio-oh-my-gulay.html |
| Café by the Ruins | https://www.traveloka.com/en-ph/explore/tips/news-baguios-cafe-by-the-ruins-reopened/63827 |
| Forest House Baguio | https://www.tatlerasia.com/dining/forest-house-bistro |
