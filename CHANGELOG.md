# PlayHub Development Log

## 2026-09-14 - Separate owner login and registration portal

### What changed

- Added a dedicated `/owner/login` page with separate Owner Login and Create Owner Account modes.
- Added a distinct owner-facing design and messaging instead of reusing the customer authentication modal.
- Added `POST /api/auth/owner/login` and `POST /api/auth/owner/register` with role-scoped behavior.
- Owner registration always creates an `owner` account; the customer registration endpoint remains customer-only.
- Customer login now rejects owner accounts and directs them to the Owner Login page, preventing the two login flows from being mixed.
- Unauthenticated `/owner` visits now redirect to `/owner/login`; successful owner login or signup redirects to the owner dashboard.
- Updated customer footer Owner Login and List Your Turf links to open the dedicated owner portal.
- Updated the customer modal copy so it clearly represents player login and player registration only.

### Files affected

- `server/src/controllers/authController.js` - role-scoped owner signup/login and customer-login enforcement.
- `server/src/routes/authRoutes.js` - dedicated owner authentication endpoints.
- `server/tests/owner-auth.mjs` - owner signup/login separation integration test with automatic cleanup.
- `server/package.json` - reusable `test:owner-auth` command.
- `client/src/state/AuthContext.jsx` - owner authentication session method.
- `client/src/pages/OwnerAuth.jsx` - dedicated owner login/signup page.
- `client/src/components/AuthModal.jsx` - player-only authentication copy and routing.
- `client/src/App.jsx` - owner-auth route, guards and footer links.
- `client/src/styles.css` - responsive owner-auth page styling.
- `CHANGELOG.md` - implementation and verification record.

### Verification

- Server auth controller and route syntax validation passed.
- React production build passed with 51 modules transformed.
- `npm run test:owner-auth` verified owner signup returns an owner session, owner login succeeds, customer login rejects the owner account, and the temporary test account is removed.
- Browser QA confirmed `/owner` redirects unauthenticated visitors to `/owner/login`.
- Browser QA confirmed the dedicated page renders both Owner Login and Create Owner Account modes with distinct owner-only copy and fields.

## 2026-09-14 - Database-backed customer area filter

### What changed

- Added an Area selector beside the customer sport filters so players can narrow available venues to a specific Surat locality.
- Populated the selector from distinct active venue areas stored in MongoDB, so owner-created areas appear automatically without frontend code changes.
- Area changes immediately rerun the existing sport/date availability query and scroll to the filtered results.
- Kept the hero location field available for broader searches by venue name, address, area, or all of Surat.
- Added responsive styling that stacks the Area selector below sport chips on smaller screens.

### Files affected

- `server/src/controllers/venueController.js` - public active-area lookup.
- `server/src/routes/venueRoutes.js` - `GET /api/venues/areas` route declared before dynamic venue IDs.
- `client/src/pages/Home.jsx` - loads areas and applies area filtering.
- `client/src/styles.css` - desktop and mobile filter-bar styling.
- `CHANGELOG.md` - documents implementation and verification.

### Verification

- Server controller and route syntax validation passed.
- React production build passed with 50 modules transformed.
- `GET /api/venues/areas` returned the active MongoDB area `vesu`.
- The availability API filtered `area=vesu` to the matching `PlayPickle` venue.
- Browser QA confirmed the selector displays `All Surat areas` and `vesu`; selecting `vesu` updated the summary, location state and visible venue card.

## 2026-09-14 - Shared sport-time availability with automatic court assignment

### What changed

- Grouped customer availability by `venue + sport + start time` instead of rendering one button for every physical court slot.
- A time now appears once for a sport and displays how many matching courts remain available.
- The time remains visible while at least one same-sport court is available and disappears only after every matching court at that time is held or booked.
- Removed physical court names from customer time choices; customers choose the sport/time while PlayHub assigns the court.
- Extended `POST /api/bookings/hold` to accept `venueId`, `sport`, and `startTime` and atomically claim any active available court slot in that group.
- Kept the existing `slotId` hold contract backward compatible for existing integrations and tests.
- The allocator prefers the lowest-priced available matching slot, then a stable record order.
- Court assignment and booking creation remain inside the existing MongoDB transaction, preventing two customers from receiving the same court.
- Updated booking copy, selection summary, capacity labels and payment-state text to explain automatic assignment.

### Files affected

- `server/src/controllers/bookingController.js` - transactional shared-time court allocation.
- `client/src/components/BookingModal.jsx` - grouped sport/time choices and group-based hold request.
- `client/src/styles.css` - grouped availability button sizing and detail styling.
- `server/tests/group-booking.mjs` - reusable capacity-exhaustion and distinct-court integration test with automatic cleanup.
- `server/package.json` - added the `test:group-booking` command.
- `CHANGELOG.md` - documents implementation and verification.

### Verification

- Server booking-controller syntax validation passed.
- React production build passed with 50 modules transformed.
- `npm run test:group-booking` found a Pickleball time with capacity 3, successfully created three holds assigned to three distinct courts, and returned HTTP 409 only on the fourth request.
- The integration test released every hold and removed its temporary bookings and customer account.
- Browser QA confirmed 06:00 renders once as `Pickleball - 3 courts left`, rather than three separate 06:00 court buttons.
- Browser selection correctly updated the summary to `Pickleball - 3 courts available`.

## 2026-09-14 - Customer-only public registration and shared owner login

### What changed

- Removed the `I own a venue` role choice from public registration.
- Renamed the registration screen to `Create your player account` and clarified that it is only for players booking venues.
- Public signup now always sends and creates the `customer` role.
- Added backend enforcement that returns HTTP 403 when a caller attempts to submit any non-customer role to public registration.
- Kept one shared login screen for players and existing venue owners; successful owner login continues routing directly to `/owner`.
- Added explicit login/signup modal modes so Header `Log in` always opens login and Header `Sign up` always opens player registration.
- Updated booking authentication prompts and footer venue-owner actions to open the login form instead of public registration.

### Files affected

- `client/src/components/AuthModal.jsx` - player-only signup UI and shared owner/customer login copy.
- `client/src/state/AuthContext.jsx` - explicit auth-modal mode and customer-only registration payload.
- `client/src/components/Header.jsx` - deterministic login and player-signup actions.
- `client/src/components/BookingModal.jsx` - opens login when authentication is required.
- `client/src/App.jsx` - directs venue-owner footer actions to login.
- `server/src/controllers/authController.js` - blocks public owner-role creation and forces new accounts to customer.
- `CHANGELOG.md` - documents the implementation and verification.

### Verification

- Server auth-controller syntax validation passed.
- React production build passed with 50 modules transformed.
- A direct public owner-registration request returned HTTP 403 with `Venue owner accounts cannot be created through public registration`.
- Browser QA confirmed the signup modal has no owner option and only displays `Create player account`.
- Browser QA confirmed the login modal states that registered venue owners log in there.
- Removed the temporary test owner account created while detecting a stale pre-restart API process.

## 2026-09-14 - Reference search bar, today-only owner slots, and customer-page polish

### What changed

- Replaced the four-filter customer search bar with the supplied three-field reference layout: location, sport, date, and the lime Find Turfs action.
- Removed start time from the homepage search state and result summary; customers still choose an available time inside the booking modal after selecting a venue.
- Kept location, sport and date connected to real MongoDB slot availability filtering.
- Changed the owner Manage Slots/Calendar screen from a seven-day list to a clearly labelled `Today's slots` view.
- Changed both owner slot controllers to enforce the current local day from midnight to midnight and ignore browser-supplied future `from`/`to` ranges.
- Updated both owner-side slot refresh requests to request only today's range.
- Replaced the large dark 2x2 How It Works panel with the requested compact white five-step flow: location, sport, date/time, payment and play.
- Rebuilt the sparse customer footer with a stronger PlayHub brand block, Explore, For Venues and Support navigation, copyright row and brand message.
- Added responsive behavior: the five-step flow remains horizontal and scrollable on smaller screens, while the footer collapses cleanly.

### Files affected

- `client/src/pages/Home.jsx` - three-field search and five-step booking flow.
- `client/src/pages/OwnerDashboard.jsx` - today-only owner slot request and wording.
- `client/src/App.jsx` - structured customer footer and owner-listing action.
- `client/src/styles.css` - reference search dimensions, horizontal steps and responsive footer styling.
- `server/src/controllers/ownerController.js` - enforces today-only court-slot results.
- `server/src/controllers/venueController.js` - enforces today-only results on the legacy owner-slot endpoint.
- `CHANGELOG.md` - documents this implementation and verification.

### Verification

- Server syntax checks passed for both changed controllers.
- React production build passed with 50 modules transformed.
- Browser QA confirmed only Location, Sport and Date appear in the customer search bar.
- Browser QA confirmed the compact five-step How It Works flow and redesigned footer render correctly.
- An authenticated owner API test supplied a future seven-day range but received 17 slots exclusively dated `2026-09-14`, confirming server-enforced today-only isolation.

## 2026-09-14 - Customer discovery UI and live availability filters

### What changed

- Rebuilt the customer hero and venue-discovery area to closely follow the supplied PlayHub reference with the three-line sports headline, lime/dark visual system, compact navigation treatment, prominent search card, venue results, booking promotion, platform statistics and responsive layouts.
- Added working location, sport, date and exact start-time controls to the main search form.
- Added quick sport chips and result-section sport filters that execute the same real availability search.
- Added clear/reset states, loading feedback, no-results guidance and an applied-filter summary.
- Updated venue cards with matching available-slot counts, the next available time and the lowest matching slot price.
- Passed the selected date and sport into the booking modal and automatically selected the searched start time when that slot remains available.
- Added server-side venue discovery across venue name, area and address with escaped search input.
- Treated `Surat` and `Surat, Gujarat` as the marketplace-wide city selection, while searches such as `Vesu` continue to narrow by area/address/name.
- Added real slot availability filtering by date, sport and exact start time; venues without a matching `AVAILABLE` court slot are excluded.
- Added validation that returns HTTP 400 for malformed time values.

### API behavior

- `GET /api/venues?area=Vesu&sport=Pickleball&date=2026-09-14&time=06:00` returns only active venues with a matching available court slot.
- Availability-filtered venue responses include `availableSlotCount`, `nextAvailableSlot`, and `fromPrice`.
- `GET /api/venues/:id/slots` now accepts optional `sport` and `time` filters in addition to `date`.

### Files affected

- `server/src/controllers/venueController.js` - implements location and live slot-availability filtering.
- `client/src/pages/Home.jsx` - implements the new discovery page and connected filter state.
- `client/src/components/VenueCard.jsx` - displays live availability details and matching price.
- `client/src/components/BookingModal.jsx` - carries search context into court-slot selection.
- `client/src/styles.css` - adds the reference-inspired customer UI and responsive breakpoints.
- `CHANGELOG.md` - documents the implementation and verification.

### Verification

- Server syntax validation passed for the updated venue controller.
- React production build passed with 50 modules transformed.
- Live API checks returned one result for marketplace-wide Surat, one for Vesu, one for Pickleball and one for the available 06:00 start time.
- A non-matching Football filter returned zero venues, and malformed time `99:99` returned HTTP 400.
- Browser QA confirmed location `vesu` + sport `Pickleball` + date + time `06:00` returned PlayPickle with exactly one matching slot.
- Opening the filtered venue carried the date/sport into the booking modal and preselected the 06:00 court slot.
- Final browser reload completed with no console errors; frontend and API both returned HTTP 200/healthy status.

## 2026-09-14 - Venue operating hours and complete court schedule

### What changed

- Added owner-controlled opening and closing times to every venue, defaulting to `06:00` and `23:00`.
- Added server validation for 24-hour `HH:mm` values and rejected a closing time that is not later than the opening time.
- Added opening and closing time inputs to the owner Venue Profile form for both new and existing venues.
- Added immediate form feedback when the owner selects a closing time that is not later than the opening time.
- Made newly created courts inherit their venue's operating hours across all seven schedule days.
- When an owner changes venue hours, synchronized every court at that owned venue and regenerated its next 30 days of slots idempotently.
- Preserved each court's enabled/closed weekday choices while synchronizing its daily opening and closing times.
- Kept booked and held slots intact during regeneration; generated available slots outside the new hours follow the existing safe `OUTSIDE_SCHEDULE` blocking rule.
- Removed the four-court and seven-time-row limits from Today's Schedule, so all active courts and generated operating times are shown in the scrollable schedule matrix.
- Replaced the hardcoded `6 AM Opens` dashboard value with the selected venue's actual opening-closing range.

### Files affected

- `server/src/models/Venue.js` - stores and validates venue operating hours.
- `server/src/controllers/venueController.js` - accepts safe hour fields and propagates hour changes to owned courts and future slots.
- `server/src/controllers/ownerController.js` - applies venue hours when a court is created.
- `client/src/pages/OwnerDashboard.jsx` - adds owner time controls and renders all courts/times with the selected venue hours.
- `client/src/styles.css` - adds responsive layout for the two operating-hour inputs and the compact summary value.
- `CHANGELOG.md` - documents this implementation and its verification.

### Verification

- `node --check` passed for `Venue.js`, `venueController.js`, and `ownerController.js`.
- Venue model validation accepted `07:00-22:00` and rejected the invalid overnight range `22:00-07:00` with the expected error.
- `npm run build --prefix client` passed with 50 modules transformed.
- The running API health endpoint returned `status: ok`.
- The running frontend returned HTTP 200 on `http://localhost:5173/`.
- Browser QA confirmed the rebuilt page renders after reload with no console errors.

This is the single source of documentation for all project changes made from September 12, 2026 onward.

Each entry records:

- What was changed
- Files affected
- Why the change was made
- Validation or testing performed

## 2026-09-14 — Blank development page fixed

### What changed

- Changed the client development command to build with the working Rollup pipeline and serve the result with Vite Preview on port 5173.
- Kept native dependency discovery disabled because the Windows filesystem sandbox prevents esbuild from traversing protected parent directories.
- Kept strict port enforcement on port 5173.
- Stopped overlapping PlayHub process groups and launched one clean root development process for the client, API and local MongoDB.

### Root cause

- Disabling native Vite dependency pre-bundling exposed React Router's CommonJS cookie imports directly to the browser, causing its named `parse` import to fail.
- Re-enabling native pre-bundling was not viable because esbuild cannot traverse protected parent directories in this Windows environment.
- The production build works correctly, so local startup now serves that reliable build instead of the failing native optimizer.
- Multiple simultaneous `npm run dev` commands also competed for frontend port 5173, API port 5000 and MongoDB port 27018.

### Files affected

- `client/package.json` — changed local development startup to build and preview.
- `client/vite.config.js` — retained Windows-safe optimizer and strict-port settings.
- `CHANGELOG.md` — documented the error, fix and runtime cleanup.

### Verification

- A clean root `npm run dev` successfully started Nodemon, MongoDB, the API and the frontend.
- The frontend build transformed 50 modules successfully and opened on port 5173.
- Browser QA confirmed the full PlayHub homepage renders instead of a white page.
- `GET /api/health` returned `{"status":"ok"}` and the frontend returned HTTP 200.
- Confirmed no fallback process is using port 5174.

## 2026-09-14 — Development port conflict made explicit

### What changed

- Enabled Vite's `strictPort` setting for port 5173.
- A second `npm run dev` now reports that PlayHub is already running instead of silently opening an unsupported frontend on port 5174.

### Reason

- The frontend origin and backend CORS configuration are both intentionally fixed to `http://localhost:5173`.
- Running duplicate project processes caused Vite to move to 5174 while another backend attempted to initialize the same local MongoDB instance.

### Files affected

- `client/vite.config.js` — enabled strict port handling.
- `CHANGELOG.md` — documented the diagnosis and prevention.

### Verification

- React production build passed with 50 modules transformed.
- The supported frontend at `http://localhost:5173` returned HTTP 200.
- The API health endpoint returned `{"status":"ok"}`.
- Confirmed no process remains listening on the accidental port 5174.

## 2026-09-14 — Desktop project runtime configured

### What changed

- Added a local `server/.env` so the synchronized Desktop backend can run independently from the old project directory.
- Configured API port 5000, local persistent MongoDB replica set mode, the React origin, development mode and Asia/Kolkata timezone.
- Started the React development server on port 5173.
- Started the Express API and its local persistent MongoDB replica set on port 5000.

### Files affected

- `server/.env` — local ignored runtime configuration.
- `CHANGELOG.md` — documented the runtime setup.

### Security

- `server/.env` remains excluded by `.gitignore` and is intended only for local development.

### Verification

- `GET http://localhost:5000/api/health` returned `{"status":"ok"}`.
- `http://localhost:5173/` returned HTTP 200 with the PlayHub page.

## 2026-09-14 — Desktop repository synchronized with previous project

### What changed

- Synchronized the current PlayHub source from the previous working directory into `C:\Users\arjun\Desktop\papi\playhub`.
- Brought over the latest customer/owner role separation, reference owner dashboard, court-based data model, slot generation, transactional booking lifecycle, migration, tests and architecture documentation.
- Preserved the Desktop repository's `.git` history, installed `node_modules`, local `server/.env`, MongoDB data, generated `dist` output and `work` directory.
- Installed the newly required `mongodb-memory-server` backend dependency using a project-local npm cache and excluded that cache from Git.
- Established this Desktop repository as the only project location for subsequent implementation.

### Files affected

- Root documentation and package configuration.
- `client/src` and client package/configuration files.
- `server/src`, server tests and server package/configuration files.
- `ARCHITECTURE.md` and `CHANGELOG.md`.

### Verification

- Source synchronization completed successfully without mirroring or deleting destination-only files.
- Destination Git metadata and local runtime/database files were excluded from synchronization.
- Backend dependency validation passed, including `mongodb-memory-server@11.2.0`.
- React production build passed with 50 modules transformed.
- All JavaScript files under `server/src` passed Node syntax checks.

## 2026-09-14 — Frontend/backend architecture documented

### What changed

- Added a dedicated architecture guide that separates the React frontend from the Express/MongoDB backend.
- Documented current folders, responsibilities, domain ownership, API boundaries, role access and the transactional booking flow.
- Added recommended feature folders for breaking the owner interface into understandable modules as implementation continues.
- Added recommended backend services so analytics, pricing and scheduling rules do not accumulate in controllers.
- Added development rules that keep authorization and business logic on the backend.
- Linked the architecture guide from the main project README.

### Files affected

- `ARCHITECTURE.md` — created as the central technical architecture reference.
- `README.md` — added the frontend/backend overview and architecture link.
- `CHANGELOG.md` — documented this change.

### Verification

- Confirmed all documented current paths exist in `client/src` and `server/src`.
- Confirmed the documented route groups match the Express mounts in `server/src/app.js`.
- Confirmed the frontend entry flow matches `client/src/main.jsx` and `client/src/App.jsx`.

## 2026-09-13 — Strict customer and venue-owner separation

### What changed

- Added role-aware route guards for every customer and owner page.
- Owner accounts are now sent directly to `/owner` after registration, login, session restoration or an attempt to open the customer homepage/bookings area.
- Customer and unauthenticated accounts are rejected from `/owner`; customers are returned to the player homepage even when the owner URL is entered manually.
- Changed the registration selector to clearly distinguish “I want to play” from “I own a venue,” including a description of the workspace each choice creates.
- Removed the public player header/footer whenever an owner session is active, preventing a flash or accidental display of the player navigation during redirects.
- Removed the remaining “View public site” and “View Venue” navigation controls from the owner console so owners are not offered customer-side navigation.
- Added a role-aware wildcard route so unknown URLs return each role to its own workspace.

### Files affected

- `client/src/App.jsx` — customer/owner route guards, role landing behavior and role-specific layouts.
- `client/src/components/AuthModal.jsx` — role selection and immediate post-authentication routing.
- `client/src/styles.css` — account-type selector and role-loading screen styles.
- `CHANGELOG.md` — documented this change.

### Security behavior

- Frontend guards control which interface is rendered.
- Backend owner endpoints remain protected by verified JWT role middleware and customer booking actions remain customer-only, so changing a browser URL cannot bypass authorization.

### Verification

- React production build passed with 50 modules transformed.
- A customer token attempting to access an owner dashboard API returned HTTP 403.
- An owner token attempting to use the customer slot-hold API returned HTTP 403.
- Browser QA confirmed owner login redirects to `/owner` and opening `/` returns the owner to `/owner`.
- Browser QA confirmed a customer opening `/owner` is redirected to `/` without rendering owner data.
- Diagnosed the reported live mismatch: the `owner` account was correctly stored with role `owner`, but port 5173 was still serving the older frontend process. Restarted the frontend using the latest production build and verified the affected live tab changed from `/` to `/owner`.

## 2026-09-13 — Reference-matched owner dashboard completed

### What changed

- Rebuilt the owner dashboard to match the supplied PlayHub owner reference: dark operations sidebar, selected-venue header, four daily KPI cards, time-by-court schedule matrix, recent bookings, venue summary, quick actions, booking trend, popular sports breakdown and recent customers.
- Made the venue switcher refresh all venue-scoped dashboard, court, slot and customer data.
- Added a dedicated Customers view showing only players derived from bookings at the selected owner-controlled venue.
- Expanded owner navigation to Dashboard, Bookings, Calendar, Manage Slots, Sports & Courts, Pricing, Venue Profile, Analytics and Customers while routing each control to a working management surface.
- Kept court creation multi-sport: Cricket, Football, Pickleball, Badminton, Tennis and a custom sport option, with court-specific price and slot duration.
- Updated the dashboard API to populate each slot's court so schedule cells use `court + slot` identity and can never be confused by venue/sport labels.
- Added responsive layouts for the reference dashboard and prevented nested schedule content from forcing page-level horizontal overflow.
- Restarted the API on port 5000 so the populated dashboard response is active.

### Files affected

- `client/src/pages/OwnerDashboard.jsx` — reference dashboard UI, selected-venue data loading, schedule matrix, quick actions, analytics summaries and customers view.
- `client/src/styles.css` — full reference-driven owner dashboard styling and responsive behavior.
- `server/src/controllers/ownerController.js` — venue dashboard slots now include populated court data and booking/customer context.
- `CHANGELOG.md` — documented this implementation.

### Verification

- React production build passed with 50 modules transformed.
- Owner dashboard API returned the selected venue, 2 courts, 34 current-day slots and populated `Cricket Turf 1` court data.
- Browser QA verified the owner-only sidebar, Box Cricket Co. venue data, 34 available slots, 2 court columns, recent booking and customer summaries at `http://localhost:5173/owner`.
- The API health endpoint remained available and the owner session loaded successfully.

## 2026-09-12 — Change documentation established

### What changed

- Created this development log.
- Established the requirement that every future project modification must be documented here during the same change.

### Files affected

- `CHANGELOG.md` — created.

### Reason

The user requested one Markdown file containing a record of every future change and the work performed.

### Verification

- Confirmed that `CHANGELOG.md` exists at the MERN project root.

## 2026-09-12 — Dedicated owner console, scoped analytics and venue editing

### What changed

- Replaced the customer-style owner page with a visually separate owner operations console.
- Added owner-only navigation for Overview, Bookings, Slots & calendar, and My venues.
- Added analytics cards for revenue, bookings, upcoming bookings, occupancy, booked slots and active venues.
- Added per-venue performance showing 30-day occupancy, booked slot counts and revenue.
- Added a seven-day slot calendar that identifies open slots and booked slots, including the booking customer and booking code.
- Added a complete owner venue-management interface for listing new venues and editing existing venue name, area, address, image, sports, price and active status.
- Kept slot creation in the owner console and connected it to the selected owned venue.
- Removed the public customer header and footer from `/owner`; the owner area now has its own brand treatment, sidebar, profile and logout controls.
- Added a protected owner analytics API.
- Added a protected owner slot-detail API that verifies venue ownership before returning slot or customer data.
- Restarted the API process so the new routes were loaded and rebuilt the production React client.

### Files affected

- `client/src/App.jsx` — separates public and owner layouts.
- `client/src/pages/OwnerDashboard.jsx` — rebuilt as the dedicated owner console with analytics, bookings, slot calendar, venue creation and venue editing.
- `client/src/styles.css` — added the complete responsive owner-console design system and layouts.
- `server/src/controllers/bookingController.js` — added owner-scoped 30-day analytics aggregation.
- `server/src/controllers/venueController.js` — added owner-scoped slot retrieval with associated booking/customer details.
- `server/src/routes/bookingRoutes.js` — exposed `GET /api/bookings/owner/analytics` to authenticated owners only.
- `server/src/routes/venueRoutes.js` — exposed `GET /api/venues/:id/owner-slots` to authenticated owners who own the requested venue.
- `CHANGELOG.md` — documented this change.

### Reason

Venue owners need an operational experience distinct from the player-facing website. They must see only their own turfs and related business data, understand which slots are booked, and be able to list or update their venues.

### Authorization behavior

- Venue lists use the authenticated owner ID from the verified JWT.
- Analytics queries use the authenticated owner ID and never accept an owner ID from the browser.
- Slot-calendar requests first query the venue using both its ID and the authenticated owner ID; a venue belonging to another owner returns no data.
- Customer accounts are rejected from owner analytics and owner slot APIs with HTTP 403.

### Verification

- React production build passed: 50 modules transformed successfully.
- All server JavaScript files passed Node syntax validation.
- Authenticated owner test returned exactly 4 owned venues.
- Analytics returned exactly the same 4 owner-scoped venues.
- Seven-day owner calendar returned 35 slots for the selected owned venue.
- Customer access to owner analytics was rejected with HTTP 403.
- Running frontend returned HTTP 200 at `http://localhost:5173/`.
- Updated API remained available at `http://localhost:5000/`.

## 2026-09-13 — Court domain foundation and transactional booking lifecycle

### What changed

- Introduced the explicit production hierarchy `Owner → Venue → Court → Slot → Booking`.
- Added first-class courts with a venue reference, unique venue/name constraint, preset or custom sport type, default price, slot duration, active state and seven-day weekly schedule.
- Added slot states `AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`, `MAINTENANCE` and `EXPIRED`.
- Added booking states `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `PAYMENT_FAILED`, `EXPIRED` and `REFUNDED`.
- Added five-minute slot holds and automatic expired-hold cleanup every minute.
- Changed customer booking to a two-step hold and confirmation flow executed using MongoDB transactions.
- Added a compound unique index on `(court, startTime)` and supporting venue, court, status and time indexes.
- Added cancellation metadata (`cancelledAt`, `cancelledBy`, and `cancellationReason`) without deleting booking history.
- Added audit-log and notification models plus audit events for court creation/update, schedule changes, price changes, slot state changes, venue creation/update, booking confirmation and cancellation.
- Added an in-app booking-confirmed notification foundation for venue owners.
- Added idempotent 30-day slot generation on court creation and schedule changes, plus a daily refresh job.
- Schedule changes preserve booked/held slots and mark generated, future, unbooked slots outside the new schedule as blocked.
- Added `admin` as an authorization role without allowing public admin registration.
- Switched the local MongoDB development runtime to a persistent single-node replica set on port 27018 so transactions are supported.
- Added a repeatable migration that creates courts from existing venue sports, attaches legacy slots/bookings to courts, translates lifecycle states and replaces legacy indexes.
- Updated seed data to create four venues, seven named courts, 3,570 court-specific slots, owner/customer/admin demo accounts and a sample confirmed court booking.
- Added “Sports & courts” to the owner console with venue selection, preset/custom sport creation, court name, price, slot duration, active/paused control and future-slot price propagation.
- Updated the owner slot calendar to display the specific court and all new slot states.
- Updated one-off slot creation to require a specific court.
- Updated the customer slot picker to show court names and use transactional hold/confirm APIs.
- Updated customer booking history for court names, uppercase lifecycle states and cancellation reasons.

### Public API additions and changes

- `GET /api/owner/venues/:venueId/courts` — list courts after verifying venue ownership.
- `POST /api/owner/venues/:venueId/courts` — create a court and generate 30 days of slots.
- `PATCH /api/owner/courts/:courtId` — update court settings; optionally propagate price to future available slots.
- `PUT /api/owner/courts/:courtId/schedule` — replace the weekly schedule and regenerate slots idempotently.
- `GET /api/owner/venues/:venueId/slots` — retrieve owner-visible slots with court and active-booking details.
- `POST /api/owner/slots/:slotId/block|unblock|maintenance|available` — perform validated slot state changes.
- `GET /api/owner/venues/:venueId/dashboard` — retrieve selected-venue daily metrics, courts, slots and recent bookings.
- `GET /api/owner/venues/:venueId/bookings` — retrieve venue-scoped bookings with optional status/court filters.
- `GET /api/owner/venues/:venueId/customers` — retrieve tenant-scoped customer summaries.
- `POST /api/bookings/hold` — atomically hold an available slot for five minutes and create a pending booking.
- `POST /api/bookings/:id/confirm` — transactionally confirm payment and convert the held slot to booked.
- `POST /api/bookings/:id/payment-failed` — fail a pending payment and release its slot.
- `PATCH /api/bookings/:id/cancel` — retain the booking record, cancellation actor, timestamp and reason while reopening a future slot.

### Files affected

- Server models: `Court.js`, `Slot.js`, `Booking.js`, `User.js`, `AuditLog.js`, and `Notification.js`.
- Server services: `slotGenerationService.js`, `auditService.js`, and `notificationService.js`.
- Server API: `ownerController.js`, `bookingController.js`, `venueController.js`, `ownerRoutes.js`, `bookingRoutes.js`, `app.js`, and `server.js`.
- Data tooling: `migrate-courts.js`, `seed.js`, `server/package.json`, database configuration and environment examples.
- Client: `OwnerDashboard.jsx`, `BookingModal.jsx`, `MyBookings.jsx`, and `styles.css`.
- Tests: `tests/booking-race.mjs`.
- Documentation: `README.md` and `CHANGELOG.md`.

### Security and business rules implemented

- Every owner endpoint derives the actor from the verified JWT and independently verifies the requested venue/court relationship.
- Customer accounts receive HTTP 403 from owner routes.
- A slot is identified by a court and start time; venue, sport and time are not used as booking identity.
- A booked or held slot cannot be changed to blocked or maintenance.
- Confirmation appears in the client only after the backend transaction completes.
- Price propagation affects only future `AVAILABLE` slots; existing bookings are unchanged.

### Migration result

- Migrated 4 existing venues.
- Created 6 courts from legacy sport labels.
- Attached 140 legacy slots to courts.
- No legacy bookings required conversion in the previous local dataset.
- Created a fresh transaction-capable development seed with 4 venues, 7 courts and 3,570 slots.

### Verification

- Server and integration-test JavaScript passed Node syntax validation.
- React production build passed with 50 modules transformed.
- Owner authentication returned 4 owned venues and 2 distinct courts for the tested venue.
- Public search returned 34 court-specific slots for the tested date.
- A real hold/confirm transaction ended in `CONFIRMED` and returned the correct court name.
- Customer access to the owner court API returned HTTP 403.
- Twenty concurrent hold requests for one slot produced exactly one success; the test then released the hold through the payment-failed transition.
- Running the same weekly schedule generation twice left the slot count unchanged at 510, confirming idempotency.
- Slot block and unblock transitions returned `BLOCKED` and `AVAILABLE` respectively.
- Attempting to block an already booked slot returned HTTP 409.

### Remaining work in the approved owner-console specification

- Build the visual weekly-schedule editor and interactive calendar state controls on top of the completed APIs.
- Move all owner dashboard panels to selected-venue query contracts and add the full reference-style schedule matrix.
- Add dedicated pricing, analytics and customer screens using the new court-scoped data.
- Expose in-app notifications in the owner header and add read/unread APIs.
- Add automated unit, authorization, migration and browser E2E suites beyond the implemented concurrency integration test.
