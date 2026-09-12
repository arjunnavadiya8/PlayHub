import User from '../models/User.js';
import { createToken } from '../utils/token.js';

const publicUser = user => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role });

export async function register(req, res, next) {
  try {
    const { name, email, phone, password, role = 'customer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({ name, email, phone, password, role: role === 'owner' ? 'owner' : 'customer' });
    res.status(201).json({ token: createToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) return res.status(401).json({ message: 'Incorrect email or password' });
    res.json({ token: createToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
}
export const me = (req, res) => res.json({ user: publicUser(req.user) });
