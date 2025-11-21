import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Notifications
router.get('/', (req, res) => {
  res.json({ message: 'Get all notifications - To be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get notification by ID - To be implemented' });
});

router.patch('/:id/read', (req, res) => {
  res.json({ message: 'Mark notification as read - To be implemented' });
});

router.patch('/mark-all-read', (req, res) => {
  res.json({ message: 'Mark all notifications as read - To be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete notification - To be implemented' });
});

router.delete('/clear-all', (req, res) => {
  res.json({ message: 'Clear all notifications - To be implemented' });
});

// Notification Settings
router.get('/settings', (req, res) => {
  res.json({ message: 'Get notification settings - To be implemented' });
});

router.put('/settings', (req, res) => {
  res.json({ message: 'Update notification settings - To be implemented' });
});

// Unread Count
router.get('/unread/count', (req, res) => {
  res.json({ message: 'Get unread notification count - To be implemented' });
});

export default router;
