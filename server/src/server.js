import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { refreshAllCourtSlots, releaseExpiredHolds } from './services/slotGenerationService.js';
const port = process.env.PORT || 5000;
if ((!process.env.MONGO_URI && process.env.USE_LOCAL_MONGO !== 'true') || !process.env.JWT_SECRET) { console.error('Set JWT_SECRET and either MONGO_URI or USE_LOCAL_MONGO=true in .env.'); process.exit(1); }
connectDB().then(() => {
  refreshAllCourtSlots().catch(console.error);
  setInterval(() => releaseExpiredHolds().catch(console.error), 60000).unref();
  setInterval(() => refreshAllCourtSlots().catch(console.error), 86400000).unref();
  app.listen(port, () => console.log(`PlayHub API running on http://localhost:${port}`));
}).catch(error => { console.error(error); process.exit(1); });
