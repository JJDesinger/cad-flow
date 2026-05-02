require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('./db');

const sql = `
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS windows_username VARCHAR(100) UNIQUE;
`;

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Adding windows_username column...');
    await client.query(sql);
    console.log('Migration completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

migrate();
