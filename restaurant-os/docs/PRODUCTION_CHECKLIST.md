# Production Checklist — Menu OS

## Security

- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Never commit `.env` to git
- [ ] Restaurant payment secret keys stored only in database (masked in API responses)
- [ ] HTTPS enabled on production domain

## SaaS

- [ ] Registration flow tested (`/register`)
- [ ] Subscription limits enforced (branches, tables, items, video)
- [ ] Trial expiry handling configured
- [ ] Billing page shows usage vs limits
- [ ] Platform admin at `/dashboard/platform` (admin@menuos.sa)
- [ ] FAQ (`/faq`) and contact (`/contact`) pages live

## Payments

- [ ] Restaurant owner entered Moyasar/Tap keys in `/dashboard/payments`
- [ ] Payment test/live mode toggle configured
- [ ] WhatsApp number set for order summaries
- [ ] Verify payments go to restaurant account, not platform

## Menu & QR

- [ ] Categories and items created
- [ ] QR codes use slug URLs (`/r/[slug]/table/[code]`)
- [ ] Waiter call buttons work from customer menu
- [ ] Menu options/add-ons configured at `/dashboard/menu/options`
- [ ] Bulk QR export prints correctly (`/api/qr/print`)
- [ ] Customer menu loads on mobile (iPhone Safari)

## Orders

- [ ] Checkout creates order after payment
- [ ] Kitchen dashboard updates order status
- [ ] Customer order status page reflects changes

## Analytics

- [ ] Reports show sales, orders, top items, views

## Demo Data

```bash
npm run db:seed
```

Login: `admin@menuos.sa` / `admin123456`
