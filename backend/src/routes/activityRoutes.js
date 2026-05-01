const router = require('express').Router();
const { body, query } = require('express-validator');
const {
  listActivities, getActivity, createActivity, updateActivity, changeStatus, getHistory,
} = require('../controllers/activityController');
const { submitVerification, listVerifications } = require('../controllers/verificationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const VALID_STATUSES = ['requested', 'in_progress', 'verification', 'approved', 'completed', 'hold'];
const VALID_LINES    = ['flow_control', 'well_control'];

router.use(authenticate);

router.get('/', listActivities);

router.get('/:id', getActivity);

router.post(
  '/',
  authorize('admin', 'manager', 'planner'),
  [
    body('product_line').isIn(VALID_LINES),
    body('project').trim().notEmpty(),
    body('document_type').trim().notEmpty(),
    body('document_number').optional().trim(),
    body('equipment').optional().trim(),
    body('component').optional().trim(),
    body('document_code').optional().trim(),
    body('file_link').optional().isURL(),
    body('executor_id').optional().isInt(),
    body('verifier_id').optional().isInt(),
    body('approver_id').optional().isInt(),
    body('planned_start_date').optional().isISO8601(),
    body('planned_verification_date').optional().isISO8601(),
    body('planned_completion_date').optional().isISO8601(),
  ],
  createActivity
);

router.patch(
  '/:id',
  authorize('admin', 'manager', 'planner'),
  [
    body('product_line').optional().isIn(VALID_LINES),
    body('project').optional().trim().notEmpty(),
    body('document_type').optional().trim().notEmpty(),
    body('document_number').optional().trim(),
    body('file_link').optional().isURL(),
    body('executor_id').optional().isInt(),
    body('verifier_id').optional().isInt(),
    body('approver_id').optional().isInt(),
  ],
  updateActivity
);

router.patch(
  '/:id/status',
  [
    body('new_status').isIn(VALID_STATUSES),
    body('notes').optional().isString(),
  ],
  changeStatus
);

router.get('/:id/history', getHistory);

router.get('/:id/verifications', listVerifications);

router.post(
  '/:id/verifications',
  authorize('admin', 'manager', 'verifier'),
  [
    body('result').isIn(['approved', 'rejected']),
    body('error_code').optional().isIn(['E01', 'E02', 'E03', 'E04', 'E99']),
    body('notes').optional().isString(),
  ],
  submitVerification
);

module.exports = router;
