# Favour Auction API Specification

## Base URL

/api

## Endpoints

### Users

#### `POST /user`

Create a new user.

*   **Request Body**:
    *   `name` (string, required): The name of the user.
*   **Response (201 Created)**:
    ```json
    {
      "id": 1,
      "name": "user123",
      "balance": 100
    }
    ```
*   **Response (400 Bad Request)**: If input is invalid.

#### `GET /user`

Return a list of all users with their balances.

*   **Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "name": "user123",
        "balance": 100
      },
      {
        "id": 2,
        "name": "anotherUser",
        "balance": 75
      }
    ]
    ```

#### `GET /user/{id}`

Get the balance of a specific user.

*   **Path Parameters**:
    *   `id` (integer, required): The ID of the user.
*   **Response (200 OK)**:
    ```json
    {
      "id": 1,
      "name": "user123",
      "balance": 100
    }
    ```
*   **Response (404 Not Found)**: If the user with the specified ID does not exist.

#### `DELETE /user/{id}`

Delete a specific user. Note: This will also delete related bids, items they own (if not handled by setting owner_id to NULL on item), and their transactions due to CASCADE rules in the DB schema.

*   **Path Parameters**:
    *   `id` (integer, required): The ID of the user to delete.
*   **Response (204 No Content)**: If the user was successfully deleted.
*   **Response (400 Bad Request)**: If the ID is not a valid integer.
*   **Response (404 Not Found)**: If the user with the specified ID does not exist.
*   **Response (500 Internal Server Error)**: If there was an error during deletion.

#### `GET /user/{id}/transactions`

Get the transaction history of a specific user.

*   **Path Parameters**:
    *   `id` (integer, required): The ID of the user.
*   **Response (200 OK)**:
    ```json
    [
        {
          "transaction_id": 1,
          "description": "Initial balance",
          "amount_change": 100,
          "new_balance": 100,
          "timestamp": "2023-10-27T10:00:00Z",
          "related_item_id": null
        },
        {
          "transaction_id": 2,
          "description": "Bid on item 'Cool Gadget'",
          "amount_change": -10, // Example if bids temporarily hold funds or for Penny auctions
          "new_balance": 90,
          "timestamp": "2023-10-27T12:05:00Z",
          "related_item_id": 103,
          "related_bid_id": 203
        }
        // ... other transactions ...
    ]
    ```
*   **Response (404 Not Found)**: If the user with the specified ID does not exist.

### Items

#### `POST /items`

Add a new item for a certain user.

*   **Request Body**:
    *   `description` (string, required): Description of the item/favour.
    *   `seller_id` (integer, required): The ID of the user selling the item.
*   **Response (201 Created)**:
    ```json
    {
      "id": 101,
      "description": "3 hours of linear algebra tutoring",
      "seller_id": 1,
      "status": "available", // initial status
      "current_price": null,
      "owner_id": null
    }
    ```
*   **Response (400 Bad Request)**: If input is invalid (e.g., `seller_id` does not exist).
*   **Response (403 Forbidden)**: If adding new items is disallowed by the current auction configuration (`allow_new_items: false`).

#### `GET /items`

List all items, their seller, current status, new owner, and current price.

*   **Response (200 OK)**:
    ```json
    [
      {
        "id": 101,
        "description": "3 hours of linear algebra tutoring",
        "seller_id": 1,
        "seller_name": "user123", // Denormalized for convenience
        "status": "available", // e.g., 'available', 'active_auction', 'sold', 'passed', 'cancelled'
        "current_price": null, // or current highest bid if active, or final price if sold
        "owner_id": null, // or ID of the winning user if sold
        "owner_name": null // Denormalized for convenience
      },
      {
        "id": 102,
        "description": "Write and record a song",
        "seller_id": 2,
        "seller_name": "anotherUser",
        "status": "sold",
        "current_price": 50,
        "owner_id": 1,
        "owner_name": "user123"
      }
    ]
    ```

#### `GET /items/{item_id}`

Return a single item, its status, and all related information including bids.

*   **Path Parameters**:
    *   `item_id` (integer, required): The ID of the item.
*   **Response (200 OK)**:
    ```json
    {
      "id": 101,
      "description": "3 hours of linear algebra tutoring",
      "seller_id": 1,
      "seller_name": "user123",
      "status": "active_auction",
      "current_price": 25, // current highest bid
      "owner_id": null,
      "owner_name": null,
      "bids": [ // Bid history for the item
        {
          "bid_id": 201,
          "user_id": 2,
          "user_name": "anotherUser", // Denormalized
          "bid_amount": 10,
          "timestamp": "2023-10-27T11:00:00Z",
          "status": "outbid"
        },
        {
          "bid_id": 202,
          "user_id": 1,
          "user_name": "user123", // Denormalized
          "bid_amount": 25,
          "timestamp": "2023-10-27T11:05:00Z",
          "status": "winning"
        }
      ]
    }
    ```
*   **Response (404 Not Found)**: If the item with the specified ID does not exist.

#### `DELETE /items/{item_id}`

Delete a specific item. This should also remove related bids. 
Consider implications if the item is currently in an auction or has been sold (e.g., disallow deletion, or handle appropriately).

*   **Path Parameters**:
    *   `item_id` (integer, required): The ID of the item to delete.
*   **Response (204 No Content)**: If the item was successfully deleted.
*   **Response (400 Bad Request)**: If the `item_id` is not a valid integer.
*   **Response (404 Not Found)**: If the item with the specified ID does not exist.
*   **Response (409 Conflict)**: If the item cannot be deleted due to its current state (e.g., active in auction, already sold and referenced in transactions). 
*   **Response (500 Internal Server Error)**: If there was an error during deletion.

### Auction

#### `POST /auction/config`

Replace auction configuration.

*   **Request Body**:
    ```json
    {
      "auction_type": "english", // 'random', 'english', 'dutch', 'first_price_sealed', 'vikrey', 'chinese', 'penny'
      "allow_new_items": false
      // previewed_item_id is managed internally by GET /auction/next_item and POST /auction/next_item
    }
    ```
    *   `auction_type` (string, optional, default: "random"): The type of auction to be used.
    *   `allow_new_items` (boolean, optional, default: true): Whether users are allowed to add new items.
*   **Response (200 OK)**:
    ```json
    {
      "auction_type": "english",
      "allow_new_items": false,
      "current_auction_item_id": null, // or the ID of the current item if one is active
      "previewed_item_id": null // or the ID of the item currently up for preview
    }
    ```
*   **Response (400 Bad Request)**: If the configuration values are invalid.

#### `GET /auction/config`

Get the current auction configuration.

*   **Response (200 OK)**:
    ```json
    {
      "auction_type": "english",
      "allow_new_items": false,
      "current_auction_item_id": 101, // example of active auction
      "previewed_item_id": null // example, no item being previewed if auction active
    }
    ```

#### `GET /auction/next_item`

Get info about a randomly selected available item for preview. Sets this item as the `previewed_item_id` in the auction configuration.

*   **Response (200 OK)**: (Details of the item selected for preview)
    ```json
    {
      "id": 103,
      "description": "Message you every day for a month",
      "seller_id": 3,
      "seller_name": "creativeCat",
      "status": "available",
      "current_price": null,
      "owner_id": null,
      "owner_name": null
    }
    ```
*   **Response (404 Not Found)**: If no available items to auction.
*   **Response (409 Conflict)**: If an auction is already in progress (`current_auction_item_id` is set).

#### `POST /auction/next_item`

Manages the `previewed_item_id`. Can start an auction for it, skip it to get a new preview, or remove it from auction consideration.

*   **Request Body**:
    ```json
    {
      "action": "start" // or "skip" or "remove"
    }
    ```
    *   `action` (string, required): Must be "start", "skip", or "remove".
*   **Response (200 OK - if action: "start")**: (Auction started for the previewed item)
    ```json
    {
      "message": "Auction started for item.",
      "item": {
        "id": 103, // ID of the item whose auction just started (was previewed_item_id)
        "description": "Message you every day for a month",
        "seller_id": 3,
        "seller_name": "creativeCat",
        "status": "active_auction"
        // ... other item details ...
      }
    }
    ```
*   **Response (200 OK - if action: "skip")**: (Previewed item skipped, new item selected for preview)
    ```json
    {
      "message": "Previous item skipped. New item available for preview.",
      "item": { // Details of the NEW previewed_item_id
        "id": 104,
        "description": "Bake a custom cake",
        "seller_id": 2,
        "seller_name": "anotherUser",
        "status": "available"
        // ... other item details ...
      }
    }
    ```
*   **Response (200 OK - if action: "remove")**: (Previewed item removed from auction consideration)
    ```json
    {
      "message": "Item removed from auction consideration and preview cleared.",
      "removed_item_id": 103 // The ID of the item that was removed
    }
    ```
*   **Response (400 Bad Request)**:
    *   If `action` is invalid.
    *   If `action` is "start" or "remove" and no `previewed_item_id` is set.
*   **Response (404 Not Found)**:
    *   If `action` is "skip" and no other available items can be found to preview.
    *   If `action` is "start" or "remove" and the `previewed_item_id` refers to a non-existent or already processed item.
*   **Response (409 Conflict)**: If an auction is already in progress (`current_auction_item_id` is set) and action is "start".

#### `POST /auction/bid`

Place a bid on the current item.

*   **Request Body**:
    ```json
    {
      "user_id": 1,
      "item_id": 103, // Should match current_auction_item_id
      "bid_value": 30
    }
    ```
    *   `user_id` (integer, required): The ID of the user placing the bid.
    *   `item_id` (integer, required): The ID of the item being bid on.
    *   `bid_value` (integer, required): The amount of the bid.
*   **Response (200 OK)**:
    ```json
    {
      "message": "Bid placed successfully.",
      "bid_id": 203,
      "item_id": 103,
      "user_id": 1,
      "bid_value": 30,
      "timestamp": "2023-10-27T12:00:00Z"
    }
    ```
*   **Response (400 Bad Request)**:
    *   If `item_id` does not match the currently auctioned item.
    *   If `bid_value` is not valid (e.g., less than current highest bid + increment for English auction, or user doesn't have enough balance for some auction types).
*   **Response (403 Forbidden)**: If the user does not have enough balance (general check, specific rules per auction type may apply).
*   **Response (404 Not Found)**: If the specified `user_id` or `item_id` does not exist.
*   **Response (409 Conflict)**: If no item is currently being sold or if the auction for this item hasn't started/has ended.

#### `POST /auction/end_item`
(Implicitly needed to finalise an auction for an item)

Ends the auction for the `current_auction_item_id`, determines the winner, updates balances, and item status. Specific logic depends on auction type.

*   **Response (200 OK)**:
    ```json
    {
        "message": "Auction for item 103 ended.",
        "item_id": 103,
        "status": "sold", // or "passed" if no valid bids
        "winner_id": 1, // or null
        "winner_name": "user123", // or null; Denormalized
        "winning_price": 30 // or null
    }
    ```
*   **Response (409 Conflict)**: If no item is currently being auctioned.


#### `POST /auction/reset`

Remove all items and users from the auction (keeps auction config, including `previewed_item_id` which should be cleared). Balances are reset, items are cleared, bids are cleared, transaction histories are cleared.

*   **Response (200 OK)**:
    ```json
    {
      "message": "Auction has been reset. Users, items, and bids cleared. Configuration preserved (previewed item cleared)."
    }
    ```

## Data Models (Conceptual - for API responses)

### User
```json
{
  "id": 1,
  "name": "user123",
  "balance": 100
}
```

### Item
```json
{
  "id": 101,
  "description": "3 hours of linear algebra tutoring",
  "seller_id": 1,
  "seller_name": "user123",
  "status": "available", // 'available', 'active_auction', 'sold', 'passed', 'cancelled'
  "current_price": null, // Current highest bid or final sale price
  "owner_id": null, // ID of the winner if sold
  "owner_name": null, // Name of the winner if sold
  "bids": [ /* Array of Bid objects, optional when listing multiple items, included for GET /items/{item_id} */ ]
}
```

### Transaction
```json
{
  "transaction_id": 1,
  "description": "Initial balance",
  "amount_change": 100, // positive for credit, negative for debit
  "new_balance": 100,   // balance after this transaction
  "timestamp": "2023-10-27T10:00:00Z",
  "related_item_id": null, // ID of item if transaction is related to an item
  "related_bid_id": null   // ID of bid if transaction is related to a bid
}
```

### Bid (on an item)
```json
{
  "bid_id": 201,
  "user_id": 2,
  "user_name": "anotherUser", // Denormalized
  "item_id": 101,
  "bid_amount": 10,
  "timestamp": "2023-10-27T11:00:00Z",
  "status": "outbid" // 'active', 'outbid', 'winning', 'cancelled', 'won', 'lost'
}
```

### AuctionConfig
```json
{
  "auction_type": "english", // 'random', 'english', 'dutch', 'first_price_sealed', 'vikrey', 'chinese', 'penny'
  "allow_new_items": true,
  "current_auction_item_id": null, // ID of the item currently up for auction, or null
  "previewed_item_id": null // ID of the item currently selected for preview by GET /auction/next_item, or null
}
```

## Auction Types (as per README)
- English auction
- Dutch auction
- First price sealed
- Vikrey (winner pays second highest bid)
- Chinese
- Penny (parameters chosen by admin, all profits go to person whose item is being sold)

The specifics of how each auction type affects bidding logic (e.g., minimum bid increments, bid visibility, winner determination) will need to be implemented in the backend logic for `/auction/bid` and the `/auction/end_item` endpoints.
The `POST /auction/bid` endpoint might need to behave differently or accept different parameters based on the current `auction_type`.
For example, sealed bid auctions would hide bids until the auction ends.
The `penny` auction might require additional parameters in `AuctionConfig`.
The `chinese` auction has specific rules that need careful implementation.
