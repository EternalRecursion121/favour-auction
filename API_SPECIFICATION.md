# Favour Auction Web App API Specification

This document outlines the API endpoints for the Favour Auction web application, their expected inputs, outputs, and behaviors.

## Table of Contents
- [Authentication & User Management](#authentication--user-management)
- [Item Management](#item-management)
- [Auction Process](#auction-process)
- [Admin Controls](#admin-controls)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)

## Authentication & User Management

### `POST /api/users`
Creates a new user or retrieves existing user.

**Request:**
```json
{
  "name": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "name": "string",
  "balance": "number",
  "itemsSold": "number",
  "itemsBought": "number"
}
```

**Notes:**
- If user with this name already exists, returns existing user data
- Stores user name in localStorage for persistence
- Every user starts with 100 favour points

## Item Management

### `GET /api/items`
Retrieves all auction items.

**Response:**
```json
[
  {
    "id": "number",
    "title": "string",
    "description": "string",
    "seller": {
      "id": "number",
      "name": "string"
    },
    "sold": "boolean",
    "createdAt": "string (ISO date)"
  }
]
```

### `POST /api/items`
Creates a new auction item.

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "sellerId": "number"
}
```

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "seller": {
    "id": "number",
    "name": "string"
  },
  "sold": "boolean",
  "createdAt": "string (ISO date)"
}
```

**Notes:**
- Returns 403 if new items are not allowed based on current auction configuration

### `GET /api/items/:id`
Retrieves details for a specific item.

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "seller": {
    "id": "number",
    "name": "string"
  },
  "sold": "boolean",
  "createdAt": "string (ISO date)",
  "auctionHistory": [
    {
      "userId": "number",
      "userName": "string",
      "amount": "number",
      "timestamp": "string (ISO date)"
    }
  ]
}
```

## Auction Process

### `GET /api/auctions/current`
Retrieves information about the currently active auction.

**Response:**
```json
{
  "active": "boolean",
  "item": {
    "id": "number",
    "title": "string",
    "description": "string",
    "seller": {
      "id": "number",
      "name": "string"
    }
  },
  "auctionType": "string (english|dutch|firstprice|vikrey|chinese|penny)",
  "startTime": "string (ISO date)",
  "endTime": "string (ISO date|null)",
  "currentPrice": "number",
  "winningBidder": {
    "id": "number",
    "name": "string"
  },
  "bids": [
    {
      "userId": "number",
      "userName": "string",
      "amount": "number",
      "timestamp": "string (ISO date)"
    }
  ],
  "timeRemaining": "number (seconds)",
  "bidHistory": [
    {
      "timestamp": "string (ISO date)",
      "price": "number"
    }
  ]
}
```

**Notes:**
- For sealed bid auctions, `bids` and `currentPrice` are only visible to admin
- For penny auctions, returns additional `timeExtension` info
- Returns 404 if no auction is currently active

### `POST /api/auctions/bid`
Places a bid in the current auction.

**Request:**
```json
{
  "userId": "number",
  "itemId": "number",
  "amount": "number"
}
```

**Response:**
```json
{
  "accepted": "boolean",
  "newPrice": "number",
  "newBalance": "number",
  "message": "string",
  "timeRemaining": "number (seconds|null)"
}
```

**Notes:**
- Returns 400 if bid is invalid (too low, auction ended, etc.)
- Returns 403 if user has insufficient balance
- For penny auctions, may extend remaining time
- For sealed auctions, doesn't reveal if bid is winning

### `GET /api/auctions/config`
Gets the current auction configuration.

**Response:**
```json
{
  "auctionType": "string (english|dutch|firstprice|vikrey|chinese|penny|random)",
  "allowNewItems": "boolean",
  "pennyAuctionConfig": {
    "incrementAmount": "number",
    "timeExtension": "number",
    "minimumTimeRemaining": "number"
  }
}
```

### `GET /api/users/:id/balance-history`
Retrieves balance history for a specific user.

**Response:**
```json
[
  {
    "timestamp": "string (ISO date)",
    "balance": "number",
    "reason": "string (bid|win|sell)",
    "itemId": "number",
    "itemTitle": "string (optional, title of the item related to the transaction)"
  }
]
```

## Admin Controls

### `GET /api/admin/auth`
Checks perceived admin authentication status, primarily for client-side flow.

**Response:**
```json
{
  "authenticated": "boolean"
}
```

**Notes:**
- This endpoint supports client-side checks (like in `src/routes/admin/+page.svelte`) to determine if full authentication is immediately needed.
- Consistent with the "No cookie-based sessions for admin access" principle, if this `GET` request is made without a valid, client-managed authentication token (which would have been obtained from a `POST /api/admin/auth` and stored by the client), this endpoint should return `{"authenticated": false}`.
- Actual authentication must be performed via `POST /api/admin/auth`. Other admin-protected endpoints would require that authentication to be enforced, potentially via a token mechanism established after the `POST` login.

### `POST /api/admin/auth`
Authenticates admin access.

**Request:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "authenticated": "boolean"
}
```

### `POST /api/admin/reset`
Resets the entire auction.

**Response:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

**Notes:**
- Requires admin authentication
- Resets all users to 100 balance
- Marks all items as unsold
- Clears auction history

### `POST /api/admin/next-item`
Moves the auction to the next item.

**Response:**
```json
{
  "success": "boolean",
  "item": {
    "id": "number",
    "title": "string",
    "description": "string",
    "seller": {
      "id": "number",
      "name": "string"
    }
  },
  "remainingItems": "number"
}
```

**Notes:**
- Requires admin authentication
- Finalizes the previous auction if one was active

### `PUT /api/admin/config`
Updates the auction configuration.

**Request:**
```json
{
  "auctionType": "string (english|dutch|firstprice|vikrey|chinese|penny|random)",
  "allowNewItems": "boolean",
  "pennyAuctionConfig": {
    "incrementAmount": "number",
    "timeExtension": "number",
    "minimumTimeRemaining": "number"
  }
}
```

**Response:**
```json
{
  "success": "boolean",
  "config": {
    "auctionType": "string",
    "allowNewItems": "boolean",
    "pennyAuctionConfig": {
      "incrementAmount": "number",
      "timeExtension": "number",
      "minimumTimeRemaining": "number"
    }
  }
}
```

**Notes:**
- Requires admin authentication
- Can be updated during an active auction
- If type is "random", a random auction type will be selected for each item

### `GET /api/admin/results`
Gets the complete auction results for all completed auctions.

**Response:**
```json
[
  {
    "id": "number",
    "item": {
      "id": "number",
      "title": "string",
      "description": "string"
    },
    "seller": {
      "id": "number",
      "name": "string"
    },
    "buyer": {
      "id": "number",
      "name": "string"
    },
    "price": "number",
    "auctionType": "string",
    "completedAt": "string (ISO date)"
  }
]
```

**Notes:**
- Requires admin authentication
- Sorted by completion time (newest first)

### `GET /api/admin/results/export`
Gets the results in a format suitable for export.

**Response:**
```
Content-Type: text/plain

Favour Auction Results:

Alex bought "Guitar Lesson" from Sam for 35 points (English)
Taylor bought "Cooking Class" from Jordan for 42 points (Dutch)
...
```

**Notes:**
- Requires admin authentication
- Returns plain text format suitable for pasting into Discord

### `GET /api/admin/users`
Retrieves a list of all registered users with their ID, name, and current balance.

**Response:**
```json
[
  {
    "id": 1,
    "name": "User One",
    "balance": 1000
  },
  {
    "id": 2,
    "name": "User Two",
    "balance": 750
  }
]
```

**Notes:**
- Requires admin authentication
- Returns an empty array if no users are registered
- Returns 500 if there's an error retrieving users

## Data Models

### User
```typescript
{
  id: number;
  name: string;
  balance: number;
  itemsSold: number;
  itemsBought: number;
}
```

### Item
```typescript
{
  id: number;
  title: string;
  description: string;
  sellerId: number;
  sold: boolean;
  createdAt: string; // ISO date
}
```

### Bid
```typescript
{
  id: number;
  userId: number;
  itemId: number;
  amount: number;
  timestamp: string; // ISO date
}
```

### AuctionResult
```typescript
{
  id: number;
  itemId: number;
  sellerId: number;
  buyerId: number;
  price: number;
  auctionType: string;
  completedAt: string; // ISO date
}
```

### AuctionConfig
```typescript
{
  auctionType: 'english' | 'dutch' | 'firstprice' | 'vikrey' | 'chinese' | 'penny' | 'random';
  allowNewItems: boolean;
  pennyAuctionConfig: {
    incrementAmount: number;
    timeExtension: number;
    minimumTimeRemaining: number;
  };
}
```

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "error": "boolean",
  "message": "string",
  "code": "string",
  "details": "object (optional)"
}
```

Common error codes:
- `INVALID_INPUT`: Request data is invalid
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Action not allowed
- `NOT_FOUND`: Requested resource not found
- `INSUFFICIENT_BALANCE`: User doesn't have enough points
- `AUCTION_ENDED`: Auction has already ended
- `INTERNAL_ERROR`: Server-side error

## Security Considerations

1. **Admin Authentication:**
   - Admin password stored in server environment variables
   - No cookie-based sessions for admin access
   - Password never stored in browser

2. **User Authentication:**
   - Simple name-based system stored in localStorage
   - No sensitive personal data collected

3. **Rate Limiting:**
   - API endpoints should implement appropriate rate limiting
   - Particularly important for bidding endpoints to prevent auction manipulation

4. **Validation:**
   - All inputs must be strictly validated
   - Auction rules enforced server-side to prevent manipulation

5. **WebSocket Communication:**
   - Real-time updates for auction state should use WebSockets
   - Ensures all participants see the same auction state