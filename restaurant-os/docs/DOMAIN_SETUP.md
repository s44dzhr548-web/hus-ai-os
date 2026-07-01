# Domain Setup Guide — Menu OS

## Platform Domain (e.g. `menuos.sa`)

### Step 1: Add domain in Vercel

1. Vercel → Project → **Settings → Domains**
2. Add `menuos.sa` and `www.menuos.sa`
3. Vercel shows required DNS records

### Step 2: Configure DNS (at your registrar)

**Apex domain (`menuos.sa`):**

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |

**WWW subdomain:**

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `cname.vercel-dns.com` |

> Vercel may show different values — use the records Vercel provides.

### Step 3: Update environment variables

After domain is verified and SSL is active:

```
NEXTAUTH_URL=https://menuos.sa
NEXT_PUBLIC_APP_URL=https://menuos.sa
```

Redeploy after changing env vars.

### Step 4: Redirect www → apex (optional)

Vercel auto-configures www redirect when both domains are added.

---

## Restaurant Custom Domains (White-Label)

Restaurants can set `customDomain` in `/dashboard/settings`.

### DNS for restaurant

| Type | Name | Value |
|------|------|-------|
| CNAME | `menu` | `cname.vercel-dns.com` |

Or point to your platform apex if using path-based routing.

### Vercel configuration

1. Add restaurant domain in Vercel → Domains (or use Vercel for Platforms)
2. Map domain to same Menu OS project
3. Middleware reads `Host` header and resolves restaurant by `customDomain` field

> Custom domain routing requires the restaurant `customDomain` field to match exactly.

---

## CDN for Media (`cdn.menuos.sa`)

If using Cloudflare R2:

| Type | Name | Value |
|------|------|-------|
| CNAME | `cdn` | R2 public bucket custom domain |

Set in env:
```
STORAGE_PUBLIC_URL=https://cdn.menuos.sa
S3_PUBLIC_URL=https://cdn.menuos.sa
```

---

## QR Code URLs

QR codes embed `NEXT_PUBLIC_APP_URL`. After domain change:

1. Update `NEXT_PUBLIC_APP_URL` in Vercel
2. Redeploy
3. Re-generate QR codes from `/dashboard/tables` (bulk export)

Existing QR codes with old domain will break until regenerated.

---

## SSL / HTTPS

Vercel provisions Let's Encrypt certificates automatically. Allow up to 48 hours for DNS propagation.

Verify: `https://menuos.sa` shows padlock, no mixed-content warnings.

---

## Email (optional)

For transactional email (password reset, receipts), add:

| Type | Name | Value |
|------|------|-------|
| TXT | `@` | SPF record from email provider |
| CNAME | `resend._domainkey` | DKIM from provider |

Not required for MVP launch.
