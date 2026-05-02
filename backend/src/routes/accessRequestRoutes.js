const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { createRequest, listRequests, processRequest } = require('../controllers/accessRequestController');

// public — anyone can submit
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('type').isIn(['first_access', 'password_reset']),
    body('name').if(body('type').equals('first_access')).notEmpty().withMessage('Nome é obrigatório para primeiro acesso.'),
    body('password').isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres.'),
  ],
  createRequest
);

// admin only
router.get('/', authenticate, authorize(['admin']), listRequests);
router.patch('/:id', authenticate, authorize(['admin']), processRequest);

module.exports = router;
