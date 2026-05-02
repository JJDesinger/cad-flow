const router = require('express').Router();
const { body } = require('express-validator');
const { login, me, changePassword, windowsAutoLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

router.post('/windows-login', windowsAutoLogin);

router.get('/me', authenticate, me);

router.patch(
  '/me/password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }),
  ],
  changePassword
);

module.exports = router;
