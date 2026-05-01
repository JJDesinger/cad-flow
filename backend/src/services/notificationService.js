const db = require('../config/db');
const { send, templates } = require('./emailService');

async function getUserEmail(userId) {
  if (!userId) return null;
  const { rows } = await db.query('SELECT name, email FROM users WHERE id = $1 AND is_active = TRUE', [userId]);
  return rows[0] ?? null;
}

async function logNotification(userId, activityId, type, status) {
  await db.query(
    `INSERT INTO notifications (user_id, activity_id, type, sent_at, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, activityId, type, status === 'sent' ? new Date() : null, status]
  );
}

async function dispatch(type, activity, recipientId, extra = {}) {
  const recipient = await getUserEmail(recipientId);
  if (!recipient) return;

  const tmpl = templates(activity, { ...extra, recipientName: recipient.name })[type];
  if (!tmpl) return;

  try {
    await send({ to: recipient.email, subject: tmpl.subject, html: tmpl.html });
    await logNotification(recipientId, activity.id, type, 'sent');
  } catch (err) {
    console.error(`[notification] Failed to send ${type} to ${recipient.email}:`, err.message);
    await logNotification(recipientId, activity.id, type, 'failed');
  }
}

// Called after a status change — fires notifications asynchronously (non-blocking)
function onStatusChange(activity, newStatus, changedById, extra = {}) {
  setImmediate(async () => {
    try {
      const changedBy = await getUserEmail(changedById);
      const changedByName = changedBy?.name ?? '—';
      const ctx = { ...extra, changedByName };

      if (newStatus === 'in_progress' && activity.executor_id) {
        await dispatch('activity_assigned', activity, activity.executor_id, {
          ...ctx,
          plannedDate: activity.dates?.planned_completion_date ?? 'Não definido',
        });
      }

      if (newStatus === 'verification' && activity.verifier_id) {
        const executor = await getUserEmail(activity.executor_id);
        await dispatch('verification_requested', activity, activity.verifier_id, {
          ...ctx,
          executorName: executor?.name ?? '—',
        });
      }

      if (newStatus === 'hold') {
        const targets = [activity.executor_id, activity.verifier_id].filter(Boolean);
        for (const id of targets) {
          await dispatch('activity_hold', activity, id, ctx);
        }
      }

      if (newStatus === 'approved') {
        if (activity.executor_id) await dispatch('verification_approved', activity, activity.executor_id, ctx);
        if (activity.approver_id) await dispatch('verification_approved', activity, activity.approver_id, ctx);
      }
    } catch (err) {
      console.error('[notification] onStatusChange error:', err.message);
    }
  });
}

// Called after a verification result is submitted
function onVerificationResult(activity, verification, changedById) {
  setImmediate(async () => {
    try {
      if (verification.result === 'rejected' && activity.executor_id) {
        await dispatch('verification_rejected', activity, activity.executor_id, {
          errorCode: verification.error_code,
          notes:     verification.notes,
        });
      }
    } catch (err) {
      console.error('[notification] onVerificationResult error:', err.message);
    }
  });
}

// Called when executor/verifier is assigned or changes
function onAssignment(activity, newExecutorId, newVerifierId) {
  setImmediate(async () => {
    try {
      if (newExecutorId) {
        await dispatch('activity_assigned', activity, newExecutorId, {
          plannedDate: activity.dates?.planned_completion_date ?? 'Não definido',
        });
      }
      if (newVerifierId && activity.status === 'verification') {
        const executor = await getUserEmail(activity.executor_id);
        await dispatch('verification_requested', activity, newVerifierId, {
          executorName: executor?.name ?? '—',
        });
      }
    } catch (err) {
      console.error('[notification] onAssignment error:', err.message);
    }
  });
}

// Checks all active activities for approaching deadlines and fires alerts
// Call this from a cron job or the /api/notifications/deadline-check endpoint
async function checkDeadlines(daysAhead = 3) {
  const today = new Date().toISOString().split('T')[0];
  const limit = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];

  const { rows } = await db.query(
    `SELECT
       a.*,
       u.name AS executor_name,
       row_to_json(d) AS dates
     FROM activities a
     JOIN activity_dates d ON d.activity_id = a.id
     LEFT JOIN users u ON u.id = a.executor_id
     WHERE a.status NOT IN ('completed', 'requested')
       AND d.planned_completion_date BETWEEN $1 AND $2
       AND d.actual_completion_date IS NULL`,
    [today, limit]
  );

  const results = [];
  for (const activity of rows) {
    if (!activity.executor_id) continue;

    const planned   = activity.dates?.planned_completion_date;
    const daysLeft  = Math.ceil((new Date(planned) - new Date(today)) / 86400000);

    await dispatch('deadline_approaching', activity, activity.executor_id, {
      plannedDate: planned,
      daysLeft,
    });
    results.push({ activity_id: activity.id, executor_id: activity.executor_id, daysLeft });
  }

  return results;
}

module.exports = { onStatusChange, onVerificationResult, onAssignment, checkDeadlines };
