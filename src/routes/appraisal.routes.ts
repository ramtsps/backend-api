import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Appraisal Cycles
router.get('/cycles', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Get appraisal cycles - To be implemented' });
});

router.post('/cycles', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Create appraisal cycle - To be implemented' });
});

router.put('/cycles/:id', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Update appraisal cycle - To be implemented' });
});

// Appraisals
router.get('/', (req, res) => {
  res.json({ message: 'Get all appraisals - To be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get appraisal by ID - To be implemented' });
});

router.post('/', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Create appraisal - To be implemented' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update appraisal - To be implemented' });
});

// Self Assessment
router.post('/:id/self-assessment', (req, res) => {
  res.json({ message: 'Submit self assessment - To be implemented' });
});

// Manager Review
router.post('/:id/manager-review', authorize(['admin', 'hr', 'manager']), (req, res) => {
  res.json({ message: 'Submit manager review - To be implemented' });
});

// Final Rating
router.post('/:id/final-rating', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Submit final rating - To be implemented' });
});

// Goals
router.get('/:id/goals', (req, res) => {
  res.json({ message: 'Get appraisal goals - To be implemented' });
});

router.post('/:id/goals', authorize(['admin', 'hr', 'manager']), (req, res) => {
  res.json({ message: 'Add appraisal goal - To be implemented' });
});

router.put('/goals/:goalId', (req, res) => {
  res.json({ message: 'Update goal - To be implemented' });
});

// Competencies
router.get('/competencies', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Get competencies - To be implemented' });
});

router.post('/competencies', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Create competency - To be implemented' });
});

// Employee appraisals
router.get('/employee/:employeeId', (req, res) => {
  res.json({ message: 'Get employee appraisals - To be implemented' });
});

router.get('/employee/:employeeId/history', (req, res) => {
  res.json({ message: 'Get employee appraisal history - To be implemented' });
});

export default router;
