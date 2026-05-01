require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/user');
const db = require('./db');

async function seed() {
  console.log('Seeding database...');

  const existing = await User.findByEmail('admin@cadflow.local');
  if (existing) {
    console.log('Admin user already exists, skipping seed.');
    await db.pool.end();
    return;
  }

  const admin = await User.create({
    name: 'Administrator',
    email: 'admin@cadflow.local',
    password: 'Admin@1234',
    role: ['admin'],
  });

  console.log('Admin user created:', admin.email);
  console.log('Default password: Admin@1234 — change after first login!');
  await db.pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
