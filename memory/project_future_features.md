---
name: Future Features — User Relationships & Shared Access
description: Planned future feature for social/relationship layer between users
type: project
---

User relationships and shared access is a planned future feature.

**Why:** Users should eventually be able to connect with others (spouse, roommate, business partner) and selectively share data — e.g. share a specific account or expense list with a connected user.

**How to apply:** When building any new user-scoped feature, keep data ownership clean (userId on all documents) so the permissions layer can be added later without restructuring. Do not hardcode relationships — `personPaying` on MonthlyExpense stays as free-text for now.

**Scope when tackled:**
- New `Relationship` model: userId, connectedUserId, type (spouse/roommate/business partner/etc), status (pending/accepted)
- Permissions layer on accounts/expenses: sharedWith: [{ userId, accessLevel }]
- Frontend: "Connections" settings page, shared view indicators