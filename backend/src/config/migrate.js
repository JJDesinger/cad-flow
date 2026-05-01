require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('./db');

const schema = `
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'designer', 'verifier', 'planner');
  CREATE TYPE activity_status AS ENUM ('requested', 'in_progress', 'verification', 'approved', 'completed', 'hold');
  CREATE TYPE product_line AS ENUM ('flow_control', 'well_control');
  CREATE TYPE verification_result AS ENUM ('approved', 'rejected');
  CREATE TYPE error_code AS ENUM ('E01', 'E02', 'E03', 'E04', 'E99');

  CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        user_role[]  NOT NULL DEFAULT '{designer}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS activities (
    id                   SERIAL PRIMARY KEY,
    document_number      VARCHAR(100),
    product_line         product_line NOT NULL,
    project              VARCHAR(200) NOT NULL,
    equipment            VARCHAR(200),
    component            VARCHAR(200),
    document_type        VARCHAR(100) NOT NULL,
    document_code        VARCHAR(100),
    status               activity_status NOT NULL DEFAULT 'requested',
    executor_id          INTEGER REFERENCES users(id),
    verifier_id          INTEGER REFERENCES users(id),
    approver_id          INTEGER REFERENCES users(id),
    created_by           INTEGER NOT NULL REFERENCES users(id),
    file_link            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS activity_dates (
    id                             SERIAL PRIMARY KEY,
    activity_id                    INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    planned_start_date             DATE,
    actual_start_date              DATE,
    planned_verification_date      DATE,
    actual_verification_date       DATE,
    planned_completion_date        DATE,
    actual_completion_date         DATE
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id              SERIAL PRIMARY KEY,
    activity_id     INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    previous_status activity_status,
    new_status      activity_status NOT NULL,
    changed_by      INTEGER NOT NULL REFERENCES users(id),
    notes           TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id              SERIAL PRIMARY KEY,
    activity_id     INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    verifier_id     INTEGER NOT NULL REFERENCES users(id),
    iteration       INTEGER NOT NULL DEFAULT 1,
    result          verification_result NOT NULL,
    error_code      error_code,
    notes           TEXT,
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id     INTEGER REFERENCES activities(id) ON DELETE SET NULL,
    type            VARCHAR(100) NOT NULL,
    sent_at         TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  CREATE TRIGGER activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(schema);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

migrate();
