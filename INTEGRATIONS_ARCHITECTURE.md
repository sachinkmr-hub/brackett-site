# Integration Architecture

## The architecture in one sentence
Every integration (Stripe, Slack, GitHub, whatever) follows the same shape: store an encrypted token per user per provider, expose a "Connect" button that starts OAuth (or accepts a restricted key), then a sync job that pulls stats into your own tables so your UI never calls third-party APIs live.

## 1. Database schema (Supabase)
```sql
create table integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,              -- Clerk user id
  provider text not null,             -- 'stripe' | 'github' | 'slack'
  access_token text not null,         -- encrypted via pgsodium/vault
  refresh_token text,
  scope text,
  connected_at timestamptz default now(),
  status text default 'active',
  unique (user_id, provider)
);

create table integration_stats (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references integrations(id) on delete cascade,
  metric_key text not null,           -- 'mrr' | 'churn' | 'open_prs'
  metric_value jsonb not null,
  synced_at timestamptz default now()
);

alter table integrations enable row level security;
create policy "user reads own integrations" on integrations
  for select using (auth.jwt() ->> 'sub' = user_id);
```
*Use Supabase Vault (vault.create_secret) to encrypt access_token at rest instead of storing it plaintext — never skip this, it's the one thing that gets startups sued.*

## 2. Connect flow — restricted key providers (Stripe, ship this first)
```typescript
// app/api/integrations/stripe/connect/route.ts
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { restrictedKey } = await req.json();

  // validate key actually works before storing
  const verify = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${restrictedKey}` },
  });
  if (!verify.ok) return Response.json({ error: "Invalid key" }, { status: 400 });

  const supabase = createClient();
  await supabase.from("integrations").upsert({
    user_id: userId,
    provider: "stripe",
    access_token: restrictedKey, // encrypt via vault trigger, not raw
    status: "active",
  });

  await triggerSync(userId, "stripe");
  return Response.json({ connected: true });
}
```

## 3. Connect flow — OAuth providers (GitHub, Slack)
```typescript
// app/api/integrations/[provider]/authorize/route.ts
const OAUTH_CONFIG = {
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    clientId: process.env.GITHUB_CLIENT_ID,
    scope: "repo read:org",
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    clientId: process.env.SLACK_CLIENT_ID,
    scope: "channels:read,chat:write",
  },
};

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const config = OAUTH_CONFIG[params.provider];
  const state = crypto.randomUUID(); // store in redis/db to prevent CSRF
  const redirectUri = `${process.env.APP_URL}/api/integrations/${params.provider}/callback`;

  const url = `${config.authUrl}?client_id=${config.clientId}&scope=${config.scope}&redirect_uri=${redirectUri}&state=${state}`;
  return Response.redirect(url);
}
```
```typescript
// app/api/integrations/[provider]/callback/route.ts
export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const { userId } = await auth();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const tokenRes = await fetch(TOKEN_URL[params.provider], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env[`${params.provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${params.provider.toUpperCase()}_CLIENT_SECRET`],
      code,
    }),
  });
  const { access_token, refresh_token } = await tokenRes.json();

  const supabase = createClient();
  await supabase.from("integrations").upsert({
    user_id: userId,
    provider: params.provider,
    access_token,
    refresh_token,
    status: "active",
  });

  return Response.redirect(`${process.env.APP_URL}/dashboard/integrations?connected=${params.provider}`);
}
```

## 4. Sync job — pull stats, don't call live on page load
```typescript
// lib/sync/stripe.ts
export async function syncStripeStats(integrationId: string, token: string) {
  const [charges, subs] = await Promise.all([
    fetch("https://api.stripe.com/v1/charges?limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  ]);

  const mrr = subs.data.reduce((sum: number, s: any) =>
    sum + (s.items.data[0]?.price.unit_amount ?? 0) / 100, 0);

  const supabase = createClient();
  await supabase.from("integration_stats").insert([
    { integration_id: integrationId, metric_key: "mrr", metric_value: { value: mrr, currency: "usd" } },
    { integration_id: integrationId, metric_key: "active_subs", metric_value: { count: subs.data.length } },
  ]);
}
```
*Run this via a Supabase Edge Function on a cron (every 15-60 min), not on every page load — that's what makes your dashboard feel instant instead of laggy.*

## 5. Frontend — the actual "Connect" UX
```tsx
// components/IntegrationCard.tsx
export function IntegrationCard({ provider, connected, onConnect }: Props) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <img src={`/logos/${provider}.svg`} className="w-8 h-8" />
        <span className="font-medium capitalize">{provider}</span>
      </div>
      {connected ? (
        <span className="text-green-600 text-sm">Connected</span>
      ) : provider === "stripe" ? (
        <StripeKeyModal onSubmit={onConnect} />
      ) : (
        <a href={`/api/integrations/${provider}/authorize`}>
          <Button>Connect</Button>
        </a>
      )}
    </div>
  );
}
```
