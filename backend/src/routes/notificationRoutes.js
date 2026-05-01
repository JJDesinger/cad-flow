const router = require('express').Router();
const { checkDeadlines } = require('../services/notificationService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Manually trigger deadline alerts — intended to be called by a cron job or admin
// e.g. daily at 08:00: POST /api/notifications/deadline-check?days_ahead=3
router.post(
  '/deadline-check',
  authorize('admin', 'manager'),
  async (req, res) => {
    const daysAhead = parseInt(req.query.days_ahead) || 3;
    const results   = await checkDeadlines(daysAhead);
    res.json({ alerts_sent: results.length, detail: results });
  }
);

// List notifications for the authenticated user
router.get('/mine', async (req, res) => {
  const db = require('../config/db');
  const { rows } = await db.query(
    `SELECT n.id, n.type, n.status, n.sent_at, n.created_at,
            a.project, a.document_number
     FROM notifications n
     LEFT JOIN activities a ON a.id = n.activity_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
