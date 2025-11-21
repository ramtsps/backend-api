import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class LeaveService {
  // ===== LEAVE TYPES =====

  /**
   * Get all leave types
   */
  async getLeaveTypes(
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

    const [leaveTypes, total] = await Promise.all([
      prisma.leaveType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.leaveType.count({ where }),
    ]);

    return { leaveTypes, total, page, limit };
  }

  /**
   * Create leave type
   */
  async createLeaveType(data: any, requestingUser: { companyId?: string; isSuperAdmin: boolean }) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check if code already exists
    const existing = await prisma.leaveType.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existing) {
      throw new ConflictError('Leave type code already exists');
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        ...data,
        companyId,
      },
    });

    return leaveType;
  }

  /**
   * Update leave type
   */
  async updateLeaveType(leaveTypeId: string, data: any) {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }

    const updated = await prisma.leaveType.update({
      where: { id: leaveTypeId },
      data,
    });

    return updated;
  }

  /**
   * Delete leave type
   */
  async deleteLeaveType(leaveTypeId: string) {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      include: {
        _count: {
          select: {
            leaveRequests: true,
          },
        },
      },
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }

    if (leaveType._count.leaveRequests > 0) {
      throw new BadRequestError('Cannot delete leave type with existing leave requests');
    }

    await prisma.leaveType.delete({
      where: { id: leaveTypeId },
    });

    return { message: 'Leave type deleted successfully' };
  }

  // ===== LEAVE REQUESTS =====

  /**
   * Get leave requests
   */
  async getLeaveRequests(
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

    if (filters.leaveTypeId) {
      where.leaveTypeId = filters.leaveTypeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startDate.lte = new Date(filters.endDate);
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [leaveRequests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
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
          leaveType: {
            select: {
              id: true,
              name: true,
              code: true,
              color: true,
              isPaid: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { leaveRequests, total, page, limit };
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(leaveRequestId: string) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            isPaid: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    return leaveRequest;
  }

  /**
   * Create leave request
   */
  async createLeaveRequest(data: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: data.leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }

    if (!leaveType.isActive) {
      throw new BadRequestError('Leave type is not active');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new BadRequestError('End date cannot be before start date');
    }

    // Calculate number of days
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const numberOfDays = data.isHalfDay ? 0.5 : daysDifference;

    // Check for overlapping leave requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: data.employeeId,
        status: {
          in: ['pending', 'approved'],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictError('Leave request overlaps with existing leave');
    }

    // Get current leave balance
    const currentYear = new Date().getFullYear();
    const balance = await this.getEmployeeLeaveBalance(data.employeeId, leaveType.id, currentYear);

    if (balance.available < numberOfDays) {
      throw new BadRequestError(`Insufficient leave balance. Available: ${balance.available} days`);
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate,
        endDate,
        numberOfDays,
        reason: data.reason,
        isHalfDay: data.isHalfDay || false,
        halfDayPeriod: data.halfDayPeriod,
        contactDuringLeave: data.contactDuringLeave,
        attachments: data.attachments || [],
        status: 'pending',
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
        leaveType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return leaveRequest;
  }

  /**
   * Update leave request
   */
  async updateLeaveRequest(leaveRequestId: string, data: any) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestError('Can only update pending leave requests');
    }

    // Recalculate days if dates changed
    let numberOfDays = leaveRequest.numberOfDays;
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ? new Date(data.startDate) : leaveRequest.startDate;
      const endDate = data.endDate ? new Date(data.endDate) : leaveRequest.endDate;
      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      numberOfDays = data.isHalfDay ? 0.5 : daysDifference;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        numberOfDays,
      },
    });

    return updated;
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(leaveRequestId: string, cancellationReason: string) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    if (leaveRequest.status === 'cancelled') {
      throw new BadRequestError('Leave request already cancelled');
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: 'cancelled',
        cancellationReason,
        cancelledAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Approve/Reject leave request
   */
  async approveLeaveRequest(
    leaveRequestId: string,
    status: 'approved' | 'rejected',
    remarks?: string,
    approverId?: string
  ) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestError('Can only approve/reject pending leave requests');
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        approverRemarks: remarks,
        approvedAt: status === 'approved' ? new Date() : null,
        approvedBy: status === 'approved' ? approverId : null,
        rejectedAt: status === 'rejected' ? new Date() : null,
      },
    });

    // If approved, deduct from leave balance
    if (status === 'approved') {
      await this.deductLeaveBalance(
        leaveRequest.employeeId,
        leaveRequest.leaveTypeId,
        leaveRequest.numberOfDays,
        new Date().getFullYear()
      );
    }

    return updated;
  }

  // ===== LEAVE BALANCE =====

  /**
   * Get employee leave balance
   */
  private async getEmployeeLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number
  ) {
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId,
        leaveTypeId,
        year,
      },
    });

    if (!balance) {
      // Initialize balance from leave type
      const leaveType = await prisma.leaveType.findUnique({
        where: { id: leaveTypeId },
      });

      if (!leaveType) {
        throw new NotFoundError('Leave type not found');
      }

      const newBalance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId,
          year,
          allocated: leaveType.daysPerYear,
          used: 0,
          available: leaveType.daysPerYear,
          carriedForward: 0,
        },
      });

      return newBalance;
    }

    return balance;
  }

  /**
   * Get all leave balances for employee
   */
  async getLeaveBalances(employeeId: string, year?: number) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const currentYear = year || new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true,
            isPaid: true,
          },
        },
      },
    });

    return { employeeId, year: currentYear, balances };
  }

  /**
   * Deduct from leave balance
   */
  private async deductLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    days: number,
    year: number
  ) {
    const balance = await this.getEmployeeLeaveBalance(employeeId, leaveTypeId, year);

    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        used: balance.used + days,
        available: balance.available - days,
      },
    });
  }

  /**
   * Adjust leave balance (manual adjustment)
   */
  async adjustLeaveBalance(data: any) {
    const balance = await this.getEmployeeLeaveBalance(
      data.employeeId,
      data.leaveTypeId,
      data.year
    );

    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        allocated: balance.allocated + data.adjustment,
        available: balance.available + data.adjustment,
      },
    });

    // Log adjustment
    await prisma.leaveBalanceAdjustment.create({
      data: {
        leaveBalanceId: balance.id,
        adjustment: data.adjustment,
        reason: data.reason,
        adjustedBy: data.adjustedBy,
      },
    });

    return await this.getEmployeeLeaveBalance(data.employeeId, data.leaveTypeId, data.year);
  }

  // ===== LEAVE CALENDAR =====

  /**
   * Get leave calendar
   */
  async getLeaveCalendar(
    filters: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const where: any = {
      status: 'approved',
    };

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

    if (filters.startDate && filters.endDate) {
      where.OR = [
        {
          AND: [
            { startDate: { lte: new Date(filters.endDate) } },
            { endDate: { gte: new Date(filters.startDate) } },
          ],
        },
      ];
    }

    const leaves = await prisma.leaveRequest.findMany({
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
                name: true,
              },
            },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return leaves;
  }

  // ===== REPORTS =====

  /**
   * Get leave report
   */
  async getLeaveReport(
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

    if (filters.leaveTypeId) {
      where.leaveTypeId = filters.leaveTypeId;
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startDate.lte = new Date(filters.endDate);
      }
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
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
        leaveType: {
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

    leaveRequests.forEach(lr => {
      let key: string;

      switch (groupBy) {
        case 'leaveType':
          key = lr.leaveTypeId;
          break;
        case 'department':
          key = lr.employee.department?.id || 'unassigned';
          break;
        case 'month':
          key = `${lr.startDate.getFullYear()}-${(lr.startDate.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default: // employee
          key = lr.employeeId;
      }

      if (!grouped[key]) {
        grouped[key] = {
          totalDays: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          requests: [],
        };
      }

      grouped[key].totalDays += lr.numberOfDays;
      grouped[key][lr.status] += 1;
      grouped[key].requests.push(lr);
    });

    return {
      summary: {
        totalRequests: leaveRequests.length,
        totalDays: parseFloat(leaveRequests.reduce((sum, lr) => sum + lr.numberOfDays, 0).toFixed(2)),
        approved: leaveRequests.filter(lr => lr.status === 'approved').length,
        pending: leaveRequests.filter(lr => lr.status === 'pending').length,
        rejected: leaveRequests.filter(lr => lr.status === 'rejected').length,
        cancelled: leaveRequests.filter(lr => lr.status === 'cancelled').length,
      },
      groupedData: grouped,
    };
  }

  /**
   * Bulk approve leave requests
   */
  async bulkApproveLeaveRequests(
    leaveRequestIds: string[],
    status: 'approved' | 'rejected',
    remarks?: string,
    approverId?: string
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const leaveRequestId of leaveRequestIds) {
      try {
        await this.approveLeaveRequest(leaveRequestId, status, remarks, approverId);
        results.successful.push(leaveRequestId);
      } catch (error: any) {
        results.failed.push({
          leaveRequestId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new LeaveService();
