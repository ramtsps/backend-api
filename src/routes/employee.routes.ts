import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware';
import employeeController from '@controllers/employee.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getEmployeesSchema,
  getEmployeeByIdSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  deleteEmployeeSchema,
  updateEmployeeStatusSchema,
  updateBankDetailsSchema,
  getEmergencyContactsSchema,
  addEmergencyContactSchema,
  updateEmergencyContactSchema,
  deleteEmergencyContactSchema,
  getEmployeeDocumentsSchema,
  addEmployeeDocumentSchema,
  updateEmployeeDocumentSchema,
  deleteEmployeeDocumentSchema,
  getReportingStructureSchema,
  updateManagerSchema,
  bulkCreateEmployeesSchema,
  bulkUpdateEmployeeStatusSchema,
} from '@validators/employee.validator';

const router = Router();

router.use(authenticate);

// Bulk operations (must be before :id routes)
router.post(
  '/bulk-create',
  authorize(['admin', 'hr']),
  validate(bulkCreateEmployeesSchema),
  employeeController.bulkCreateEmployees
);

router.post(
  '/bulk-status-update',
  authorize(['admin', 'hr']),
  validate(bulkUpdateEmployeeStatusSchema),
  employeeController.bulkUpdateStatus
);

// Employee CRUD
router.get(
  '/',
  authorize(['admin', 'hr', 'manager']),
  validate(getEmployeesSchema),
  employeeController.getEmployees
);

router.get(
  '/:id',
  validate(getEmployeeByIdSchema),
  employeeController.getEmployeeById
);

router.post(
  '/',
  authorize(['admin', 'hr']),
  validate(createEmployeeSchema),
  employeeController.createEmployee
);

router.put(
  '/:id',
  authorize(['admin', 'hr']),
  validate(updateEmployeeSchema),
  employeeController.updateEmployee
);

router.delete(
  '/:id',
  authorize(['admin', 'hr']),
  validate(deleteEmployeeSchema),
  employeeController.deleteEmployee
);

// Employee status
router.patch(
  '/:id/status',
  authorize(['admin', 'hr']),
  validate(updateEmployeeStatusSchema),
  employeeController.updateStatus
);

// Bank details
router.put(
  '/:id/bank-details',
  authorize(['admin', 'hr']),
  validate(updateBankDetailsSchema),
  employeeController.updateBankDetails
);

// Emergency contacts
router.get(
  '/:id/emergency-contacts',
  validate(getEmergencyContactsSchema),
  employeeController.getEmergencyContacts
);

router.post(
  '/:id/emergency-contacts',
  authorize(['admin', 'hr']),
  validate(addEmergencyContactSchema),
  employeeController.addEmergencyContact
);

router.put(
  '/:id/emergency-contacts/:contactId',
  authorize(['admin', 'hr']),
  validate(updateEmergencyContactSchema),
  employeeController.updateEmergencyContact
);

router.delete(
  '/:id/emergency-contacts/:contactId',
  authorize(['admin', 'hr']),
  validate(deleteEmergencyContactSchema),
  employeeController.deleteEmergencyContact
);

// Documents
router.get(
  '/:id/documents',
  validate(getEmployeeDocumentsSchema),
  employeeController.getDocuments
);

router.post(
  '/:id/documents',
  authorize(['admin', 'hr']),
  validate(addEmployeeDocumentSchema),
  employeeController.addDocument
);

router.put(
  '/:id/documents/:documentId',
  authorize(['admin', 'hr']),
  validate(updateEmployeeDocumentSchema),
  employeeController.updateDocument
);

router.delete(
  '/:id/documents/:documentId',
  authorize(['admin', 'hr']),
  validate(deleteEmployeeDocumentSchema),
  employeeController.deleteDocument
);

// Reporting structure
router.get(
  '/:id/reporting-structure',
  validate(getReportingStructureSchema),
  employeeController.getReportingStructure
);

router.patch(
  '/:id/manager',
  authorize(['admin', 'hr']),
  validate(updateManagerSchema),
  employeeController.updateManager
);

export default router;