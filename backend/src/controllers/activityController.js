const { validationResult } = require('express-validator');
const Activity = require('../models/activity');
const { validateTransition } = require('../services/statusService');
const Notification = require('../services/notificationService');

async function listActivities(req, res) {
  const { status, product_line, project, executor_id, verifier_id, date_from, date_to, page, limit } = req.query;
  const userRoles = req.user.roles;

  const filters = { status, product_line, project, date_from, date_to, page, limit };

  // designers and verifiers only see their own activities
  if (userRoles.includes('designer') && !userRoles.some((r) => ['admin', 'manager', 'planner'].includes(r))) {
    filters.executor_id = req.user.id;
  } else if (userRoles.includes('verifier') && !userRoles.some((r) => ['admin', 'manager', 'planner'].includes(r))) {
    filters.verifier_id = req.user.id;
  } else {
    if (executor_id) filters.executor_id = executor_id;
    if (verifier_id) filters.verifier_id = verifier_id;
  }

  const activities = await Activity.list(filters);
  res.json(activities);
}

async function getActivity(req, res) {
  const activity = await Activity.findById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const [history, verifications] = await Promise.all([
    Activity.getHistory(activity.id),
    Activity.getVerifications(activity.id),
  ]);

  res.json({ ...activity, history, verifications });
}

async function createActivity(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const activity = await Activity.create({ ...req.body, created_by: req.user.id });

  if (activity.executor_id) {
    Notification.onAssignment(activity, activity.executor_id, null);
  }

  res.status(201).json(activity);
}

async function updateActivity(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const existing = await Activity.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });

  const activity = await Activity.update(req.params.id, req.body);

  if (req.body.dates) {
    await Activity.updateDates(req.params.id, req.body.dates);
  }

  // notify if executor or verifier was changed
  const executorChanged  = req.body.executor_id  && req.body.executor_id  !== existing.executor_id;
  const verifierChanged  = req.body.verifier_id  && req.body.verifier_id  !== existing.verifier_id;
  if (executorChanged || verifierChanged) {
    Notification.onAssignment(
      activity,
      executorChanged ? req.body.executor_id : null,
      verifierChanged ? req.body.verifier_id : null
    );
  }

  res.json(activity);
}

async function changeStatus(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { new_status, notes } = req.body;
  const activity = await Activity.findById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const check = validateTransition(activity, new_status, req.user.roles);
  if (!check.ok) return res.status(422).json({ error: check.error });

  const updated = await Activity.changeStatus(activity.id, new_status, req.user.id, notes);
  Notification.onStatusChange(updated, new_status, req.user.id, { notes });
  res.json(updated);
}

async function getHistory(req, res) {
  const activity = await Activity.findById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const history = await Activity.getHistory(activity.id);
  res.json(history);
}

module.exports = { listActivities, getActivity, createActivity, updateActivity, changeStatus, getHistory };
