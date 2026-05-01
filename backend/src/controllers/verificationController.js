const { validationResult } = require('express-validator');
const Activity = require('../models/activity');
const Notification = require('../services/notificationService');

const VALID_ERROR_CODES = ['E01', 'E02', 'E03', 'E04', 'E99'];

async function submitVerification(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const activity = await Activity.findById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  if (activity.status !== 'verification') {
    return res.status(422).json({ error: 'Activity is not in verification status' });
  }

  const { result, error_code, notes } = req.body;

  if (result === 'rejected' && !error_code) {
    return res.status(400).json({ error: 'error_code is required when rejecting' });
  }

  if (error_code && !VALID_ERROR_CODES.includes(error_code)) {
    return res.status(400).json({ error: `error_code must be one of: ${VALID_ERROR_CODES.join(', ')}` });
  }

  const verification = await Activity.addVerification(
    activity.id,
    req.user.id,
    result,
    error_code ?? null,
    notes ?? null
  );

  // move activity to the resulting status
  const nextStatus = result === 'approved' ? 'approved' : 'in_progress';
  const statusNote = result === 'approved'
    ? `Approved on iteration ${verification.iteration}`
    : `Rejected on iteration ${verification.iteration} — ${error_code}: ${notes ?? ''}`;

  const updated = await Activity.changeStatus(activity.id, nextStatus, req.user.id, statusNote);

  Notification.onVerificationResult(updated, verification, req.user.id);
  Notification.onStatusChange(updated, nextStatus, req.user.id);

  res.status(201).json({ verification, activity: updated });
}

async function listVerifications(req, res) {
  const activity = await Activity.findById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const verifications = await Activity.getVerifications(activity.id);
  res.json(verifications);
}

module.exports = { submitVerification, listVerifications };
