import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Lead CRUD
router.get('/', (req, res) => {
  res.json({ message: 'Get all leads - To be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get lead by ID - To be implemented' });
});

router.post('/', authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'Create lead - To be implemented' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update lead - To be implemented' });
});

router.delete('/:id', authorize(['admin']), (req, res) => {
  res.json({ message: 'Delete lead - To be implemented' });
});

// Lead Status
router.patch('/:id/status', (req, res) => {
  res.json({ message: 'Update lead status - To be implemented' });
});

router.post('/:id/convert', authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'Convert lead to client - To be implemented' });
});

// Lead Assignment
router.post('/:id/assign', authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'Assign lead - To be implemented' });
});

// Lead Activities
router.get('/:id/activities', (req, res) => {
  res.json({ message: 'Get lead activities - To be implemented' });
});

router.post('/:id/activities', (req, res) => {
  res.json({ message: 'Add lead activity - To be implemented' });
});

// Lead Notes
router.get('/:id/notes', (req, res) => {
  res.json({ message: 'Get lead notes - To be implemented' });
});

router.post('/:id/notes', (req, res) => {
  res.json({ message: 'Add lead note - To be implemented' });
});

// Lead Pipeline
router.get('/pipeline/overview', (req, res) => {
  res.json({ message: 'Get pipeline overview - To be implemented' });
});

router.get('/pipeline/stages', (req, res) => {
  res.json({ message: 'Get pipeline stages - To be implemented' });
});

// My Leads
router.get('/my/assigned', (req, res) => {
  res.json({ message: 'Get my assigned leads - To be implemented' });
});

// Lead Reports
router.get('/reports/conversion', authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'Get conversion report - To be implemented' });
});

router.get('/reports/source', authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'Get lead source report - To be implemented' });
});

export default router;
