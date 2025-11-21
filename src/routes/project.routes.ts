import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import projectController from '@controllers/project.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getProjectsSchema,
  getProjectByIdSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  removeTeamMemberSchema,
  getProjectMilestonesSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  deleteMilestoneSchema,
  getProjectBudgetSchema,
  addBudgetExpenseSchema,
  getProjectReportSchema,
  getProjectsOverviewSchema,
  getProjectTimeTrackingSchema,
} from '@validators/project.validator';

const router = Router();

router.use(authenticate);

// Overview (must be before /:id)
router.get(
  '/overview',
  authorize(['admin', 'manager', 'hr']),
  validate(getProjectsOverviewSchema),
  projectController.getProjectsOverview
);

// Project CRUD
router.get(
  '/',
  validate(getProjectsSchema),
  projectController.getProjects
);

router.get(
  '/:id',
  validate(getProjectByIdSchema),
  projectController.getProjectById
);

router.post(
  '/',
  authorize(['admin', 'manager']),
  validate(createProjectSchema),
  projectController.createProject
);

router.put(
  '/:id',
  authorize(['admin', 'manager']),
  validate(updateProjectSchema),
  projectController.updateProject
);

router.delete(
  '/:id',
  authorize(['admin', 'manager']),
  validate(deleteProjectSchema),
  projectController.deleteProject
);

// Team Members
router.post(
  '/:id/team',
  authorize(['admin', 'manager']),
  validate(addTeamMemberSchema),
  projectController.addTeamMember
);

router.put(
  '/:id/team/:memberId',
  authorize(['admin', 'manager']),
  validate(updateTeamMemberSchema),
  projectController.updateTeamMember
);

router.delete(
  '/:id/team/:memberId',
  authorize(['admin', 'manager']),
  validate(removeTeamMemberSchema),
  projectController.removeTeamMember
);

// Milestones
router.get(
  '/:id/milestones',
  validate(getProjectMilestonesSchema),
  projectController.getProjectMilestones
);

router.post(
  '/:id/milestones',
  authorize(['admin', 'manager']),
  validate(createMilestoneSchema),
  projectController.createMilestone
);

router.put(
  '/:id/milestones/:milestoneId',
  authorize(['admin', 'manager']),
  validate(updateMilestoneSchema),
  projectController.updateMilestone
);

router.delete(
  '/:id/milestones/:milestoneId',
  authorize(['admin', 'manager']),
  validate(deleteMilestoneSchema),
  projectController.deleteMilestone
);

// Budget
router.get(
  '/:id/budget',
  authorize(['admin', 'manager', 'finance']),
  validate(getProjectBudgetSchema),
  projectController.getProjectBudget
);

router.post(
  '/:id/budget/expenses',
  authorize(['admin', 'manager', 'finance']),
  validate(addBudgetExpenseSchema),
  projectController.addBudgetExpense
);

// Reports & Analytics
router.get(
  '/:id/report',
  authorize(['admin', 'manager']),
  validate(getProjectReportSchema),
  projectController.getProjectReport
);

router.get(
  '/:id/time-tracking',
  authorize(['admin', 'manager']),
  validate(getProjectTimeTrackingSchema),
  projectController.getProjectTimeTracking
);

export default router;