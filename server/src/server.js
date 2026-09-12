import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
const port = process.env.PORT || 5000;
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) { console.error('MONGO_URI and JWT_SECRET are required. Copy .env.example to .env.'); process.exit(1); }
connectDB().then(() => app.listen(port, () => console.log(`PlayHub API running on http://localhost:${port}`))).catch(error => { console.error(error); process.exit(1); });
