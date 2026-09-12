import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

const app = express();
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes); app.use('/api/venues', venueRoutes); app.use('/api/bookings', bookingRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); if (err.code === 11000) return res.status(409).json({ message: 'That record already exists' }); res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.name === 'ValidationError' ? err.message : 'Something went wrong' }); });
export default app;
