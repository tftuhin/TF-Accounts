# Supabase Setup Guide

## 1. Create Tables in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project → SQL Editor
2. Create a new query and paste the contents of `supabase-schema.sql`
3. Run the query to create all tables and enums

## 2. Set Up Authentication

Supabase Auth is already enabled by default. You now have:
- User authentication via Supabase Auth
- `profiles` table linked to `auth.users`

## 3. Environment Variables

The `.env.local` file already contains:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Update API Routes

Replace Prisma calls with Supabase client calls:

### Old (Prisma):
```ts
import { prisma } from "@/lib/prisma";

const user = await prisma.user.findUnique({ where: { email } });
```

### New (Supabase):
```ts
import { supabaseServer } from "@/lib/supabase-server";

const { data } = await supabaseServer
  .from("profiles")
  .select("*")
  .eq("email", email)
  .single();
```

## 5. Update Components

For client-side queries:

```ts
import { supabase } from "@/lib/supabase-client";

const { data, error } = await supabase
  .from("entities")
  .select("*");
```

## 6. Remove Prisma

Once migration is complete, you can remove Prisma:

```bash
npm uninstall @prisma/client prisma
rm -rf prisma/
```

## 7. Redeploy

After updating your code:

```bash
git add .
git commit -m "Migrate from Prisma to Supabase"
git push
vercel deploy --prod
```

## Row-Level Security (RLS)

Supabase uses Row-Level Security for data protection. Currently, basic policies are set for the `profiles` table. You may want to add RLS policies for other tables:

```sql
-- Example: Allow users to only see entities they have access to
CREATE POLICY "Users can view their accessible entities" ON entities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access
      WHERE user_id = auth.uid() AND entity_id = entities.id
    )
  );
```

## Storage Setup (Optional)

For file uploads (evidence files, receipts):

1. Go to Supabase Dashboard → Storage
2. Create buckets: `receipts`, `bank-statements`, etc.
3. Set public access policies as needed
4. Use Supabase Storage client to upload files

```ts
const { data } = await supabase.storage
  .from('receipts')
  .upload(`${entityId}/${fileName}`, file);
```
