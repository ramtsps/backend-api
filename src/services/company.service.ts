import prisma from '@/lib/prisma';
import { cache, cacheKeys } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

interface CreateCompanyInput {
  name: string;
  industry?: string;
  companySize?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  registrationNumber?: string;
  subscription_tier?: string;
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  isActive?: boolean;
  settings?: any;
}

interface UpdateCompanyInput {
  name?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  registrationNumber?: string;
  subscription_tier?: string;
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  isActive?: boolean;
}

class CompanyService {
  /**
   * Get all companies with filters
   */
  async getCompanies(
    filters: any,
    page: number = 1,
    limit: number = 20,
    isSuperAdmin: boolean = false
  ) {
    if (!isSuperAdmin) {
      throw new ForbiddenError('Only super admins can view all companies');
    }

    const skip = (page - 1) * limit;
    const where: any = {};

    // Apply filters
    if (filters.industry) {
      where.industry = filters.industry;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    if (filters.subscription_tier) {
      where.subscription_tier = filters.subscription_tier;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          industry: true,
          companySize: true,
          website: true,
          email: true,
          phoneNumber: true,
          address: true,
          city: true,
          state: true,
          country: true,
          isActive: true,
          subscription_tier: true,
          subscription_start_date: true,
          subscription_end_date: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              employees: true,
              users: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.company.count({ where }),
    ]);

    return { companies, total, page, limit };
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: string, requestingUserId?: string) {
    // Try cache first
    const cached = await cache.get(cacheKeys.company(companyId));
    if (cached) {
      return cached;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
            departments: true,
            designations: true,
            projects: true,
          },
        },
        departments: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: {
              select: {
                employees: true,
              },
            },
          },
          where: { isActive: true },
          take: 10,
        },
        designations: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
          where: { isActive: true },
          take: 10,
        },
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Cache company data
    await cache.set(cacheKeys.company(companyId), company, 3600);

    return company;
  }

  /**
   * Create new company (Super Admin only)
   */
  async createCompany(input: CreateCompanyInput, isSuperAdmin: boolean) {
    if (!isSuperAdmin) {
      throw new ForbiddenError('Only super admins can create companies');
    }

    // Check if company name exists
    const existingCompany = await prisma.company.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });

    if (existingCompany) {
      throw new ConflictError('Company with this name already exists');
    }

    // Default subscription to trial if not provided
    const subscriptionTier = input.subscription_tier || 'trial';
    const subscriptionStartDate = input.subscription_start_date || new Date();
    const subscriptionEndDate = input.subscription_end_date || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial

    const company = await prisma.company.create({
      data: {
        name: input.name,
        industry: input.industry,
        companySize: input.companySize,
        website: input.website,
        email: input.email,
        phoneNumber: input.phoneNumber,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        taxId: input.taxId,
        registrationNumber: input.registrationNumber,
        subscription_tier: subscriptionTier,
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        isActive: input.isActive !== undefined ? input.isActive : true,
        settings: input.settings || this.getDefaultSettings(),
        features: this.getDefaultFeatures(input.industry),
      },
    });

    return company;
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Permission check: Super admin or same company admin
    if (!requestingUser.isSuperAdmin && requestingUser.companyId !== companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...input,
        subscription_start_date: input.subscription_start_date ? new Date(input.subscription_start_date) : undefined,
        subscription_end_date: input.subscription_end_date ? new Date(input.subscription_end_date) : undefined,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    await cache.del(cacheKeys.company(companyId));

    return updatedCompany;
  }

  /**
   * Delete company (Super Admin only)
   */
  async deleteCompany(companyId: string, isSuperAdmin: boolean) {
    if (!isSuperAdmin) {
      throw new ForbiddenError('Only super admins can delete companies');
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Prevent deletion if company has employees or users
    if (company._count.employees > 0 || company._count.users > 0) {
      throw new BadRequestError(
        'Cannot delete company with existing employees or users. Deactivate instead.'
      );
    }

    // Soft delete
    await prisma.company.update({
      where: { id: companyId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Clear cache
    await cache.del(cacheKeys.company(companyId));

    return { message: 'Company deleted successfully' };
  }

  /**
   * Get company configuration
   */
  async getCompanyConfiguration(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return {
      companyId: company.id,
      companyName: company.name,
      configuration: company.settings || this.getDefaultSettings(),
    };
  }

  /**
   * Update company configuration
   */
  async updateCompanyConfiguration(
    companyId: string,
    configuration: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Permission check
    if (!requestingUser.isSuperAdmin && requestingUser.companyId !== companyId) {
      throw new ForbiddenError('Access denied');
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Merge with existing settings
    const currentSettings = (company.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...configuration,
      general: { ...currentSettings.general, ...configuration.general },
      attendance: { ...currentSettings.attendance, ...configuration.attendance },
      leave: { ...currentSettings.leave, ...configuration.leave },
      payroll: { ...currentSettings.payroll, ...configuration.payroll },
    };

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: updatedSettings },
    });

    // Clear cache
    await cache.del(cacheKeys.company(companyId));

    return { message: 'Configuration updated successfully', configuration: updatedSettings };
  }

  /**
   * Get company features
   */
  async getCompanyFeatures(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        industry: true,
        features: true,
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return {
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      features: company.features || this.getDefaultFeatures(company.industry),
    };
  }

  /**
   * Update company features
   */
  async updateCompanyFeatures(
    companyId: string,
    features: any,
    isSuperAdmin: boolean
  ) {
    if (!isSuperAdmin) {
      throw new ForbiddenError('Only super admins can update company features');
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { features: features.features },
    });

    // Clear cache
    await cache.del(cacheKeys.company(companyId));

    return { message: 'Features updated successfully', features: updatedCompany.features };
  }

  /**
   * Get default settings
   */
  private getDefaultSettings() {
    return {
      general: {
        fiscalYearStart: 'April',
        weekStartDay: 'monday',
        timeZone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'USD',
      },
      attendance: {
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
        halfDayHours: 4,
        fullDayHours: 8,
        allowEarlyCheckout: false,
        lateMarkGracePeriod: 15,
      },
      leave: {
        allowNegativeBalance: false,
        carryForwardEnabled: true,
        maxCarryForwardDays: 10,
        probationLeaveEnabled: false,
        advanceLeaveEnabled: true,
      },
      payroll: {
        payrollCycle: 'monthly',
        salaryProcessingDay: 1,
        paymentMode: 'bank_transfer',
        overtimeEnabled: false,
        overtimeRate: 1.5,
      },
    };
  }

  /**
   * Get default features based on industry
   */
  private getDefaultFeatures(industry?: string | null) {
    const baseFeatures = {
      attendance: true,
      leave: true,
      payroll: true,
      projects: false,
      tasks: false,
      timesheets: false,
      performance: true,
      skills: true,
      documents: true,
      invoicing: false,
      accounting: false,
      leads: false,
      recruitment: true,
      training: true,
    };

    // Customize based on industry
    if (industry === 'IT' || industry === 'Software') {
      return {
        ...baseFeatures,
        projects: true,
        tasks: true,
        timesheets: true,
      };
    }

    if (industry === 'Consulting' || industry === 'Professional Services') {
      return {
        ...baseFeatures,
        projects: true,
        tasks: true,
        timesheets: true,
        invoicing: true,
        accounting: true,
        leads: true,
      };
    }

    return baseFeatures;
  }

  // ===== DEPARTMENTS =====

  /**
   * Get company departments
   */
  async getDepartments(
    companyId: string,
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          head: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          _count: {
            select: {
              employees: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.department.count({ where }),
    ]);

    return { departments, total, page, limit };
  }

  /**
   * Create department
   */
  async createDepartment(companyId: string, input: any) {
    // Check if department name exists
    const existingDept = await prisma.department.findFirst({
      where: {
        companyId,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });

    if (existingDept) {
      throw new ConflictError('Department with this name already exists');
    }

    // If headId provided, verify employee exists
    if (input.headId) {
      const employee = await prisma.employee.findUnique({
        where: { id: input.headId },
      });
      if (!employee || employee.companyId !== companyId) {
        throw new NotFoundError('Department head not found');
      }
    }

    const department = await prisma.department.create({
      data: {
        name: input.name,
        description: input.description,
        companyId,
        headId: input.headId,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
      include: {
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    return department;
  }

  /**
   * Update department
   */
  async updateDepartment(companyId: string, departmentId: string, input: any) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Check name uniqueness if updating name
    if (input.name && input.name !== department.name) {
      const existingDept = await prisma.department.findFirst({
        where: {
          companyId,
          name: { equals: input.name, mode: 'insensitive' },
          id: { not: departmentId },
        },
      });

      if (existingDept) {
        throw new ConflictError('Department with this name already exists');
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id: departmentId },
      data: input,
    });

    return updatedDepartment;
  }

  /**
   * Delete department
   */
  async deleteDepartment(companyId: string, departmentId: string) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    if (department._count.employees > 0) {
      throw new BadRequestError(
        'Cannot delete department with existing employees. Deactivate instead.'
      );
    }

    await prisma.department.delete({
      where: { id: departmentId },
    });

    return { message: 'Department deleted successfully' };
  }

  // ===== DESIGNATIONS =====

  /**
   * Get company designations
   */
  async getDesignations(
    companyId: string,
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const [designations, total] = await Promise.all([
      prisma.designation.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              employees: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.designation.count({ where }),
    ]);

    return { designations, total, page, limit };
  }

  /**
   * Create designation
   */
  async createDesignation(companyId: string, input: any) {
    // Check if designation name exists
    const existingDesig = await prisma.designation.findFirst({
      where: {
        companyId,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });

    if (existingDesig) {
      throw new ConflictError('Designation with this name already exists');
    }

    // If departmentId provided, verify it exists
    if (input.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: input.departmentId, companyId },
      });
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    const designation = await prisma.designation.create({
      data: {
        name: input.name,
        description: input.description,
        companyId,
        departmentId: input.departmentId,
        level: input.level,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return designation;
  }

  /**
   * Update designation
   */
  async updateDesignation(companyId: string, designationId: string, input: any) {
    const designation = await prisma.designation.findFirst({
      where: { id: designationId, companyId },
    });

    if (!designation) {
      throw new NotFoundError('Designation not found');
    }

    // Check name uniqueness if updating name
    if (input.name && input.name !== designation.name) {
      const existingDesig = await prisma.designation.findFirst({
        where: {
          companyId,
          name: { equals: input.name, mode: 'insensitive' },
          id: { not: designationId },
        },
      });

      if (existingDesig) {
        throw new ConflictError('Designation with this name already exists');
      }
    }

    const updatedDesignation = await prisma.designation.update({
      where: { id: designationId },
      data: input,
    });

    return updatedDesignation;
  }

  /**
   * Delete designation
   */
  async deleteDesignation(companyId: string, designationId: string) {
    const designation = await prisma.designation.findFirst({
      where: { id: designationId, companyId },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!designation) {
      throw new NotFoundError('Designation not found');
    }

    if (designation._count.employees > 0) {
      throw new BadRequestError(
        'Cannot delete designation with existing employees. Deactivate instead.'
      );
    }

    await prisma.designation.delete({
      where: { id: designationId },
    });

    return { message: 'Designation deleted successfully' };
  }
}

export default new CompanyService();
