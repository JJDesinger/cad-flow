const db = require('../config/db');

async function findById(id) {
  const { rows } = await db.query(
    `SELECT
       a.*,
       u_exec.name  AS executor_name,
       u_ver.name   AS verifier_name,
       u_appr.name  AS approver_name,
       u_crt.name   AS created_by_name,
       row_to_json(d) AS dates
     FROM activities a
     LEFT JOIN users u_exec ON u_exec.id = a.executor_id
     LEFT JOIN users u_ver  ON u_ver.id  = a.verifier_id
     LEFT JOIN users u_appr ON u_appr.id = a.approver_id
     LEFT JOIN users u_crt  ON u_crt.id  = a.created_by
     LEFT JOIN activity_dates d ON d.activity_id = a.id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function list(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`a.status = $${idx++}`);
    values.push(filters.status);
  }
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

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       a.id, a.document_number, a.product_line, a.project, a.equipment,
       a.component, a.document_type, a.status,
       a.executor_id,  u_exec.name AS executor_name,
       a.verifier_id,  u_ver.name  AS verifier_name,
       a.approver_id,  u_appr.name AS approver_name,
       a.created_by,   u_crt.name  AS created_by_name,
       a.created_at,   a.updated_at
     FROM activities a
     LEFT JOIN users u_exec ON u_exec.id = a.executor_id
     LEFT JOIN users u_ver  ON u_ver.id  = a.verifier_id
     LEFT JOIN users u_appr ON u_appr.id = a.approver_id
     LEFT JOIN users u_crt  ON u_crt.id  = a.created_by
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...values, filters.limit || 50, ((filters.page || 1) - 1) * (filters.limit || 50)]
  );
  return rows;
}

async function create(data) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO activities
         (document_number, product_line, project, equipment, component,
          document_type, document_code, executor_id, verifier_id, approver_id,
          created_by, file_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.document_number ?? null,
        data.product_line,
        data.project,
        data.equipment ?? null,
        data.component ?? null,
        data.document_type,
        data.document_code ?? null,
        data.executor_id ?? null,
        data.verifier_id ?? null,
        data.approver_id ?? null,
        data.created_by,
        data.file_link ?? null,
      ]
    );
    const activity = rows[0];

    await client.query(
      `INSERT INTO activity_dates (activity_id, planned_start_date, planned_verification_date, planned_completion_date)
       VALUES ($1, $2, $3, $4)`,
      [
        activity.id,
        data.planned_start_date ?? null,
        data.planned_verification_date ?? null,
        data.planned_completion_date ?? null,
      ]
    );

    await client.query(
      `INSERT INTO status_history (activity_id, previous_status, new_status, changed_by, notes)
       VALUES ($1, NULL, 'requested', $2, 'Activity created')`,
      [activity.id, data.created_by]
    );

    await client.query('COMMIT');
    return findById(activity.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, fields) {
  const allowed = [
    'document_number', 'product_line', 'project', 'equipment', 'component',
    'document_type', 'document_code', 'executor_id', 'verifier_id',
    'approver_id', 'file_link',
  ];
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${updates.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) return findById(id);

  values.push(id);
  await db.query(
    `UPDATE activities SET ${updates.join(', ')} WHERE id = $${values.length}`,
    values
  );
  return findById(id);
}

async function updateDates(activityId, fields) {
  const allowed = [
    'planned_start_date', 'actual_start_date',
    'planned_verification_date', 'actual_verification_date',
    'planned_completion_date', 'actual_completion_date',
  ];
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${updates.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) return;

  values.push(activityId);
  await db.query(
    `UPDATE activity_dates SET ${updates.join(', ')} WHERE activity_id = $${values.length}`,
    values
  );
}

async function changeStatus(activityId, newStatus, userId, notes = null) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT status FROM activities WHERE id = $1 FOR UPDATE',
      [activityId]
    );
    if (!rows[0]) throw new Error('Activity not found');
    const previousStatus = rows[0].status;

    await client.query(
      'UPDATE activities SET status = $1 WHERE id = $2',
      [newStatus, activityId]
    );

    await client.query(
      `INSERT INTO status_history (activity_id, previous_status, new_status, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [activityId, previousStatus, newStatus, userId, notes]
    );

    // set actual dates based on transition
    const dateUpdates = {};
    if (newStatus === 'in_progress' && previousStatus === 'requested') {
      dateUpdates.actual_start_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'verification') {
      dateUpdates.actual_verification_date = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'completed') {
      dateUpdates.actual_completion_date = new Date().toISOString().split('T')[0];
    }

    if (Object.keys(dateUpdates).length > 0) {
      const dateFields = Object.keys(dateUpdates);
      const dateValues = Object.values(dateUpdates);
      const setClauses = dateFields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE activity_dates SET ${setClauses} WHERE activity_id = $${dateFields.length + 1}`,
        [...dateValues, activityId]
      );
    }

    await client.query('COMMIT');
    return findById(activityId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistory(activityId) {
  const { rows } = await db.query(
    `SELECT h.*, u.name AS changed_by_name
     FROM status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.activity_id = $1
     ORDER BY h.changed_at ASC`,
    [activityId]
  );
  return rows;
}

async function getVerifications(activityId) {
  const { rows } = await db.query(
    `SELECT v.*, u.name AS verifier_name
     FROM verifications v
     JOIN users u ON u.id = v.verifier_id
     WHERE v.activity_id = $1
     ORDER BY v.iteration ASC`,
    [activityId]
  );
  return rows;
}

async function addVerification(activityId, verifierId, result, errorCode, notes) {
  const { rows: countRows } = await db.query(
    'SELECT COUNT(*) AS total FROM verifications WHERE activity_id = $1',
    [activityId]
  );
  const iteration = parseInt(countRows[0].total) + 1;

  const { rows } = await db.query(
    `INSERT INTO verifications (activity_id, verifier_id, iteration, result, error_code, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [activityId, verifierId, iteration, result, errorCode ?? null, notes ?? null]
  );
  return rows[0];
}

module.exports = {
  findById,
  list,
  create,
  update,
  updateDates,
  changeStatus,
  getHistory,
  getVerifications,
  addVerification,
};
