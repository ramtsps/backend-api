import { Router } from 'express';
import reconciliationController from '@controllers/reconciliation.controller';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize(['admin', 'finance', 'accounts']));

// Reconciliation routes
router.post('/', reconciliationController.performReconciliation);
router.get('/', reconciliationController.getReconciliations);
router.get('/stats', reconciliationController.getReconciliationStats);
router.get('/:id', reconciliationController.getReconciliationDetails);
router.get('/:id/export', reconciliationController.exportReconciliationReport);
router.post('/items/:itemId/resolve', reconciliationController.resolveDiscrepancy);
router.post('/auto-match', reconciliationController.autoMatchPayments);

export default router;
