# Backup & Recovery Log

## Mission 4 — Backup and Recovery Verification

### 1. Objective

Verify that the TravelMate database can be backed up and successfully restored to a separate Supabase recovery project.

The recovery test was performed against a separate Supabase project named **TravelMate-Recovery-Test**.

The purpose was to confirm that the database structure and application data could be recovered successfully.

---

## 2. Backup Files

The database backup was exported into:

```text
database-backup/
├── roles.sql
├── schema.sql
└── data.sql
```

- `roles.sql` — database roles and role-related configuration
- `schema.sql` — database structure, tables, functions, policies, constraints, grants, and related schema objects
- `data.sql` — database records

The `data.sql` backup contains COPY sections for the application's public tables, including `CATEGORY`, `DESTINATION`, `ACCOMMODATIONS`, `USER_INFO`, `REVIEW`, `BUSINESS_PARTNER`, `COUNTRY`, `CITY`, `CONVENIENCE_STORES`, `LANDMARK`, `RESTAURANT`, `SEARCH_HISTORY`, `TOURIST_DESTINATION`, and `TRAVEL_PLAN`.

---

## 3. Recovery Environment

A separate Supabase project was created for recovery testing:

**TravelMate-Recovery-Test**

The recovery database was accessed using the Supabase Session Pooler connection.

Because `psql` was not installed directly on the Windows machine, PostgreSQL's official Docker image was used to run `psql`.

Verified PostgreSQL client:

```text
psql (PostgreSQL) 17.11
```

---

## 4. Recovery Procedure

### Step 1 — Connection Test

The recovery database connection was tested using:

```powershell
npx supabase migration list --db-url "RECOVERY_CONNECTION_STRING"
```

The connection was successful.

### Step 2 — Roles Restore

The roles backup was restored using:

```powershell
Get-Content .\database-backup\roles.sql -Raw |
docker run --rm -i postgres:17 psql "RECOVERY_CONNECTION_STRING"
```

Some Supabase-managed role/parameter errors were returned. These involved restrictions on the `supabase_admin` role and the `log_min_messages` parameter. They did not prevent restoration of the application schema and data.

### Step 3 — Schema Restore

The schema was restored using:

```powershell
Get-Content .\database-backup\schema.sql -Raw |
docker run --rm -i postgres:17 psql "RECOVERY_CONNECTION_STRING"
```

The schema restore completed successfully, including tables, functions, policies, constraints, grants, and related schema objects.

### Step 4 — Table Verification

The recovery database was checked using:

```powershell
docker run --rm postgres:17 psql "RECOVERY_CONNECTION_STRING" -c "\dt public.*"
```

All 20 expected public tables were present.

**Result: PASS**

### Step 5 — Data Restore

The application data was restored using:

```powershell
Get-Content .\database-backup\data.sql -Raw |
docker run --rm -i postgres:17 psql "RECOVERY_CONNECTION_STRING"
```

The restore completed with successful `COPY` and sequence (`setval`) operations.

**Result: PASS**

---

## 5. Recovered Record Counts

### Main Application Tables

| Table | Recovered Records |
|---|---:|
| DESTINATION | 107 |
| CITY | 6 |
| COUNTRY | 2 |
| RESTAURANT | 30 |
| ACCOMMODATIONS | 20 |
| CONVENIENCE_STORES | 25 |
| LANDMARK | 22 |
| TOURIST_DESTINATION | 25 |
| REVIEW | 12 |
| TRAVEL_PLAN | 5 |
| USER_INFO | 6 |
| BUSINESS_PARTNER | 1 |

### Review and Search Tables

| Table | Recovered Records |
|---|---:|
| ACCOMMODATIONS_REVIEW | 1 |
| CONVENIENCE_STORE_REVIEW | 1 |
| LANDMARK_REVIEW | 0 |
| RESTAURANT_REVIEW | 3 |
| TOURIST_DESTINATION_REVIEW | 7 |
| SEARCH_HISTORY | 67 |

`LANDMARK_REVIEW` contained zero records in the recovered database. This was not treated as a restore failure because no landmark review records were present in the backup data.

---

## 6. Verification Result

| Verification Item | Result |
|---|---|
| Recovery database connection | PASS |
| Roles restore attempted | PASS* |
| Schema restoration | PASS |
| 20 public tables restored | PASS |
| Application data restored | PASS |
| Main application record counts verified | PASS |
| Review/search-history counts verified | PASS |
| Recovery database readable | PASS |

\* Some Supabase-managed role restrictions produced errors during the roles restore. These did not prevent restoration of the application schema or data.

---

## 7. Final Result

**BACKUP & RECOVERY: COMPLETE**

The TravelMate database backup was successfully restored into a separate Supabase recovery project.

The recovery test verified that:

1. The database connection worked.
2. The application schema was restored.
3. All 20 expected public tables were present.
4. Application data was successfully restored.
5. Recovered record counts were successfully queried and verified.

This provides evidence that the TravelMate database has a tested recovery procedure rather than relying only on an untested backup.

---

## 8. Evidence

Evidence available for the Mission 4 defense includes:

- Successful connection to the Recovery-Test Supabase database.
- Successful schema restoration output.
- Successful data restoration output.
- `\dt public.*` output showing all 20 public tables.
- Record-count verification output for the recovered application tables.
- Backup files stored in:

```text
database-backup/
├── roles.sql
├── schema.sql
└── data.sql
```

---

## 9. Date

Recovery test completed: **October 2026**
