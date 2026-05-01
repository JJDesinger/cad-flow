/*
  Status flow:
    requested → in_progress → verification → approved → completed
    any active state ↔ hold

  Transition rules by role:
    planner / admin / manager : can move requested→in_progress, any→hold, hold→previous
    designer (executor)       : in_progress→verification (requires document_number)
    verifier                  : verification→approved OR verification→in_progress (rejection)
    approver / admin / manager: approved→completed
*/

const TRANSITIONS = {
  requested:    { in_progress: ['admin', 'manager', 'planner'] },
  in_progress:  { verification: ['admin', 'manager', 'designer'], hold: ['admin', 'manager', 'planner'] },
  verification: { approved: ['admin', 'manager', 'verifier'],  in_progress: ['admin', 'manager', 'verifier'], hold: ['admin', 'manager', 'planner'] },
  approved:     { completed:   ['admin', 'manager', 'planner'], hold: ['admin', 'manager', 'planner'] },
  hold:         { requested: ['admin', 'manager', 'planner'], in_progress: ['admin', 'manager', 'planner'], verification: ['admin', 'manager', 'planner'], approved: ['admin', 'manager', 'planner'] },
  completed:    {},
};

function canTransition(currentStatus, newStatus, userRoles) {
  const allowed = TRANSITIONS[currentStatus]?.[newStatus] ?? [];
  return userRoles.some((r) => allowed.includes(r));
}

function validateTransition(activity, newStatus, userRoles) {
  if (!TRANSITIONS[activity.status]) {
    return { ok: false, error: `Unknown current status: ${activity.status}` };
  }

  if (!TRANSITIONS[activity.status][newStatus]) {
    return { ok: false, error: `Transition from '${activity.status}' to '${newStatus}' is not allowed` };
  }

  if (!canTransition(activity.status, newStatus, userRoles)) {
    return { ok: false, error: 'Your role does not allow this status transition' };
  }

  // document_number required before entering verification
  if (newStatus === 'verification' && !activity.document_number) {
    return { ok: false, error: 'document_number is required before sending to verification' };
  }

  return { ok: true };
}

module.exports = { validateTransition, canTransition };
