import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import payrollController from '@controllers/payroll.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getSalaryComponentsSchema,
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  deleteSalaryComponentSchema,
  getEmployeeSalaryStructureSchema,
  createEmployeeSalaryStructureSchema,
  updateEmployeeSalaryStructureSchema,
  getPayrollsSchema,
  getPayrollByIdSchema,
  generatePayrollSchema,
  processPayrollSchema,
  approvePayrollSchema,
  markPayrollPaidSchema,
  getPayslipsSchema,
  getPayslipByIdSchema,
  createPayrollAdjustmentSchema,
  getPayrollAdjustmentsSchema,
  deletePayrollAdjustmentSchema,
  getPayrollReportSchema,
  bulkApprovePayrollsSchema,
  bulkMarkPayrollsPaidSchema,
} from '@validators/payroll.validator';

const router = Router();

router.use(authenticate);

// Salary Components
router.get(
  '/components',
  authorize(['admin', 'hr', 'finance']),
  validate(getSalaryComponentsSchema),
  payrollController.getSalaryComponents
);

router.post(
  '/components',
  authorize(['admin', 'hr']),
  validate(createSalaryComponentSchema),
  payrollController.createSalaryComponent
);

router.put(
  '/components/:id',
  authorize(['admin', 'hr']),
  validate(updateSalaryComponentSchema),
  payrollController.updateSalaryComponent
);

router.delete(
  '/components/:id',
  authorize(['admin', 'hr']),
  validate(deleteSalaryComponentSchema),
  payrollController.deleteSalaryComponent
);

// Salary Structure
router.get(
  '/salary-structure/:employeeId',
  authorize(['admin', 'hr']),
  validate(getEmployeeSalaryStructureSchema),
  payrollController.getEmployeeSalaryStructure
);

router.post(
  '/salary-structure',
  authorize(['admin', 'hr']),
  validate(createEmployeeSalaryStructureSchema),
  payrollController.createEmployeeSalaryStructure
);

router.put(
  '/salary-structure/:id',
  authorize(['admin', 'hr']),
  validate(updateEmployeeSalaryStructureSchema),
  payrollController.updateEmployeeSalaryStructure
);

// Payroll Generation & Processing
router.post(
  '/generate',
  authorize(['admin', 'hr', 'finance']),
  validate(generatePayrollSchema),
  payrollController.generatePayroll
);

router.post(
  '/:id/process',
  authorize(['admin', 'hr', 'finance']),
  validate(processPayrollSchema),
  payrollController.processPayroll
);

router.post(
  '/:id/approve',
  authorize(['admin', 'finance']),
  validate(approvePayrollSchema),
  payrollController.approvePayroll
);

router.post(
  '/:id/mark-paid',
  authorize(['admin', 'finance']),
  validate(markPayrollPaidSchema),
  payrollController.markPayrollPaid
);

// Bulk Operations
router.post(
  '/bulk-approve',
  authorize(['admin', 'finance']),
  validate(bulkApprovePayrollsSchema),
  payrollController.bulkApprovePayrolls
);

router.post(
  '/bulk-mark-paid',
  authorize(['admin', 'finance']),
  validate(bulkMarkPayrollsPaidSchema),
  payrollController.bulkMarkPayrollsPaid
);

// Payslips
router.get(
  '/payslips',
  validate(getPayslipsSchema),
  payrollController.getPayslips
);

router.get(
  '/payslips/:id',
  validate(getPayslipByIdSchema),
  payrollController.getPayslipById
);

// Adjustments
router.get(
  '/adjustments',
  authorize(['admin', 'hr', 'finance']),
  validate(getPayrollAdjustmentsSchema),
  payrollController.getPayrollAdjustments
);

router.post(
  '/adjustments',
  authorize(['admin', 'hr', 'finance']),
  validate(createPayrollAdjustmentSchema),
  payrollController.createPayrollAdjustment
);

router.delete(
  '/adjustments/:id',
  authorize(['admin', 'hr', 'finance']),
  validate(deletePayrollAdjustmentSchema),
  payrollController.deletePayrollAdjustment
);

// Reports
router.get(
  '/report',
  authorize(['admin', 'hr', 'finance']),
  validate(getPayrollReportSchema),
  payrollController.getPayrollReport
);

// Payroll CRUD (must be after specific routes)
router.get(
  '/',
  authorize(['admin', 'hr', 'finance']),
  validate(getPayrollsSchema),
  payrollController.getPayrolls
);

router.get(
  '/:id',
  authorize(['admin', 'hr', 'finance']),
  validate(getPayrollByIdSchema),
  payrollController.getPayrollById
);

export default router;