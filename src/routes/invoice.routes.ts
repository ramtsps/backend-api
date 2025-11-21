import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['admin', 'finance', 'accounts']));

// Invoice CRUD
router.get('/', (req, res) => {
  res.json({ message: 'Get all invoices - To be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get invoice by ID - To be implemented' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create invoice - To be implemented' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update invoice - To be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete invoice - To be implemented' });
});

// Invoice Status
router.patch('/:id/status', (req, res) => {
  res.json({ message: 'Update invoice status - To be implemented' });
});

router.post('/:id/send', (req, res) => {
  res.json({ message: 'Send invoice to client - To be implemented' });
});

router.post('/:id/mark-paid', (req, res) => {
  res.json({ message: 'Mark invoice as paid - To be implemented' });
});

// Invoice Items
router.get('/:id/items', (req, res) => {
  res.json({ message: 'Get invoice items - To be implemented' });
});

router.post('/:id/items', (req, res) => {
  res.json({ message: 'Add invoice item - To be implemented' });
});

// Invoice PDF
router.get('/:id/pdf', (req, res) => {
  res.json({ message: 'Download invoice PDF - To be implemented' });
});

// Invoice Payments
router.get('/:id/payments', (req, res) => {
  res.json({ message: 'Get invoice payments - To be implemented' });
});

router.post('/:id/payments', (req, res) => {
  res.json({ message: 'Record invoice payment - To be implemented' });
});

// Client Invoices
router.get('/client/:clientId', (req, res) => {
  res.json({ message: 'Get client invoices - To be implemented' });
});

// Invoice Reports
router.get('/reports/summary', (req, res) => {
  res.json({ message: 'Get invoice summary - To be implemented' });
});

router.get('/reports/aging', (req, res) => {
  res.json({ message: 'Get invoice aging report - To be implemented' });
});

router.get('/reports/revenue', (req, res) => {
  res.json({ message: 'Get revenue report - To be implemented' });
});

export default router;
