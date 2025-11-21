import { Request, Response } from 'express';
import employeeService from '@services/employee.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class EmployeeController {
  /**
   * Get all employees
   * @route GET /api/v1/employees
   */
  getEmployees = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      search: req.query.search,
      companyId: req.query.companyId,
      departmentId: req.query.departmentId,
      designationId: req.query.designationId,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await employeeService.getEmployees(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.employees,
      page,
      limit,
      result.total,
      'Employees retrieved successfully'
    );
  });

  /**
   * Get employee by ID
   * @route GET /api/v1/employees/:id
   */
  getEmployeeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const employee = await employeeService.getEmployeeById(id, requestingUser);

    return successResponse(res, employee, 'Employee retrieved successfully');
  });

  /**
   * Create employee
   * @route POST /api/v1/employees
   */
  createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    // Parse date fields
    const employeeData = {
      ...req.body,
      hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
    };

    const employee = await employeeService.createEmployee(employeeData, requestingUser);

    return createdResponse(res, employee, 'Employee created successfully');
  });

  /**
   * Update employee
   * @route PUT /api/v1/employees/:id
   */
  updateEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    // Parse date fields
    const updateData = {
      ...req.body,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
    };

    const employee = await employeeService.updateEmployee(id, updateData, requestingUser);

    return successResponse(res, employee, 'Employee updated successfully');
  });

  /**
   * Delete employee
   * @route DELETE /api/v1/employees/:id
   */
  deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await employeeService.deleteEmployee(id, requestingUser);

    return successResponse(res, result, 'Employee deleted successfully');
  });

  /**
   * Update employee status
   * @route PATCH /api/v1/employees/:id/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, terminationDate, terminationReason } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const employee = await employeeService.updateEmployeeStatus(
      id,
      status,
      terminationDate ? new Date(terminationDate) : undefined,
      terminationReason,
      requestingUser
    );

    return successResponse(res, employee, 'Employee status updated successfully');
  });

  /**
   * Update bank details
   * @route PUT /api/v1/employees/:id/bank-details
   */
  updateBankDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const bankDetails = await employeeService.updateBankDetails(id, req.body);
    return successResponse(res, bankDetails, 'Bank details updated successfully');
  });

  /**
   * Get emergency contacts
   * @route GET /api/v1/employees/:id/emergency-contacts
   */
  getEmergencyContacts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contacts = await employeeService.getEmergencyContacts(id);
    return successResponse(res, contacts, 'Emergency contacts retrieved successfully');
  });

  /**
   * Add emergency contact
   * @route POST /api/v1/employees/:id/emergency-contacts
   */
  addEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contact = await employeeService.addEmergencyContact(id, req.body);
    return createdResponse(res, contact, 'Emergency contact added successfully');
  });

  /**
   * Update emergency contact
   * @route PUT /api/v1/employees/:id/emergency-contacts/:contactId
   */
  updateEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
    const { id, contactId } = req.params;
    const contact = await employeeService.updateEmergencyContact(id, contactId, req.body);
    return successResponse(res, contact, 'Emergency contact updated successfully');
  });

  /**
   * Delete emergency contact
   * @route DELETE /api/v1/employees/:id/emergency-contacts/:contactId
   */
  deleteEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
    const { id, contactId } = req.params;
    const result = await employeeService.deleteEmergencyContact(id, contactId);
    return successResponse(res, result, 'Emergency contact deleted successfully');
  });

  /**
   * Get employee documents
   * @route GET /api/v1/employees/:id/documents
   */
  getDocuments = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const type = req.query.type as string | undefined;
    const documents = await employeeService.getEmployeeDocuments(id, type);
    return successResponse(res, documents, 'Documents retrieved successfully');
  });

  /**
   * Add employee document
   * @route POST /api/v1/employees/:id/documents
   */
  addDocument = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const document = await employeeService.addEmployeeDocument(id, req.body);
    return createdResponse(res, document, 'Document added successfully');
  });

  /**
   * Update employee document
   * @route PUT /api/v1/employees/:id/documents/:documentId
   */
  updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const { id, documentId } = req.params;
    const document = await employeeService.updateEmployeeDocument(id, documentId, req.body);
    return successResponse(res, document, 'Document updated successfully');
  });

  /**
   * Delete employee document
   * @route DELETE /api/v1/employees/:id/documents/:documentId
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const { id, documentId } = req.params;
    const result = await employeeService.deleteEmployeeDocument(id, documentId);
    return successResponse(res, result, 'Document deleted successfully');
  });

  /**
   * Get reporting structure
   * @route GET /api/v1/employees/:id/reporting-structure
   */
  getReportingStructure = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const structure = await employeeService.getReportingStructure(id);
    return successResponse(res, structure, 'Reporting structure retrieved successfully');
  });

  /**
   * Update manager
   * @route PATCH /api/v1/employees/:id/manager
   */
  updateManager = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { managerId } = req.body;
    const employee = await employeeService.updateManager(id, managerId);
    return successResponse(res, employee, 'Manager updated successfully');
  });

  /**
   * Bulk create employees
   * @route POST /api/v1/employees/bulk-create
   */
  bulkCreateEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { employees } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await employeeService.bulkCreateEmployees(employees, requestingUser);

    return successResponse(res, result, 'Bulk employee creation completed');
  });

  /**
   * Bulk update employee status
   * @route POST /api/v1/employees/bulk-status-update
   */
  bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { employeeIds, status } = req.body;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await employeeService.bulkUpdateEmployeeStatus(
      employeeIds,
      status,
      requestingUser
    );

    return successResponse(res, result, 'Bulk status update completed');
  });
}

export default new EmployeeController();
