import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import expenseController from '@controllers/expense.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getExpenseCategoriesSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  deleteExpenseCategorySchema,
  getExpenseClaimsSchema,
  getExpenseClaimByIdSchema,
  createExpenseClaimSchema,
  updateExpenseClaimSchema,
  deleteExpenseClaimSchema,
  submitExpenseClaimSchema,
  approveExpenseClaimSchema,
  reimburseExpenseClaimSchema,
  getExpenseReportSchema,
  bulkSubmitExpenseClaimsSchema,
  bulkApproveExpenseClaimsSchema,
  bulkReimburseExpenseClaimsSchema,
} from '@validators/expense.validator';

const router = Router();

router.use(authenticate);

// Expense Categories
router.get(
  '/categories',
  authorize(['admin', 'hr', 'finance']),
  validate(getExpenseCategoriesSchema),
  expenseController.getExpenseCategories
);

router.post(
  '/categories',
  authorize(['admin', 'hr', 'finance']),
  validate(createExpenseCategorySchema),
  expenseController.createExpenseCategory
);

router.put(
  '/categories/:id',
  authorize(['admin', 'hr', 'finance']),
  validate(updateExpenseCategorySchema),
  expenseController.updateExpenseCategory
);

router.delete(
  '/categories/:id',
  authorize(['admin', 'hr', 'finance']),
  validate(deleteExpenseCategorySchema),
  expenseController.deleteExpenseCategory
);

// Bulk Operations (before /:id routes)
router.post(
  '/claims/bulk-submit',
  validate(bulkSubmitExpenseClaimsSchema),
  expenseController.bulkSubmitExpenseClaims
);

router.post(
  '/claims/bulk-approve',
  authorize(['admin', 'hr', 'finance', 'manager']),
  validate(bulkApproveExpenseClaimsSchema),
  expenseController.bulkApproveExpenseClaims
);

router.post(
  '/claims/bulk-reimburse',
  authorize(['admin', 'finance']),
  validate(bulkReimburseExpenseClaimsSchema),
  expenseController.bulkReimburseExpenseClaims
);

// Expense Claims
router.get(
  '/claims',
  validate(getExpenseClaimsSchema),
  expenseController.getExpenseClaims
);

router.get(
  '/claims/:id',
  validate(getExpenseClaimByIdSchema),
  expenseController.getExpenseClaimById
);

router.post(
  '/claims',
  validate(createExpenseClaimSchema),
  expenseController.createExpenseClaim
);

router.put(
  '/claims/:id',
  validate(updateExpenseClaimSchema),
  expenseController.updateExpenseClaim
);

router.delete(
  '/claims/:id',
  validate(deleteExpenseClaimSchema),
  expenseController.deleteExpenseClaim
);

router.post(
  '/claims/:id/submit',
  validate(submitExpenseClaimSchema),
  expenseController.submitExpenseClaim
);

router.patch(
  '/claims/:id/approve',
  authorize(['admin', 'hr', 'finance', 'manager']),
  validate(approveExpenseClaimSchema),
  expenseController.approveExpenseClaim
);

router.post(
  '/claims/:id/reimburse',
  authorize(['admin', 'finance']),
  validate(reimburseExpenseClaimSchema),
  expenseController.reimburseExpenseClaim
);

// Reports
router.get(
  '/report',
  authorize(['admin', 'hr', 'finance', 'manager']),
  validate(getExpenseReportSchema),
  expenseController.getExpenseReport
);

export default router;
