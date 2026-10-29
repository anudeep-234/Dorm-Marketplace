# Dorm Marketplace PRD

## 1. Scope Cut
- **Payments:** Handling money adds refunds, fraud, and legal questions, so a Day 1 prototype uses in-person cash or Venmo outside the app.
- **In-app chat:** Real-time messaging needs its own server, moderation, and notifications, which would take more time than the core claim flow.
- **Advanced search and filters:** Browsing a short list of items is enough for a prototype, and search adds indexing and UI work without testing the claim logic.

## 2. MVP Features
- **List an item:** A seller enters a title, category, condition, and their name, and the item appears as available.
- **Browse available items:** Buyers see all items that are not sold, with status badges and countdowns for claimed items.
- **Claim with handoff confirmation:** A buyer claims an available item, which holds it for 30 seconds. The buyer confirms the handoff before the hold expires, and the item is marked sold. The seller can also mark any item as sold at any time.

## 3. Acceptance Criteria: Claim Item
- **AC1 Concurrency:**
  Given an item is available
  When two buyers claim it at the same time
  Then exactly one claim succeeds and the other receives "Item is no longer available"

- **AC2 Expiry:**
  Given a buyer has claimed an item
  When 30 seconds pass without a handoff confirmation
  Then the item returns to available and the buyer's claim is cleared

- **AC3 Seller override:**
  Given an item is listed or claimed
  When the seller clicks Mark as Sold
  Then the item is removed from active listings immediately

## Rules
- A seller cannot claim their own item.
- A confirmation that arrives after the claim expires is rejected.
- Only the buyer holding an active claim can confirm the handoff.
- `sold` is terminal and cannot change back.
