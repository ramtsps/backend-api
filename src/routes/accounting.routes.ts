import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['admin', 'finance', 'accounts']));

// Chart of Accounts
router.get('/accounts', (req, res) => {
  res.json({ message: 'Get chart of accounts - To be implemented' });
});

router.post('/accounts', (req, res) => {
  res.json({ message: 'Create account - To be implemented' });
});

router.put('/accounts/:id', (req, res) => {
  res.json({ message: 'Update account - To be implemented' });
});

router.delete('/accounts/:id', (req, res) => {
  res.json({ message: 'Delete account - To be implemented' });
});

// Journal Entries
router.get('/journal-entries', (req, res) => {
  res.json({ message: 'Get journal entries - To be implemented' });
});

router.get('/journal-entries/:id', (req, res) => {
  res.json({ message: 'Get journal entry by ID - To be implemented' });
});

router.post('/journal-entries', (req, res) => {
  res.json({ message: 'Create journal entry - To be implemented' });
});

router.put('/journal-entries/:id', (req, res) => {
  res.json({ message: 'Update journal entry - To be implemented' });
});

router.delete('/journal-entries/:id', (req, res) => {
  res.json({ message: 'Delete journal entry - To be implemented' });
});

router.post('/journal-entries/:id/post', (req, res) => {
  res.json({ message: 'Post journal entry - To be implemented' });
});

// Ledger
router.get('/ledger', (req, res) => {
  res.json({ message: 'Get general ledger - To be implemented' });
});

router.get('/ledger/account/:accountId', (req, res) => {
  res.json({ message: 'Get account ledger - To be implemented' });
});

// Trial Balance
router.get('/trial-balance', (req, res) => {
  res.json({ message: 'Get trial balance - To be implemented' });
});

// Financial Statements
router.get('/balance-sheet', (req, res) => {
  res.json({ message: 'Get balance sheet - To be implemented' });
});

router.get('/profit-loss', (req, res) => {
  res.json({ message: 'Get profit & loss statement - To be implemented' });
});

router.get('/cash-flow', (req, res) => {
  res.json({ message: 'Get cash flow statement - To be implemented' });
});

// Bank Reconciliation
router.get('/bank-reconciliation', (req, res) => {
  res.json({ message: 'Get bank reconciliations - To be implemented' });
});

router.post('/bank-reconciliation', (req, res) => {
  res.json({ message: 'Create bank reconciliation - To be implemented' });
});

router.post('/bank-reconciliation/:id/complete', (req, res) => {
  res.json({ message: 'Complete bank reconciliation - To be implemented' });
});

// Fiscal Year
router.get('/fiscal-years', (req, res) => {
  res.json({ message: 'Get fiscal years - To be implemented' });
});

router.post('/fiscal-years', (req, res) => {
  res.json({ message: 'Create fiscal year - To be implemented' });
});

router.post('/fiscal-years/:id/close', (req, res) => {
  res.json({ message: 'Close fiscal year - To be implemented' });
});

export default router;
