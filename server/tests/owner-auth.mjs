import mongoose from 'mongoose';
import User from '../src/models/User.js';

const api = process.env.API_URL || 'http://localhost:5000/api';
const email = `owner-auth-${Date.now()}@playhub.test`;
const password = 'OwnerTest123';
const request = async (path, body) => {
  const response = await fetch(`${api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
};

try {
  const registration = await request('/auth/owner/register', { name: 'Owner Auth Test', phone: '9000000000', email, password });
  if (registration.status !== 201 || registration.body.user?.role !== 'owner') throw new Error(`Owner registration failed: ${registration.status}`);

  const ownerLogin = await request('/auth/owner/login', { email, password });
  if (ownerLogin.status !== 200 || ownerLogin.body.user?.role !== 'owner') throw new Error(`Owner login failed: ${ownerLogin.status}`);

  const customerLogin = await request('/auth/login', { email, password });
  if (customerLogin.status !== 403) throw new Error(`Customer login accepted an owner: ${customerLogin.status}`);

  console.log('Owner signup/login passed; customer login correctly rejected the owner account.');
} finally {
  await mongoose.connect('mongodb://127.0.0.1:27018/playhub?directConnection=true');
  await User.deleteOne({ email });
  await mongoose.disconnect();
}
