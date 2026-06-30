# Restaurant OS API

## Health
`GET /api/health` — service status probe

## Auth
Handled by Supabase Auth. Routes: `/login`, `/signup`, `/auth/callback`

## Restaurants
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/restaurants` | ✅ | List owner restaurants |
| POST | `/api/restaurants` | ✅ | Create restaurant + first location |

## Menus
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/menus?restaurantId=` | ✅ | List categories and items |
| POST | `/api/menus` | ✅ | Create category or item (`type: category\|item`) |

## Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders?restaurantId=` | ✅ | List orders |
| POST | `/api/orders` | ✅ | Create order with items |
| PATCH | `/api/orders/[id]` | ✅ | Update order status |

## Public
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/menu/[slug]` | ❌ | Public menu JSON |
| GET | `/menu/[slug]` | ❌ | Public menu page |

## Order Status Flow
`pending → confirmed → preparing → ready → completed`

## Database
Schema: `supabase/migrations/202606300001_initial_schema.sql`
