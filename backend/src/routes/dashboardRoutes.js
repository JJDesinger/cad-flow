const router = require('express').Router();
const {
  getKPIs, getWorkload, getOverdue, getVerificationQueue, getUnassigned, getMySummary,
} = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// KPIs consolidados — admin e manager veem tudo
router.get('/kpis',               authorize('admin', 'manager', 'planner'), getKPIs);

// Carga por pessoa — planejador e gestores
router.get('/workload',           authorize('admin', 'manager', 'planner'), getWorkload);

// Atividades atrasadas
router.get('/overdue',            authorize('admin', 'manager', 'planner'), getOverdue);

// Fila de verificação
router.get('/verification-queue', authorize('admin', 'manager', 'planner', 'verifier'), getVerificationQueue);

// Atividades sem responsável
router.get('/unassigned',         authorize('admin', 'manager', 'planner'), getUnassigned);

// Visão do projetista — próprias atividades
router.get('/my-summary',         getMySummary);

module.exports = router;
