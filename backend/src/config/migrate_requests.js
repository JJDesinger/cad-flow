require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('./db');

const sql = `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
      CREATE TYPE request_type AS ENUM ('first_access', 'password_reset');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
      CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
  END $$;

  CREATE TABLE IF NOT EXISTS access_requests (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150),
    email         VARCHAR(255) NOT NULL,
    type          request_type    NOT NULL,
    status        request_status  NOT NULL DEFAULT 'pending',
    notes         TEXT,
    processed_by  INTEGER REFERENCES users(id),
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Running access_requests migration...');
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
