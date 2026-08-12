# Production backend setup

The frontend was originally built with mock/local data. The first production backend slice is now implemented for **Authentication + NCR** using Supabase and Vercel Functions.

## 1. Create a Supabase project

Create a Supabase project and open **SQL Editor**.

Run:

```text
supabase/schema.sql
```

## 2. Create the first application user

Create a user in **Supabase → Authentication → Users**.

Then insert its profile in SQL:

```sql
insert into public.profiles (id, name, role, is_active)
values ('AUTH_USER_UUID', 'System Administrator', 'admin', true);
```

Replace `AUTH_USER_UUID` with the UUID shown by Supabase.

## 3. Vercel environment variables

In the `abdulkarem-board-2026` Vercel project, add these to **Production**:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_*` variable and never put it in browser code.

## 4. Verify the backend

Open:

```text
/api/health
```

It must return:

```json
{
  "ok": true,
  "backend": "supabase"
}
```

## Current production slice

Implemented server-side:
- login using Supabase Auth
- HttpOnly authentication cookie
- authenticated session lookup
- logout
- role/profile lookup
- NCR list/create
- NCR read/update/delete
- server-side validation for department/description
- persistent PostgreSQL/Supabase storage
- server-side role checks
- database constraints and indexes

Not yet migrated from the old mock layer:
- Users management
- Safety Observation Reports
- Documents/files
- Departments/employees
- Forms/posts/reports
- Email/SMTP
- Activity/audit logs
- Vision/cameras/AI

Those will be migrated in subsequent sections; the goal is to remove the remaining mock/local implementations rather than hide them behind fake success messages.
