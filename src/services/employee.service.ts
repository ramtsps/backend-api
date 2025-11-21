import prisma from '@/lib/prisma';
import { cache, cacheKeys } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  employeeCode: string;
  companyId: string;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  hireDate: Date;
  employmentType?: string;
  workLocation?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  salary?: number;
  salaryType?: string;
  status?: string;
  bankDetails?: any;
  emergencyContact?: any;
}

interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  employmentType?: string;
  workLocation?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  salary?: number;
  salaryType?: string;
  status?: string;
}

class EmployeeService {
  /**
   * Get all employees with filters
   */
  async getEmployees(
    filters: any,
    page: number = 1,
    limit: number = 20,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    // Apply filters
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.designationId) {
      where.designationId = filters.designationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          hireDate: true,
          status: true,
          employmentType: true,
          workLocation: true,
          salary: true,
          salaryType: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.employee.count({ where }),
    ]);

    return { employees, total, page, limit };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(
    employeeId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Try cache first
    const cached = await cache.get(cacheKeys.employee(employeeId));
    if (cached) {
      return cached;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            designation: {
              select: {
                name: true,
              },
            },
          },
        },
        bankDetails: true,
        emergencyContacts: true,
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            fileUrl: true,
            isVerified: true,
            expiryDate: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            subordinates: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Cache employee data
    await cache.set(cacheKeys.employee(employeeId), employee, 3600);

    return employee;
  }

  /**
   * Create new employee
   */
  async createEmployee(
    input: CreateEmployeeInput,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check: Use requesting user's company if not super admin
    let companyId = input.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId!;
    }

    // Check if employee code already exists in the company
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        companyId,
        employeeCode: input.employeeCode,
      },
    });

    if (existingEmployee) {
      throw new ConflictError('Employee code already exists in this company');
    }

    // Check if email already exists in the company
    const existingEmail = await prisma.employee.findFirst({
      where: {
        companyId,
        email: input.email.toLowerCase(),
      },
    });

    if (existingEmail) {
      throw new ConflictError('Email already exists in this company');
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Verify department if provided
    if (input.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: input.departmentId, companyId },
      });
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    // Verify designation if provided
    if (input.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: input.designationId, companyId },
      });
      if (!designation) {
        throw new NotFoundError('Designation not found');
      }
    }

    // Verify manager if provided
    if (input.managerId) {
      const manager = await prisma.employee.findFirst({
        where: { id: input.managerId, companyId },
      });
      if (!manager) {
        throw new NotFoundError('Manager not found');
      }
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        maritalStatus: input.maritalStatus,
        employeeCode: input.employeeCode,
        companyId,
        departmentId: input.departmentId,
        designationId: input.designationId,
        managerId: input.managerId,
        hireDate: input.hireDate,
        employmentType: input.employmentType || 'full_time',
        workLocation: input.workLocation,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        salary: input.salary,
        salaryType: input.salaryType || 'monthly',
        status: input.status || 'active',
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create bank details if provided
    if (input.bankDetails) {
      await prisma.bankDetails.create({
        data: {
          employeeId: employee.id,
          ...input.bankDetails,
        },
      });
    }

    // Create emergency contact if provided
    if (input.emergencyContact) {
      await prisma.emergencyContact.create({
        data: {
          employeeId: employee.id,
          ...input.emergencyContact,
          isPrimary: true,
        },
      });
    }

    return employee;
  }

  /**
   * Update employee
   */
  async updateEmployee(
    employeeId: string,
    input: UpdateEmployeeInput,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Check email uniqueness if updating
    if (input.email && input.email !== employee.email) {
      const existingEmail = await prisma.employee.findFirst({
        where: {
          companyId: employee.companyId,
          email: input.email.toLowerCase(),
          id: { not: employeeId },
        },
      });

      if (existingEmail) {
        throw new ConflictError('Email already exists in this company');
      }
    }

    // Verify department if updating
    if (input.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: input.departmentId, companyId: employee.companyId },
      });
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    // Verify designation if updating
    if (input.designationId) {
      const designation = await prisma.designation.findFirst({
        where: { id: input.designationId, companyId: employee.companyId },
      });
      if (!designation) {
        throw new NotFoundError('Designation not found');
      }
    }

    // Verify manager if updating
    if (input.managerId) {
      // Prevent self-reporting
      if (input.managerId === employeeId) {
        throw new BadRequestError('Employee cannot be their own manager');
      }

      const manager = await prisma.employee.findFirst({
        where: { id: input.managerId, companyId: employee.companyId },
      });
      if (!manager) {
        throw new NotFoundError('Manager not found');
      }
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...input,
        email: input.email?.toLowerCase(),
        dateOfBirth: input.dateOfBirth,
        updatedAt: new Date(),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return updatedEmployee;
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(
    employeeId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        _count: {
          select: {
            subordinates: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Check if employee has subordinates
    if (employee._count.subordinates > 0) {
      throw new BadRequestError(
        'Cannot delete employee with subordinates. Reassign or remove subordinates first.'
      );
    }

    // Soft delete
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        status: 'terminated',
        deletedAt: new Date(),
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return { message: 'Employee deleted successfully' };
  }

  /**
   * Update employee status
   */
  async updateEmployeeStatus(
    employeeId: string,
    status: string,
    terminationDate?: Date,
    terminationReason?: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updateData: any = { status };

    if (status === 'terminated') {
      updateData.terminationDate = terminationDate || new Date();
      updateData.terminationReason = terminationReason;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return updatedEmployee;
  }

  /**
   * Update bank details
   */
  async updateBankDetails(employeeId: string, bankDetails: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { bankDetails: true },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    let result;

    if (employee.bankDetails) {
      // Update existing bank details
      result = await prisma.bankDetails.update({
        where: { employeeId },
        data: bankDetails,
      });
    } else {
      // Create new bank details
      result = await prisma.bankDetails.create({
        data: {
          employeeId,
          ...bankDetails,
        },
      });
    }

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return result;
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(employeeId: string) {
    const contacts = await prisma.emergencyContact.findMany({
      where: { employeeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return contacts;
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(employeeId: string, contactData: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // If this is set as primary, unset other primary contacts
    if (contactData.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { employeeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        employeeId,
        ...contactData,
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return contact;
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    employeeId: string,
    contactId: string,
    contactData: any
  ) {
    const contact = await prisma.emergencyContact.findFirst({
      where: { id: contactId, employeeId },
    });

    if (!contact) {
      throw new NotFoundError('Emergency contact not found');
    }

    // If setting as primary, unset other primary contacts
    if (contactData.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { employeeId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updatedContact = await prisma.emergencyContact.update({
      where: { id: contactId },
      data: contactData,
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return updatedContact;
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(employeeId: string, contactId: string) {
    const contact = await prisma.emergencyContact.findFirst({
      where: { id: contactId, employeeId },
    });

    if (!contact) {
      throw new NotFoundError('Emergency contact not found');
    }

    await prisma.emergencyContact.delete({
      where: { id: contactId },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return { message: 'Emergency contact deleted successfully' };
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(employeeId: string, type?: string) {
    const where: any = { employeeId };

    if (type) {
      where.type = type;
    }

    const documents = await prisma.employeeDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }

  /**
   * Add employee document
   */
  async addEmployeeDocument(employeeId: string, documentData: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        ...documentData,
        expiryDate: documentData.expiryDate ? new Date(documentData.expiryDate) : null,
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return document;
  }

  /**
   * Update employee document
   */
  async updateEmployeeDocument(
    employeeId: string,
    documentId: string,
    documentData: any
  ) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const updatedDocument = await prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        ...documentData,
        expiryDate: documentData.expiryDate ? new Date(documentData.expiryDate) : undefined,
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return updatedDocument;
  }

  /**
   * Delete employee document
   */
  async deleteEmployeeDocument(employeeId: string, documentId: string) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return { message: 'Document deleted successfully' };
  }

  /**
   * Get reporting structure
   */
  async getReportingStructure(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            designation: {
              select: {
                name: true,
              },
            },
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            designation: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
      },
      manager: employee.manager,
      subordinates: employee.subordinates,
    };
  }

  /**
   * Update manager
   */
  async updateManager(employeeId: string, managerId: string | null) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Verify manager if provided
    if (managerId) {
      if (managerId === employeeId) {
        throw new BadRequestError('Employee cannot be their own manager');
      }

      const manager = await prisma.employee.findFirst({
        where: { id: managerId, companyId: employee.companyId },
      });

      if (!manager) {
        throw new NotFoundError('Manager not found');
      }

      // Check for circular reporting (manager reporting to subordinate)
      const checkCircular = await this.checkCircularReporting(employeeId, managerId);
      if (checkCircular) {
        throw new BadRequestError('Circular reporting structure detected');
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { managerId },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    // Clear cache
    await cache.del(cacheKeys.employee(employeeId));

    return updatedEmployee;
  }

  /**
   * Check for circular reporting
   */
  private async checkCircularReporting(
    employeeId: string,
    newManagerId: string
  ): Promise<boolean> {
    let currentManagerId = newManagerId;

    while (currentManagerId) {
      if (currentManagerId === employeeId) {
        return true; // Circular reference found
      }

      const manager = await prisma.employee.findUnique({
        where: { id: currentManagerId },
        select: { managerId: true },
      });

      if (!manager || !manager.managerId) {
        break;
      }

      currentManagerId = manager.managerId;
    }

    return false;
  }

  /**
   * Bulk create employees
   */
  async bulkCreateEmployees(
    employees: Array<any>,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const empData of employees) {
      try {
        const employee = await this.createEmployee(
          {
            ...empData,
            hireDate: new Date(empData.hireDate),
          },
          requestingUser
        );

        results.successful.push({
          employeeCode: employee.employeeCode,
          employeeId: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
        });
      } catch (error: any) {
        results.failed.push({
          employeeCode: empData.employeeCode,
          email: empData.email,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk update employee status
   */
  async bulkUpdateEmployeeStatus(
    employeeIds: string[],
    status: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const employeeId of employeeIds) {
      try {
        await this.updateEmployeeStatus(employeeId, status, undefined, undefined, requestingUser);
        results.successful.push(employeeId);
      } catch (error: any) {
        results.failed.push({
          employeeId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new EmployeeService();
