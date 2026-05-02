const db = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// pg returns PostgreSQL arrays as strings like "{admin,designer}"; parse to JS array
function parseRoles(user) {
  if (!user) return null;
  if (typeof user.role === 'string') {
    user.role = user.role.replace(/^\{|\}$/g, '').split(',').filter(Boolean);
  }
  return user;
}

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );
  return parseRoles(rows[0] ?? null);
}

async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, name, email, role, windows_username, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return parseRoles(rows[0] ?? null);
}

async function create({ name, email, password, role, windows_username }) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, role, windows_username)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, windows_username, is_active, created_at`,
    [name, email, password_hash, role, windows_username ?? null]
  );
  return parseRoles(rows[0]);
}

async function update(id, fields) {
  const allowed = ['name', 'email', 'role', 'is_active', 'windows_username'];
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${updates.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) return null;

  values.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, email, role, windows_username, is_active, created_at`,
    values
  );
  return parseRoles(rows[0] ?? null);
}

async function updatePassword(id, newPassword) {
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.query('UPDATE users SET password = $1 WHERE id = $2', [password_hash, id]);
}

async function setPasswordHash(id, hash) {
  await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, id]);
}

async function createWithHash({ name, email, passwordHash, role, windows_username }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, role, windows_username)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, windows_username, is_active, created_at`,
    [name, email, passwordHash, role, windows_username ?? null]
  );
  return parseRoles(rows[0]);
}

async function list({ page = 1, limit = 50, search = '' } = {}) {
  const offset = (page - 1) * limit;
  const pattern = `%${search}%`;
  const { rows } = await db.query(
    `SELECT id, name, email, role, windows_username, is_active, created_at
     FROM users
     WHERE (name ILIKE $1 OR email ILIKE $1)
     ORDER BY name
     LIMIT $2 OFFSET $3`,
    [pattern, limit, offset]
  );
  return rows.map(parseRoles);
}

async function findByWindowsUsername(windowsUsername) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE windows_username = $1 AND is_active = TRUE',
    [windowsUsername.toLowerCase()]
  );
  return parseRoles(rows[0] ?? null);
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

module.exports = { findByEmail, findById, findByWindowsUsername, create, createWithHash, update, updatePassword, setPasswordHash, list, verifyPassword };
