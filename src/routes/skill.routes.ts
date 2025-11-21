import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Skills
router.get('/', (req, res) => {
  res.json({ message: 'Get all skills - To be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get skill by ID - To be implemented' });
});

router.post('/', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Create skill - To be implemented' });
});

router.put('/:id', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Update skill - To be implemented' });
});

router.delete('/:id', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Delete skill - To be implemented' });
});

// Skill Categories
router.get('/categories', (req, res) => {
  res.json({ message: 'Get skill categories - To be implemented' });
});

router.post('/categories', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Create skill category - To be implemented' });
});

// Employee Skills
router.get('/employee/:employeeId', (req, res) => {
  res.json({ message: 'Get employee skills - To be implemented' });
});

router.post('/employee/:employeeId', (req, res) => {
  res.json({ message: 'Add employee skill - To be implemented' });
});

router.put('/employee/:employeeId/skills/:skillId', (req, res) => {
  res.json({ message: 'Update employee skill proficiency - To be implemented' });
});

router.delete('/employee/:employeeId/skills/:skillId', (req, res) => {
  res.json({ message: 'Remove employee skill - To be implemented' });
});

// Skill Matrix
router.get('/matrix/company', authorize(['admin', 'hr']), (req, res) => {
  res.json({ message: 'Get company skill matrix - To be implemented' });
});

router.get('/matrix/department/:departmentId', authorize(['admin', 'hr', 'manager']), (req, res) => {
  res.json({ message: 'Get department skill matrix - To be implemented' });
});

// Skill Gap Analysis
router.get('/gap-analysis/:employeeId', (req, res) => {
  res.json({ message: 'Get employee skill gap analysis - To be implemented' });
});

router.get('/gap-analysis/department/:departmentId', authorize(['admin', 'hr', 'manager']), (req, res) => {
  res.json({ message: 'Get department skill gap analysis - To be implemented' });
});

export default router;
