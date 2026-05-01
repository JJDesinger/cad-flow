const db = require('../config/db');

function buildFilters(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.product_line) {
    conditions.push(`a.product_line = $${idx++}`);
    values.push(filters.product_line);
  }
  if (filters.project) {
    conditions.push(`a.project ILIKE $${idx++}`);
    values.push(`%${filters.project}%`);
  }
  if (filters.executor_id) {
    conditions.push(`a.executor_id = $${idx++}`);
    values.push(filters.executor_id);
  }
  if (filters.verifier_id) {
    conditions.push(`a.verifier_id = $${idx++}`);
    values.push(filters.verifier_id);
  }
  if (filters.date_from) {
    conditions.push(`a.created_at >= $${idx++}`);
    values.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`a.created_at <= $${idx++}`);
    values.push(filters.date_to);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

// OTD: % of completed activities delivered on or before planned_completion_date
async function getOTD(filters = {}) {
  const { where, values } = buildFilters({ ...filters });

  const extraCond = where ? `${where} AND a.status = 'completed'`
                           : `WHERE a.status = 'completed'`;

  const { rows } = await db.query(
    `SELECT
       COUNT(*)                                                        AS total,
       COUNT(*) FILTER (
         WHERE d.actual_completion_date <= d.planned_completion_date
           AND d.planned_completion_date IS NOT NULL
       )                                                               AS on_time
     FROM activities a
     JOIN activity_dates d ON d.activity_id = a.id
     ${extraCond}`,
    values
  );

  const total  = parseInt(rows[0].total);
  const onTime = parseInt(rows[0].on_time);
  return {
    total,
    on_time: onTime,
    rate: total > 0 ? parseFloat((onTime / total).toFixed(4)) : null,
  };
}

// Quality: % of activities approved on the very first verification attempt
async function getQualityRate(filters = {}) {
  const { where, values } = buildFilters(filters);

  const { rows } = await db.query(
    `SELECT
       COUNT(DISTINCT a.id)                                             AS total_verified,
       COUNT(DISTINCT a.id) FILTER (
         WHERE v_first.result = 'approved'
       )                                                                AS first_pass
     FROM activities a
     JOIN verifications v_first
       ON v_first.activity_id = a.id AND v_first.iteration = 1
     ${where}`,
    values
  );

  const total     = parseInt(rows[0].total_verified);
  const firstPass = parseInt(rows[0].first_pass);
  return {
    total_verified: total,
    first_pass: firstPass,
    rate: total > 0 ? parseFloat((firstPass / total).toFixed(4)) : null,
  };
}

// Volume: count of activities grouped by status and product_line
async function getVolume(filters = {}) {
  const { where, values } = buildFilters(filters);

  const [byStatus, byLine] = await Promise.all([
    db.query(
      `SELECT status, COUNT(*) AS count
       FROM activities a ${where}
       GROUP BY status ORDER BY status`,
      values
    ),
    db.query(
      `SELECT product_line, COUNT(*) AS count
       FROM activities a ${where}
       GROUP BY product_line`,
      values
    ),
  ]);

  const total = byStatus.rows.reduce((sum, r) => sum + parseInt(r.count), 0);

  return {
    total,
    by_status:       Object.fromEntries(byStatus.rows.map((r) => [r.status, parseInt(r.count)])),
    by_product_line: Object.fromEntries(byLine.rows.map((r) => [r.product_line, parseInt(r.count)])),
  };
}

// Error classification: rejection counts per error_code
async function getErrorClassification(filters = {}) {
  const { where, values } = buildFilters(filters);

  const joinWhere = where.replace(/\bWHERE\b/, 'WHERE').replace(/\ba\./g, 'a.');
  const finalWhere = where
    ? `${where} AND v.result = 'rejected'`
    : `WHERE v.result = 'rejected'`;

  const { rows } = await db.query(
    `SELECT v.error_code, COUNT(*) AS count
     FROM verifications v
     JOIN activities a ON a.id = v.activity_id
     ${finalWhere}
     GROUP BY v.error_code
     ORDER BY count DESC`,
    values
  );

  return rows.map((r) => ({ error_code: r.error_code, count: parseInt(r.count) }));
}

// Workload: open activities per executor
async function getWorkload(filters = {}) {
  const { where, values } = buildFilters(filters);

  const activeWhere = where
    ? `${where} AND a.status NOT IN ('completed', 'requested')`
    : `WHERE a.status NOT IN ('completed', 'requested')`;

  const { rows } = await db.query(
    `SELECT
       u.id, u.name,
       COUNT(a.id)                                                         AS open_activities,
       COUNT(a.id) FILTER (WHERE a.status = 'in_progress')                AS in_progress,
       COUNT(a.id) FILTER (WHERE a.status = 'verification')               AS in_verification,
       COUNT(a.id) FILTER (WHERE a.status = 'approved')                   AS approved,
       COUNT(a.id) FILTER (WHERE a.status = 'hold')                       AS on_hold
     FROM users u
     LEFT JOIN activities a ON a.executor_id = u.id
     ${activeWhere.replace(/\ba\./g, (m) => 'a.')}
     GROUP BY u.id, u.name
     HAVING COUNT(a.id) > 0
     ORDER BY open_activities DESC`,
    values
  );

  return rows.map((r) => ({
    user_id:         r.id,
    name:            r.name,
    open_activities: parseInt(r.open_activities),
    by_status: {
      in_progress:    parseInt(r.in_progress),
      in_verification: parseInt(r.in_verification),
      approved:        parseInt(r.approved),
      on_hold:         parseInt(r.on_hold),
    },
  }));
}

// Overdue: activities past their planned dates and not yet completed
async function getOverdue(filters = {}) {
  const { where, values } = buildFilters(filters);
  const today = new Date().toISOString().split('T')[0];
  const idx = values.length + 1;

  const overdueWhere = where
    ? `${where} AND a.status NOT IN ('completed') AND (
         (d.planned_completion_date < $${idx} AND d.actual_completion_date IS NULL)
       )`
    : `WHERE a.status NOT IN ('completed') AND (
         (d.planned_completion_date < $${idx} AND d.actual_completion_date IS NULL)
       )`;

  const { rows } = await db.query(
    `SELECT
       a.id, a.document_number, a.project, a.status, a.product_line,
       u.name AS executor_name,
       d.planned_completion_date,
       ($${idx}::date - d.planned_completion_date)::int AS days_overdue
     FROM activities a
     JOIN activity_dates d ON d.activity_id = a.id
     LEFT JOIN users u ON u.id = a.executor_id
     ${overdueWhere}
     ORDER BY days_overdue DESC`,
    [...values, today]
  );

  return rows.map((r) => ({ ...r, days_overdue: parseInt(r.days_overdue) }));
}

// Verification queue: activities currently awaiting verification
async function getVerificationQueue(filters = {}) {
  const { where, values } = buildFilters(filters);

  const queueWhere = where
    ? `${where} AND a.status = 'verification'`
    : `WHERE a.status = 'verification'`;

  const { rows } = await db.query(
    `SELECT
       a.id, a.document_number, a.project, a.product_line, a.document_type,
       u_exec.name  AS executor_name,
       u_ver.name   AS verifier_name,
       d.actual_verification_date,
       d.planned_completion_date,
       (SELECT COUNT(*) FROM verifications v WHERE v.activity_id = a.id) AS iteration_count
     FROM activities a
     LEFT JOIN users u_exec ON u_exec.id = a.executor_id
     LEFT JOIN users u_ver  ON u_ver.id  = a.verifier_id
     JOIN  activity_dates d ON d.activity_id = a.id
     ${queueWhere}
     ORDER BY d.planned_completion_date ASC NULLS LAST`,
    values
  );

  return rows.map((r) => ({ ...r, iteration_count: parseInt(r.iteration_count) }));
}

// Unassigned: activities with no executor set
async function getUnassigned(filters = {}) {
  const { where, values } = buildFilters(filters);

  const unassignedWhere = where
    ? `${where} AND a.executor_id IS NULL AND a.status NOT IN ('completed')`
    : `WHERE a.executor_id IS NULL AND a.status NOT IN ('completed')`;

  const { rows } = await db.query(
    `SELECT a.id, a.project, a.document_type, a.product_line, a.status, a.created_at
     FROM activities a
     ${unassignedWhere}
     ORDER BY a.created_at ASC`,
    values
  );

  return rows;
}

module.exports = {
  getOTD,
  getQualityRate,
  getVolume,
  getErrorClassification,
  getWorkload,
  getOverdue,
  getVerificationQueue,
  getUnassigned,
};
