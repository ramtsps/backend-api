import { Request, Response } from 'express';
import companyService from '@services/company.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class CompanyController {
  /**
   * Get all companies
   * @route GET /api/v1/companies
   */
  getCompanies = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      search: req.query.search,
      industry: req.query.industry,
      isActive: req.query.isActive,
      subscription_tier: req.query.subscription_tier,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await companyService.getCompanies(
      filters,
      page,
      limit,
      req.user!.isSuperAdmin
    );

    return paginatedResponse(
      res,
      result.companies,
      page,
      limit,
      result.total,
      'Companies retrieved successfully'
    );
  });

  /**
   * Get company by ID
   * @route GET /api/v1/companies/:id
   */
  getCompanyById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const company = await companyService.getCompanyById(id, req.user!.userId);
    return successResponse(res, company, 'Company retrieved successfully');
  });

  /**
   * Create company
   * @route POST /api/v1/companies
   */
  createCompany = asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.createCompany(req.body, req.user!.isSuperAdmin);
    return createdResponse(res, company, 'Company created successfully');
  });

  /**
   * Update company
   * @route PUT /api/v1/companies/:id
   */
  updateCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const company = await companyService.updateCompany(id, req.body, requestingUser);
    return successResponse(res, company, 'Company updated successfully');
  });

  /**
   * Delete company
   * @route DELETE /api/v1/companies/:id
   */
  deleteCompany = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await companyService.deleteCompany(id, req.user!.isSuperAdmin);
    return successResponse(res, result, 'Company deleted successfully');
  });

  /**
   * Get company configuration
   * @route GET /api/v1/companies/:id/configuration
   */
  getConfiguration = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const configuration = await companyService.getCompanyConfiguration(id);
    return successResponse(res, configuration, 'Configuration retrieved successfully');
  });

  /**
   * Update company configuration
   * @route PUT /api/v1/companies/:id/configuration
   */
  updateConfiguration = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await companyService.updateCompanyConfiguration(
      id,
      req.body,
      requestingUser
    );
    return successResponse(res, result, 'Configuration updated successfully');
  });

  /**
   * Get company features
   * @route GET /api/v1/companies/:id/features
   */
  getFeatures = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const features = await companyService.getCompanyFeatures(id);
    return successResponse(res, features, 'Features retrieved successfully');
  });

  /**
   * Update company features
   * @route PUT /api/v1/companies/:id/features
   */
  updateFeatures = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await companyService.updateCompanyFeatures(
      id,
      req.body,
      req.user!.isSuperAdmin
    );
    return successResponse(res, result, 'Features updated successfully');
  });

  // ===== DEPARTMENTS =====

  /**
   * Get company departments
   * @route GET /api/v1/companies/:id/departments
   */
  getDepartments = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      search: req.query.search,
      isActive: req.query.isActive,
    };

    const result = await companyService.getDepartments(id, filters, page, limit);

    return paginatedResponse(
      res,
      result.departments,
      page,
      limit,
      result.total,
      'Departments retrieved successfully'
    );
  });

  /**
   * Create department
   * @route POST /api/v1/companies/:id/departments
   */
  createDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await companyService.createDepartment(id, req.body);
    return createdResponse(res, department, 'Department created successfully');
  });

  /**
   * Update department
   * @route PUT /api/v1/companies/:id/departments/:departmentId
   */
  updateDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { id, departmentId } = req.params;
    const department = await companyService.updateDepartment(id, departmentId, req.body);
    return successResponse(res, department, 'Department updated successfully');
  });

  /**
   * Delete department
   * @route DELETE /api/v1/companies/:id/departments/:departmentId
   */
  deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { id, departmentId } = req.params;
    const result = await companyService.deleteDepartment(id, departmentId);
    return successResponse(res, result, 'Department deleted successfully');
  });

  // ===== DESIGNATIONS =====

  /**
   * Get company designations
   * @route GET /api/v1/companies/:id/designations
   */
  getDesignations = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      search: req.query.search,
      departmentId: req.query.departmentId,
      isActive: req.query.isActive,
    };

    const result = await companyService.getDesignations(id, filters, page, limit);

    return paginatedResponse(
      res,
      result.designations,
      page,
      limit,
      result.total,
      'Designations retrieved successfully'
    );
  });

  /**
   * Create designation
   * @route POST /api/v1/companies/:id/designations
   */
  createDesignation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const designation = await companyService.createDesignation(id, req.body);
    return createdResponse(res, designation, 'Designation created successfully');
  });

  /**
   * Update designation
   * @route PUT /api/v1/companies/:id/designations/:designationId
   */
  updateDesignation = asyncHandler(async (req: Request, res: Response) => {
    const { id, designationId } = req.params;
    const designation = await companyService.updateDesignation(id, designationId, req.body);
    return successResponse(res, designation, 'Designation updated successfully');
  });

  /**
   * Delete designation
   * @route DELETE /api/v1/companies/:id/designations/:designationId
   */
  deleteDesignation = asyncHandler(async (req: Request, res: Response) => {
    const { id, designationId } = req.params;
    const result = await companyService.deleteDesignation(id, designationId);
    return successResponse(res, result, 'Designation deleted successfully');
  });
}

export default new CompanyController();
