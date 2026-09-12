# PlayHub MERN

Full-stack sports venue booking for Surat with customer and venue-owner roles.

## Run locally

1. Install MongoDB locally or create a MongoDB Atlas database.
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and `JWT_SECRET`.
3. Run `npm install`, then `npm run install:all` from this folder.
4. Optionally run `npm run seed` for demo data.
5. Run `npm run dev` and open `http://localhost:5173`.

Demo accounts after seeding:

- Customer: `player@playhub.in` / `Player@123`
- Owner: `owner@playhub.in` / `Owner@123`

The API runs on port 5000. Owner booking queries are scoped on the server to venues whose `owner` equals the authenticated user's MongoDB id.
