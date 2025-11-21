import { Router } from 'express';
import { authenticate, authorize, superAdminOnly } from '@middleware/auth.middleware';
import companyController from '@controllers/company.controller';
import { validate } from '@middleware/validation.middleware';
import {
  getCompaniesSchema,
  getCompanyByIdSchema,
  createCompanySchema,
  updateCompanySchema,
  deleteCompanySchema,
  getCompanyConfigurationSchema,
  updateCompanyConfigurationSchema,
  getCompanyFeaturesSchema,
  updateCompanyFeaturesSchema,
  getDepartmentsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  deleteDepartmentSchema,
  getDesignationsSchema,
  createDesignationSchema,
  updateDesignationSchema,
  deleteDesignationSchema,
} from '@validators/company.validator';

const router = Router();

router.use(authenticate);

// Company CRUD
router.get(
  '/',
  authorize(['admin', 'hr']),
  validate(getCompaniesSchema),
  companyController.getCompanies
);

router.get(
  '/:id',
  validate(getCompanyByIdSchema),
  companyController.getCompanyById
);

router.post(
  '/',
  superAdminOnly,
  validate(createCompanySchema),
  companyController.createCompany
);

router.put(
  '/:id',
  authorize(['admin']),
  validate(updateCompanySchema),
  companyController.updateCompany
);

router.delete(
  '/:id',
  superAdminOnly,
  validate(deleteCompanySchema),
  companyController.deleteCompany
);

// Company Configuration
router.get(
  '/:id/configuration',
  authorize(['admin']),
  validate(getCompanyConfigurationSchema),
  companyController.getConfiguration
);

router.put(
  '/:id/configuration',
  authorize(['admin']),
  validate(updateCompanyConfigurationSchema),
  companyController.updateConfiguration
);

// Feature Configuration
router.get(
  '/:id/features',
  authorize(['admin']),
  validate(getCompanyFeaturesSchema),
  companyController.getFeatures
);

router.put(
  '/:id/features',
  superAdminOnly,
  validate(updateCompanyFeaturesSchema),
  companyController.updateFeatures
);

// Departments
router.get(
  '/:id/departments',
  authorize(['admin', 'hr']),
  validate(getDepartmentsSchema),
  companyController.getDepartments
);

router.post(
  '/:id/departments',
  authorize(['admin', 'hr']),
  validate(createDepartmentSchema),
  companyController.createDepartment
);

router.put(
  '/:id/departments/:departmentId',
  authorize(['admin', 'hr']),
  validate(updateDepartmentSchema),
  companyController.updateDepartment
);

router.delete(
  '/:id/departments/:departmentId',
  authorize(['admin', 'hr']),
  validate(deleteDepartmentSchema),
  companyController.deleteDepartment
);

// Designations
router.get(
  '/:id/designations',
  authorize(['admin', 'hr']),
  validate(getDesignationsSchema),
  companyController.getDesignations
);

router.post(
  '/:id/designations',
  authorize(['admin', 'hr']),
  validate(createDesignationSchema),
  companyController.createDesignation
);

router.put(
  '/:id/designations/:designationId',
  authorize(['admin', 'hr']),
  validate(updateDesignationSchema),
  companyController.updateDesignation
);

router.delete(
  '/:id/designations/:designationId',
  authorize(['admin', 'hr']),
  validate(deleteDesignationSchema),
  companyController.deleteDesignation
);

export default router;