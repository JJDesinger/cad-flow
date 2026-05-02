const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const User = require('../models/user');
const email = require('../services/emailService');

const SALT_ROUNDS = 12;

async function getAdminEmails() {
  const { rows } = await db.query(
    `SELECT email FROM users WHERE is_active = TRUE AND 'admin' = ANY(role)`
  );
  return rows.map((r) => r.email);
}

// ── public endpoints ──────────────────────────────────────────────────────────

async function createRequest(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email: userEmail, type, password } = req.body;

  if (type === 'first_access') {
    const existing = await User.findByEmail(userEmail);
    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado no sistema.' });
  }

  const duplicate = await db.query(
    `SELECT id FROM access_requests WHERE email = $1 AND type = $2 AND status = 'pending'`,
    [userEmail, type]
  );
  if (duplicate.rows.length > 0) {
    return res.status(409).json({ error: 'Já existe uma solicitação pendente para este e-mail.' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO access_requests (name, email, type, password_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name ?? null, userEmail, type, password_hash]
  );
  const request = rows[0];

  const admins = await getAdminEmails();
  if (admins.length > 0) {
    const tpl = email.requestTemplates(request);
    await email.send({ to: admins.join(','), ...tpl.admin_notification });
  }

  res.status(201).json({ message: 'Solicitação enviada. O administrador será notificado.' });
}

// ── admin endpoints ───────────────────────────────────────────────────────────

async function listRequests(req, res) {
  const { status = 'pending' } = req.query;
  const { rows } = await db.query(
    `SELECT r.*, u.name AS processed_by_name
     FROM access_requests r
     LEFT JOIN users u ON u.id = r.processed_by
     WHERE ($1 = 'all' OR r.status = $1::request_status)
     ORDER BY r.created_at DESC`,
    [status]
  );
  res.json(rows);
}

async function processRequest(req, res) {
  const { id } = req.params;
  const { action, notes, role } = req.body;

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Ação inválida. Use "approved" ou "rejected".' });
  }

  const { rows } = await db.query(
    `SELECT * FROM access_requests WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Solicitação não encontrada.' });
  const request = rows[0];

  if (request.status !== 'pending') {
    return res.status(409).json({ error: 'Solicitação já foi processada.' });
  }

  await db.query(
    `UPDATE access_requests
     SET status = $1, notes = $2, processed_by = $3, processed_at = NOW()
     WHERE id = $4`,
    [action, notes ?? null, req.user.id, id]
  );

  if (action === 'approved') {
    if (!request.password_hash) {
      return res.status(422).json({ error: 'Solicitação sem senha definida. Peça ao usuário para reenviar.' });
    }

    if (request.type === 'first_access') {
      await User.createWithHash({
        name: request.name,
        email: request.email,
        passwordHash: request.password_hash,
        role: role ?? ['designer'],
      });
    } else {
      const user = await User.findByEmail(request.email);
      if (user) await User.setPasswordHash(user.id, request.password_hash);
    }

    console.log(`[acesso] Aprovado — tipo: ${request.type} | email: ${request.email}`);

    const tpl = email.requestTemplates(request);
    await email.send({ to: request.email, ...tpl.user_approved(request.type) });
  } else {
    const tpl = email.requestTemplates(request);
    await email.send({ to: request.email, ...tpl.user_rejected(notes) });
  }

  res.json({ message: 'Solicitação processada com sucesso.' });
}

module.exports = { createRequest, listRequests, processRequest };
