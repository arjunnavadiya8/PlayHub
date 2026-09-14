# PlayHub Architecture

PlayHub is split into two independent applications:

```text
Browser
  |
  | HTTP/JSON + JWT
  v
+---------------------------+       +------------------------------+
| Frontend                  |       | Backend                      |
| client/                   | ----> | server/                      |
| React + Vite              |       | Express + Mongoose           |
| Port 5173                 |       | Port 5000                    |
+---------------------------+       +---------------+--------------+
                                                    |
                                                    v
                                      +------------------------------+
                                      | Database                     |
                                      | MongoDB                      |
                                      | Users, Venues, Courts,       |
                                      | Slots, Bookings, Audit Logs  |
                                      +------------------------------+
```

The frontend never decides ownership or availability. It displays data and sends user actions to the backend. The backend authenticates the JWT, applies permissions and business rules, and is the only layer that reads or writes MongoDB.

## 1. Frontend — `client/`

The frontend owns presentation, navigation, form state and API consumption.

```text
client/
├── src/
│   ├── components/             Shared UI components
│   │   ├── AuthModal.jsx       Login and account-type registration
│   │   ├── BookingModal.jsx    Customer slot selection and booking
│   │   ├── Header.jsx          Customer navigation
│   │   └── VenueCard.jsx       Customer venue result card
│   ├── pages/
│   │   ├── Home.jsx            Customer venue discovery
│   │   ├── MyBookings.jsx      Customer booking history
│   │   └── OwnerDashboard.jsx  Owner operations workspace
│   ├── state/
│   │   └── AuthContext.jsx     Session and authenticated user state
│   ├── lib/
│   │   └── api.js              The only shared HTTP client
│   ├── App.jsx                 Role guards and routes
│   ├── main.jsx                React entry point
│   └── styles.css              Current shared styles
├── index.html
└── vite.config.js
```

### Frontend responsibilities

- Render customer and owner interfaces.
- Redirect customers and owners to their correct workspace.
- Store the JWT locally and attach it to API requests.
- Keep the selected venue as UI state.
- Refetch venue-scoped data when the selected venue changes.
- Display backend validation and authorization errors.

### Frontend module boundary

```text
Customer UI
├── Discover venues
├── Filter by sport
├── View available court slots
├── Hold and confirm a booking
└── View/cancel own bookings

Owner UI
├── Dashboard
├── Bookings
├── Calendar
├── Manage Slots
├── Sports & Courts
├── Pricing
├── Venue Profile
├── Analytics
└── Customers
```

As the remaining owner modules are implemented, `OwnerDashboard.jsx` should be reduced to layout and venue selection. Each owner module should live in `client/src/features/owner/<module>/` with its own view and small components. Shared owner controls should live in `client/src/features/owner/shared/`.

Recommended target structure:

```text
client/src/features/owner/
├── dashboard/DashboardView.jsx
├── bookings/BookingsView.jsx
├── calendar/CalendarView.jsx
├── slots/ManageSlotsView.jsx
├── courts/CourtsView.jsx
├── pricing/PricingView.jsx
├── profile/VenueProfileView.jsx
├── analytics/AnalyticsView.jsx
├── customers/CustomersView.jsx
└── shared/
    ├── OwnerSidebar.jsx
    ├── OwnerTopbar.jsx
    └── VenueSwitcher.jsx
```

## 2. Backend — `server/`

The backend owns authentication, authorization, validation, domain rules, persistence and scheduled maintenance.

```text
server/
├── src/
│   ├── config/
│   │   └── db.js                 MongoDB connection
│   ├── middleware/
│   │   └── auth.js               JWT authentication and role checks
│   ├── models/                    MongoDB schemas and indexes
│   │   ├── User.js
│   │   ├── Venue.js
│   │   ├── Court.js
│   │   ├── Slot.js
│   │   ├── Booking.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── routes/                    URL and middleware definitions
│   │   ├── authRoutes.js
│   │   ├── venueRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── ownerRoutes.js
│   ├── controllers/               Request validation and responses
│   │   ├── authController.js
│   │   ├── venueController.js
│   │   ├── bookingController.js
│   │   └── ownerController.js
│   ├── services/                  Reusable business operations
│   │   ├── slotGenerationService.js
│   │   ├── notificationService.js
│   │   └── auditService.js
│   ├── app.js                     Express application and route mounting
│   ├── server.js                  Startup and scheduled jobs
│   ├── seed.js                    Demo data
│   └── migrate-courts.js          Legacy court/slot migration
└── tests/
    └── booking-race.mjs           Concurrent booking protection
```

### Backend responsibilities

- Authenticate a token and load its user.
- Enforce `CUSTOMER`, `OWNER` and `ADMIN` permissions.
- Resolve venue and court ownership from the authenticated user.
- Validate court schedules, pricing and slot transitions.
- Generate court slots without duplicates.
- Hold and confirm bookings transactionally.
- Prevent double-booking with atomic writes and unique indexes.
- Calculate dashboard, customer and analytics data.
- Write notifications and audit records.

Controllers should remain thin. When analytics, pricing and schedule functionality grows, calculations should move into dedicated services instead of expanding `ownerController.js`.

Recommended target services:

```text
server/src/services/
├── ownerDashboardService.js
├── ownerAnalyticsService.js
├── courtScheduleService.js
├── courtPricingService.js
├── slotGenerationService.js
├── bookingService.js
├── notificationService.js
└── auditService.js
```

## 3. Domain hierarchy

```text
User (OWNER)
└── Venue
    └── Court
        └── Slot
            └── Booking ── User (CUSTOMER)
```

Ownership rules:

- An owner can own multiple venues.
- A venue belongs to exactly one owner.
- A court belongs to exactly one venue.
- A slot belongs to exactly one court and venue.
- A booking references exactly one customer, owner, venue, court and slot.
- Booking identity is `court + slot`, never `venue + sport + time`.

## 4. API boundaries

```text
/api/auth/*      Public login/registration and authenticated session
/api/venues/*    Public discovery plus protected venue management
/api/bookings/*  Customer booking lifecycle and owner booking summaries
/api/owner/*     Owner-only venue, court, slot and reporting operations
```

Every protected request follows the same flow:

```text
React action
  -> api.js attaches JWT
  -> Express route
  -> protect middleware verifies JWT
  -> allow middleware verifies role
  -> controller verifies venue/court ownership
  -> service applies business rules
  -> Mongoose writes/reads MongoDB
  -> JSON response updates React state
```

## 5. Role access

| Capability | Customer | Owner | Admin |
|---|---:|---:|---:|
| Discover venues | Yes | No owner UI access | Platform-defined |
| Book a slot | Yes | No | No |
| View own player bookings | Yes | No | No |
| Open owner workspace | No | Yes | Platform-defined |
| Manage owned venues/courts | No | Yes | Yes |
| Read another owner's data | No | No | Yes |

Frontend route guards improve navigation, but backend middleware and ownership queries are the security boundary.

## 6. Booking flow

```text
AVAILABLE slot
  -> customer requests hold
  -> HELD for five minutes
  -> PENDING_PAYMENT booking
  -> simulated payment succeeds
  -> CONFIRMED booking + BOOKED slot
  -> owner dashboard/calendar update on next fetch
```

Failure paths:

```text
HELD -> payment fails/expires -> AVAILABLE
CONFIRMED -> cancelled        -> CANCELLED + future slot AVAILABLE
```

The backend transaction and the unique `(court, startTime)` slot index protect this flow from concurrent double-booking.

## 7. Development rules

1. Frontend code must not access MongoDB or infer ownership.
2. Backend code must not trust `ownerId` received from the browser.
3. Every owner query must first verify the venue or court belongs to the authenticated owner.
4. Page components display data; services contain reusable business calculations.
5. Every new owner module needs API authorization tests and a responsive UI check.
6. Every implementation change must be recorded in `CHANGELOG.md`.

## 8. Run the applications

From `outputs/playhub/mern`:

```text
npm run dev      Starts frontend and backend for development
npm run build    Builds the React frontend
npm run seed     Creates demo users, venues, courts, slots and a booking
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`
- MongoDB: configured by `server/.env`
