import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class ExpenseService {
  // ===== EXPENSE CATEGORIES =====

  /**
   * Get expense categories
   */
  async getExpenseCategories(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const [categories, total] = await Promise.all([
      prisma.expenseCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.expenseCategory.count({ where }),
    ]);

    return { categories, total, page, limit };
  }

  /**
   * Create expense category
   */
  async createExpenseCategory(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check for duplicate code
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existing) {
      throw new ConflictError('Expense category code already exists');
    }

    const category = await prisma.expenseCategory.create({
      data: {
        ...data,
        companyId,
      },
    });

    return category;
  }

  /**
   * Update expense category
   */
  async updateExpenseCategory(categoryId: string, data: any) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundError('Expense category not found');
    }

    const updated = await prisma.expenseCategory.update({
      where: { id: categoryId },
      data,
    });

    return updated;
  }

  /**
   * Delete expense category
   */
  async deleteExpenseCategory(categoryId: string) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            expenseClaims: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Expense category not found');
    }

    if (category._count.expenseClaims > 0) {
      throw new BadRequestError('Cannot delete category with existing expense claims');
    }

    await prisma.expenseCategory.delete({
      where: { id: categoryId },
    });

    return { message: 'Expense category deleted successfully' };
  }

  // ===== EXPENSE CLAIMS =====

  /**
   * Get expense claims
   */
  async getExpenseClaims(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.employee = {
        companyId: requestingUser.companyId,
      };
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.date = 'desc';
    }

    const [expenseClaims, total] = await Promise.all([
      prisma.expenseClaim.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              email: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.expenseClaim.count({ where }),
    ]);

    return { expenseClaims, total, page, limit };
  }

  /**
   * Get expense claim by ID
   */
  async getExpenseClaimById(expenseClaimId: string) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            bankDetails: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            requiresReceipt: true,
            maxAmount: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    return expenseClaim;
  }

  /**
   * Create expense claim
   */
  async createExpenseClaim(data: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const category = await prisma.expenseCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundError('Expense category not found');
    }

    if (!category.isActive) {
      throw new BadRequestError('Expense category is not active');
    }

    // Check max amount if set
    if (category.maxAmount && data.amount > category.maxAmount) {
      throw new BadRequestError(`Amount exceeds category maximum of ${category.maxAmount}`);
    }

    // Check if receipt is required
    if (category.requiresReceipt && !data.receiptUrl) {
      throw new BadRequestError('Receipt is required for this category');
    }

    // Verify project if provided
    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }
    }

    const expenseClaim = await prisma.expenseClaim.create({
      data: {
        employeeId: data.employeeId,
        categoryId: data.categoryId,
        date: new Date(data.date),
        amount: data.amount,
        merchant: data.merchant,
        description: data.description,
        receiptUrl: data.receiptUrl,
        paymentMethod: data.paymentMethod || 'cash',
        projectId: data.projectId,
        billable: data.billable || false,
        status: 'draft',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return expenseClaim;
  }

  /**
   * Update expense claim
   */
  async updateExpenseClaim(expenseClaimId: string, data: any) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
      include: { category: true },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    if (expenseClaim.status !== 'draft') {
      throw new BadRequestError('Can only update draft expense claims');
    }

    // If category is being changed, validate it
    let category = expenseClaim.category;
    if (data.categoryId && data.categoryId !== expenseClaim.categoryId) {
      const newCategory = await prisma.expenseCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!newCategory) {
        throw new NotFoundError('Expense category not found');
      }

      category = newCategory;
    }

    // Check max amount if being updated
    const amount = data.amount !== undefined ? data.amount : expenseClaim.amount;
    if (category.maxAmount && amount > category.maxAmount) {
      throw new BadRequestError(`Amount exceeds category maximum of ${category.maxAmount}`);
    }

    const updated = await prisma.expenseClaim.update({
      where: { id: expenseClaimId },
      data: {
        categoryId: data.categoryId,
        date: data.date ? new Date(data.date) : undefined,
        amount: data.amount,
        merchant: data.merchant,
        description: data.description,
        receiptUrl: data.receiptUrl,
        paymentMethod: data.paymentMethod,
        projectId: data.projectId,
        billable: data.billable,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete expense claim
   */
  async deleteExpenseClaim(expenseClaimId: string) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    if (expenseClaim.status !== 'draft') {
      throw new BadRequestError('Can only delete draft expense claims');
    }

    await prisma.expenseClaim.delete({
      where: { id: expenseClaimId },
    });

    return { message: 'Expense claim deleted successfully' };
  }

  /**
   * Submit expense claim
   */
  async submitExpenseClaim(expenseClaimId: string) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
      include: { category: true },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    if (expenseClaim.status !== 'draft') {
      throw new BadRequestError('Can only submit draft expense claims');
    }

    // Final validation before submission
    if (expenseClaim.category.requiresReceipt && !expenseClaim.receiptUrl) {
      throw new BadRequestError('Receipt is required for submission');
    }

    const updated = await prisma.expenseClaim.update({
      where: { id: expenseClaimId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Approve/Reject expense claim
   */
  async approveExpenseClaim(
    expenseClaimId: string,
    status: 'approved' | 'rejected',
    approvedAmount?: number,
    remarks?: string,
    approverId?: string
  ) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    if (expenseClaim.status !== 'submitted') {
      throw new BadRequestError('Can only approve/reject submitted expense claims');
    }

    // If approving with different amount
    const finalAmount = status === 'approved' 
      ? (approvedAmount !== undefined ? approvedAmount : expenseClaim.amount)
      : expenseClaim.amount;

    const updated = await prisma.expenseClaim.update({
      where: { id: expenseClaimId },
      data: {
        status,
        approvedAmount: status === 'approved' ? finalAmount : null,
        approverRemarks: remarks,
        approvedAt: status === 'approved' ? new Date() : null,
        approvedBy: status === 'approved' ? approverId : null,
        rejectedAt: status === 'rejected' ? new Date() : null,
      },
    });

    return updated;
  }

  /**
   * Reimburse expense claim
   */
  async reimburseExpenseClaim(expenseClaimId: string, data: any) {
    const expenseClaim = await prisma.expenseClaim.findUnique({
      where: { id: expenseClaimId },
      include: { employee: true },
    });

    if (!expenseClaim) {
      throw new NotFoundError('Expense claim not found');
    }

    if (expenseClaim.status !== 'approved') {
      throw new BadRequestError('Can only reimburse approved expense claims');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        companyId: expenseClaim.employee.companyId,
        employeeId: expenseClaim.employeeId,
        amount: expenseClaim.approvedAmount || expenseClaim.amount,
        paymentDate: new Date(data.reimbursementDate),
        paymentMethod: data.paymentMethod,
        paymentType: 'expense_reimbursement',
        status: 'completed',
        transactionReference: data.transactionReference,
      },
    });

    const updated = await prisma.expenseClaim.update({
      where: { id: expenseClaimId },
      data: {
        status: 'reimbursed',
        reimbursedAt: new Date(data.reimbursementDate),
        reimbursementMethod: data.paymentMethod,
        reimbursementReference: data.transactionReference,
        paymentId: payment.id,
      },
    });

    return updated;
  }

  // ===== REPORTS =====

  /**
   * Get expense report
   */
  async getExpenseReport(
    filters: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.employee = {
        companyId: requestingUser.companyId,
      };
    }

    if (filters.companyId) {
      where.employee = {
        ...where.employee,
        companyId: filters.companyId,
      };
    }

    if (filters.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: filters.departmentId,
      };
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const expenseClaims = await prisma.expenseClaim.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Group by specified field
    const groupBy = filters.groupBy || 'employee';
    const grouped: any = {};

    expenseClaims.forEach(ec => {
      let key: string;

      switch (groupBy) {
        case 'category':
          key = ec.categoryId;
          break;
        case 'department':
          key = ec.employee.department?.id || 'unassigned';
          break;
        case 'month':
          key = `${ec.date.getFullYear()}-${(ec.date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default: // employee
          key = ec.employeeId;
      }

      if (!grouped[key]) {
        grouped[key] = {
          totalAmount: 0,
          approvedAmount: 0,
          reimbursedAmount: 0,
          count: 0,
          claims: [],
        };
      }

      grouped[key].totalAmount += ec.amount;
      grouped[key].approvedAmount += ec.approvedAmount || 0;
      grouped[key].reimbursedAmount += ec.status === 'reimbursed' ? (ec.approvedAmount || ec.amount) : 0;
      grouped[key].count += 1;
      grouped[key].claims.push(ec);
    });

    return {
      summary: {
        totalClaims: expenseClaims.length,
        totalAmount: parseFloat(expenseClaims.reduce((sum, ec) => sum + ec.amount, 0).toFixed(2)),
        approvedAmount: parseFloat(expenseClaims.reduce((sum, ec) => sum + (ec.approvedAmount || 0), 0).toFixed(2)),
        reimbursedAmount: parseFloat(
          expenseClaims
            .filter(ec => ec.status === 'reimbursed')
            .reduce((sum, ec) => sum + (ec.approvedAmount || ec.amount), 0)
            .toFixed(2)
        ),
        pending: expenseClaims.filter(ec => ec.status === 'submitted').length,
        approved: expenseClaims.filter(ec => ec.status === 'approved').length,
        rejected: expenseClaims.filter(ec => ec.status === 'rejected').length,
        reimbursed: expenseClaims.filter(ec => ec.status === 'reimbursed').length,
      },
      groupedData: grouped,
    };
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk submit expense claims
   */
  async bulkSubmitExpenseClaims(expenseClaimIds: string[]) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const expenseClaimId of expenseClaimIds) {
      try {
        await this.submitExpenseClaim(expenseClaimId);
        results.successful.push(expenseClaimId);
      } catch (error: any) {
        results.failed.push({
          expenseClaimId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk approve expense claims
   */
  async bulkApproveExpenseClaims(
    expenseClaimIds: string[],
    status: 'approved' | 'rejected',
    remarks?: string,
    approverId?: string
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const expenseClaimId of expenseClaimIds) {
      try {
        await this.approveExpenseClaim(expenseClaimId, status, undefined, remarks, approverId);
        results.successful.push(expenseClaimId);
      } catch (error: any) {
        results.failed.push({
          expenseClaimId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk reimburse expense claims
   */
  async bulkReimburseExpenseClaims(expenseClaimIds: string[], data: any) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const expenseClaimId of expenseClaimIds) {
      try {
        await this.reimburseExpenseClaim(expenseClaimId, data);
        results.successful.push(expenseClaimId);
      } catch (error: any) {
        results.failed.push({
          expenseClaimId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new ExpenseService();
