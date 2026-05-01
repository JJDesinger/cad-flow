const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, roles: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findByEmail(email);

  if (!user || !(await User.verifyPassword(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, roles: user.role },
  });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { current_password, new_password } = req.body;
  const user = await User.findByEmail(req.user.email);

  if (!user || !(await User.verifyPassword(current_password, user.password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  await User.updatePassword(req.user.id, new_password);
  res.json({ message: 'Password updated successfully' });
}

module.exports = { login, me, changePassword };
