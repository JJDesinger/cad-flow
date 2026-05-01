const router = require('express').Router();
const { body } = require('express-validator');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const VALID_ROLES = ['admin', 'manager', 'designer', 'verifier', 'planner'];

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), listUsers);
router.get('/:id', authorize('admin', 'manager'), getUser);

router.post(
  '/',
  authorize('admin', 'manager'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isArray().custom((roles) =>
      roles.every((r) => VALID_ROLES.includes(r))
    ),
  ],
  createUser
);

router.patch(
  '/:id',
  authorize('admin', 'manager'),
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isArray().custom((roles) =>
      roles.every((r) => VALID_ROLES.includes(r))
    ),
  ],
  updateUser
);

router.delete('/:id', authorize('admin'), deactivateUser);

module.exports = router;
