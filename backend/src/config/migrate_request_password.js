require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('./db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Adding password_hash to access_requests...');
    await client.query(`
      ALTER TABLE access_requests
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);
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
