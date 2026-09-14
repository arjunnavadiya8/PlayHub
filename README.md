# PlayHub MERN

Full-stack sports venue booking for Surat with customer and venue-owner roles.

## Project structure

The project is deliberately separated into two applications:

- `client/` — React frontend and role-specific user interfaces.
- `server/` — Express API, authentication, business rules and MongoDB persistence.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete folder map, domain hierarchy, API boundaries, role permissions and booking flow.

## Run locally

1. For local development, set `USE_LOCAL_MONGO=true` in `server/.env`; a single-node replica set runs on port 27018 and persists under `server/data/mongodb-rs`. For production, use a replica-set MongoDB Atlas `MONGO_URI` instead.
2. Copy `server/.env.example` to `server/.env` and set a strong `JWT_SECRET`.
3. Run `npm install`, then `npm run install:all` from this folder.
4. Optionally run `npm run seed` for demo data.
5. Run `npm run dev` and open `http://localhost:5173`.

Demo accounts after seeding:

- Customer: `player@playhub.in` / `Player@123`
- Owner: `owner@playhub.in` / `Owner@123`

The API runs on port 5000. Owner booking queries are scoped on the server to venues whose `owner` equals the authenticated user's MongoDB id.
