import jwt from 'jsonwebtoken';
export const createToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
