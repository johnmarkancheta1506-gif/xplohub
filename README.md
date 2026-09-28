# XploHub

XploHub is a travel and tourism web application developed as a database-driven application project.

The application allows users to explore destinations, view tourism-related establishments and attractions, create travel plans, search destinations, and write reviews.

The frontend is connected to a live Supabase database, allowing application data to persist between sessions.

---

## Project Overview

XploHub provides travelers with information about selected destinations in the Philippines and Japan.

### Current Destinations

#### Philippines
- Baguio City
- Vigan City
- El Nido

#### Japan
- Tokyo
- Kyoto

Each city contains the following categories:

- Restaurants
- Accommodations
- Convenience Stores
- Landmarks
- Tourist Destinations

---

## Main Features

### Authentication
- User registration
- User login
- Email confirmation
- Persistent login sessions
- Logout
- Automatic creation of user records in `USER_INFO`

### Destination Browsing
- Browse countries
- Browse cities
- Browse destinations by category
- View destination information

### Search History
- Records searches made by authenticated users
- Stores selected country and city
- Stores selected category
- Stores search keywords
- Search history persists in Supabase
- Users can view their own search history

### Travel Plans
Users can create and manage travel plans.

Current functionality:

- Create travel plan
- View saved travel plans
- Edit travel plan
- Delete travel plan
- Store travel dates
- Store number of days
- Store budget
- Store notes
- Store travel status

Travel plans are associated with the authenticated user.

### Reviews
Users can:

- Create reviews
- View reviews
- Edit their own reviews
- Delete their own reviews
- Submit ratings and feedback

Reviews are stored in the main `REVIEW` table and the corresponding category-specific review table.

Reviews can also be viewed by users who are not logged in, while review management requires authentication.

---

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend / Database
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Development
- Visual Studio Code
- Git
- GitHub
- Vercel

---

## Database

The application uses a live Supabase PostgreSQL database.

Major database tables include:

- `COUNTRY`
- `CITY`
- `CATEGORY`
- `DESTINATION`
- `RESTAURANT`
- `ACCOMMODATIONS`
- `CONVENIENCE_STORES`
- `LANDMARK`
- `TOURIST_DESTINATION`
- `REVIEW`
- `RESTAURANT_REVIEW`
- `ACCOMMODATIONS_REVIEW`
- `CONVENIENCE_STORE_REVIEW`
- `LANDMARK_REVIEW`
- `TOURIST_DESTINATION_REVIEW`
- `SEARCH_HISTORY`
- `TRAVEL_PLAN`
- `USER_INFO`
- `BUSINESS_PARTNER`

The frontend uses the Supabase client to communicate with the database.

---

## Security

The project uses Supabase Row Level Security (RLS) for user-specific data.

Examples include:

- Users can access their own search history.
- Users can create reviews while authenticated.
- Users can edit and delete their own reviews.
- Users can manage their own travel plans.

Authentication is handled through Supabase Auth.

Environment variables are stored locally and are **not committed to GitHub**.

The `.env` file is intentionally excluded from the repository through `.gitignore`.

---

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/johnmarkancheta1506-gif/xplohub.git
