const Dashboard = require('../models/dashboard');

function extractFilters(query) {
  const { product_line, project, executor_id, verifier_id, date_from, date_to } = query;
  return { product_line, project, executor_id, verifier_id, date_from, date_to };
}

// Full KPI summary — one call for the main dashboard
async function getKPIs(req, res) {
  const filters = extractFilters(req.query);

  const [otd, quality, volume, errorClassification] = await Promise.all([
    Dashboard.getOTD(filters),
    Dashboard.getQualityRate(filters),
    Dashboard.getVolume(filters),
    Dashboard.getErrorClassification(filters),
  ]);

  res.json({ otd, quality, volume, error_classification: errorClassification });
}

// Workload per executor — for planners
async function getWorkload(req, res) {
  const filters = extractFilters(req.query);
  const workload = await Dashboard.getWorkload(filters);
  res.json(workload);
}

// Overdue activities
async function getOverdue(req, res) {
  const filters = extractFilters(req.query);
  const overdue = await Dashboard.getOverdue(filters);
  res.json(overdue);
}

// Verification queue — for verifiers
async function getVerificationQueue(req, res) {
  const filters = extractFilters(req.query);

  // verifiers without manager/admin role only see their own queue
  const userRoles = req.user.roles;
  if (
    userRoles.includes('verifier') &&
    !userRoles.some((r) => ['admin', 'manager', 'planner'].includes(r))
  ) {
    filters.verifier_id = req.user.id;
  }

  const queue = await Dashboard.getVerificationQueue(filters);
  res.json(queue);
}

// Unassigned activities — for planners
async function getUnassigned(req, res) {
  const filters = extractFilters(req.query);
  const unassigned = await Dashboard.getUnassigned(filters);
  res.json(unassigned);
}

// My activities summary — for designers (own queue view)
async function getMySummary(req, res) {
  const filters = { ...extractFilters(req.query), executor_id: req.user.id };

  const [volume, overdue] = await Promise.all([
    Dashboard.getVolume(filters),
    Dashboard.getOverdue(filters),
  ]);

  res.json({ volume, overdue });
}

module.exports = { getKPIs, getWorkload, getOverdue, getVerificationQueue, getUnassigned, getMySummary };
