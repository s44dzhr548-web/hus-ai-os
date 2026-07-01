# Restaurant OS — API Specification (Planned)

**Status:** Not implemented. This document defines the intended REST surface for Phase 2.

All endpoints are prefixed with `/api/v1`. Authentication via session or Bearer token. Every request requires organization context; location-scoped routes require `locationId` (header `X-Location-Id` or query param).

## Conventions

- **JSON** request/response bodies
- **Errors:** `{ "error": { "code": "...", "message": "..." } }`
- **Pagination:** `?page=1&limit=20` → `{ "data": [], "meta": { "page", "limit", "total" } }`
- **IDs:** string CUIDs

## Organizations & Locations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/me` | Current org from auth |
| GET | `/locations` | List locations for org |
| GET | `/locations/:id` | Location detail |

## Staff

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff` | List staff (manager+) |
| POST | `/staff` | Create staff user |
| PATCH | `/staff/:id` | Update role, locations, active |

## Menu

| Method | Path | Description |
|--------|------|-------------|
| GET | `/menu` | Full menu for location (categories → items → modifiers) |
| POST | `/menu/categories` | Create category |
| POST | `/menu/items` | Create item |
| PATCH | `/menu/items/:id` | Update item |
| POST | `/menu/items/:id/availability` | Set location availability |

## Tables

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tables` | Floor plan for location |
| PATCH | `/tables/:id` | Update status (e.g. OCCUPIED) |

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List with filters: `status`, `tableId`, `date` |
| POST | `/orders` | Create order |
| GET | `/orders/:id` | Order detail with items |
| PATCH | `/orders/:id` | Update status |
| POST | `/orders/:id/items` | Add line item |
| PATCH | `/orders/:id/items/:itemId` | Update item status / quantity |
| GET | `/orders/kitchen-queue` | Active items for KDS |

### Create Order Example

```json
POST /api/v1/orders
{
  "locationId": "clx...",
  "type": "DINE_IN",
  "tableId": "clx...",
  "notes": "Birthday table",
  "items": [
    {
      "menuItemId": "clx...",
      "variantId": "clx...",
      "quantity": 2,
      "modifierOptionIds": ["clx...", "clx..."]
    }
  ]
}
```

## Reservations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reservations` | List by date range |
| POST | `/reservations` | Create booking |
| PATCH | `/reservations/:id` | Update status / assign table |

## Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | Stock levels for location |
| POST | `/inventory/adjustments` | Record stock change |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orders/:id/payments` | Record payment |
| POST | `/payments/:id/refund` | Refund (manager+) |

## Webhooks (future)

- `order.status_changed`
- `table.status_changed`
- `reservation.created`
