const { validationResult } = require('express-validator');
const User = require('../models/user');

async function listUsers(req, res) {
  const { page, limit, search } = req.query;
  const users = await User.list({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    search: search || '',
  });
  res.json(users);
}

async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const user = await User.create({ name, email, password, role });
  res.status(201).json(user);
}

async function updateUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { password, ...fields } = req.body;

  const user = await User.update(req.params.id, fields);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (password && password.trim().length >= 8) {
    await User.updatePassword(req.params.id, password);
  }

  res.json(user);
}

async function deactivateUser(req, res) {
  const user = await User.update(req.params.id, { is_active: false });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deactivated', user });
}

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser };
