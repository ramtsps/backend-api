import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

interface CreateTimesheetInput {
  employeeId: string;
  projectId?: string;
  taskId?: string;
  date: Date;
  hours: number;
  description: string;
  billable?: boolean;
  status?: string;
}

interface UpdateTimesheetInput {
  projectId?: string;
  taskId?: string;
  date?: Date;
  hours?: number;
  description?: string;
  billable?: boolean;
  status?: string;
}

class TimesheetService {
  /**
   * Get timesheets with filters
   */
  async getTimesheets(
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

    // Apply filters
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.taskId) {
      where.taskId = filters.taskId;
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

    // Sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.date = 'desc';
    }

    const [timesheets, total] = await Promise.all([
      prisma.timesheet.findMany({
        where,
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
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              taskNumber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.timesheet.count({ where }),
    ]);

    return { timesheets, total, page, limit };
  }

  /**
   * Get timesheet by ID
   */
  async getTimesheetById(timesheetId: string) {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
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
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            taskNumber: true,
            status: true,
          },
        },
      },
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    return timesheet;
  }

  /**
   * Create timesheet entry
   */
  async createTimesheet(
    input: CreateTimesheetInput,
    requestingUser: { companyId?: string; isSuperAdmin: boolean; userId: string }
  ) {
    // Verify employee
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify project if provided
    if (input.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (project.companyId !== employee.companyId) {
        throw new BadRequestError('Project does not belong to the employee company');
      }
    }

    // Verify task if provided
    if (input.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      if (input.projectId && task.projectId !== input.projectId) {
        throw new BadRequestError('Task does not belong to the specified project');
      }
    }

    // Check for duplicate entry on same date
    const date = new Date(input.date);
    date.setHours(0, 0, 0, 0);

    const existingTimesheet = await prisma.timesheet.findFirst({
      where: {
        employeeId: input.employeeId,
        projectId: input.projectId || null,
        taskId: input.taskId || null,
        date,
      },
    });

    if (existingTimesheet) {
      throw new ConflictError('Timesheet entry already exists for this date and task/project');
    }

    // Create timesheet
    const timesheet = await prisma.timesheet.create({
      data: {
        employeeId: input.employeeId,
        projectId: input.projectId,
        taskId: input.taskId,
        date,
        hours: input.hours,
        description: input.description,
        billable: input.billable || false,
        status: input.status || 'draft',
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return timesheet;
  }

  /**
   * Update timesheet
   */
  async updateTimesheet(
    timesheetId: string,
    input: UpdateTimesheetInput,
    requestingUser: { companyId?: string; isSuperAdmin: boolean; userId: string }
  ) {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { employee: true },
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && timesheet.employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Can only edit draft or rejected timesheets
    if (timesheet.status === 'submitted' || timesheet.status === 'approved') {
      throw new BadRequestError('Cannot edit submitted or approved timesheets');
    }

    // Verify project if updating
    if (input.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }
    }

    // Verify task if updating
    if (input.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        date: input.date,
        hours: input.hours,
        description: input.description,
        billable: input.billable,
        status: input.status,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return updatedTimesheet;
  }

  /**
   * Delete timesheet
   */
  async deleteTimesheet(
    timesheetId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { employee: true },
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && timesheet.employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Can only delete draft timesheets
    if (timesheet.status !== 'draft') {
      throw new BadRequestError('Can only delete draft timesheets');
    }

    await prisma.timesheet.delete({
      where: { id: timesheetId },
    });

    return { message: 'Timesheet deleted successfully' };
  }

  /**
   * Submit timesheets for approval
   */
  async submitTimesheets(
    timesheetIds: string[],
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const timesheetId of timesheetIds) {
      try {
        const timesheet = await prisma.timesheet.findUnique({
          where: { id: timesheetId },
          include: { employee: true },
        });

        if (!timesheet) {
          throw new NotFoundError('Timesheet not found');
        }

        // Multi-tenant check
        if (!requestingUser.isSuperAdmin && timesheet.employee.companyId !== requestingUser.companyId) {
          throw new ForbiddenError('Access denied');
        }

        if (timesheet.status !== 'draft') {
          throw new BadRequestError('Can only submit draft timesheets');
        }

        await prisma.timesheet.update({
          where: { id: timesheetId },
          data: {
            status: 'submitted',
            submittedAt: new Date(),
          },
        });

        results.successful.push(timesheetId);
      } catch (error: any) {
        results.failed.push({
          timesheetId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Approve/Reject timesheet
   */
  async approveTimesheet(
    timesheetId: string,
    status: 'approved' | 'rejected',
    remarks?: string,
    approverId?: string
  ) {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestError('Can only approve/reject submitted timesheets');
    }

    const updatedTimesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status,
        approverRemarks: remarks,
        approvedAt: status === 'approved' ? new Date() : null,
        approvedBy: status === 'approved' ? approverId : null,
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
      },
    });

    return updatedTimesheet;
  }

  /**
   * Get employee timesheet summary
   */
  async getEmployeeTimesheetSummary(
    employeeId: string,
    filters: any
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const where: any = { employeeId };

    if (filters.projectId) {
      where.projectId = filters.projectId;
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

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate summary
    const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = timesheets.filter(t => t.billable).reduce((sum, t) => sum + t.hours, 0);
    const nonBillableHours = totalHours - billableHours;

    const byStatus = {
      draft: timesheets.filter(t => t.status === 'draft').length,
      submitted: timesheets.filter(t => t.status === 'submitted').length,
      approved: timesheets.filter(t => t.status === 'approved').length,
      rejected: timesheets.filter(t => t.status === 'rejected').length,
    };

    // Group by project
    const byProject = timesheets.reduce((acc: any, t) => {
      const projectId = t.projectId || 'unassigned';
      const projectName = t.project?.name || 'Unassigned';
      
      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          projectName,
          hours: 0,
          entries: 0,
        };
      }
      
      acc[projectId].hours += t.hours;
      acc[projectId].entries += 1;
      
      return acc;
    }, {});

    return {
      employeeId,
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        billableHours: parseFloat(billableHours.toFixed(2)),
        nonBillableHours: parseFloat(nonBillableHours.toFixed(2)),
        totalEntries: timesheets.length,
        byStatus,
      },
      byProject: Object.values(byProject),
      timesheets,
    };
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: 'submitted',
    };

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.employee = {
        companyId: requestingUser.companyId,
      };
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    const [timesheets, total] = await Promise.all([
      prisma.timesheet.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.timesheet.count({ where }),
    ]);

    return { timesheets, total, page, limit };
  }

  /**
   * Bulk create timesheets
   */
  async bulkCreateTimesheets(
    timesheets: Array<any>,
    requestingUser: { companyId?: string; isSuperAdmin: boolean; userId: string }
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const timesheetData of timesheets) {
      try {
        const timesheet = await this.createTimesheet(
          {
            ...timesheetData,
            date: new Date(timesheetData.date),
          },
          requestingUser
        );

        results.successful.push({
          timesheetId: timesheet.id,
          employeeId: timesheet.employeeId,
          date: timesheet.date,
        });
      } catch (error: any) {
        results.failed.push({
          employeeId: timesheetData.employeeId,
          date: timesheetData.date,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get timesheet report
   */
  async getTimesheetReport(
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

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: filters.departmentId,
      };
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

    const timesheets = await prisma.timesheet.findMany({
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
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Group data based on groupBy parameter
    const groupBy = filters.groupBy || 'employee';
    let groupedData: any = {};

    timesheets.forEach(t => {
      let key: string;
      
      switch (groupBy) {
        case 'project':
          key = t.projectId || 'unassigned';
          break;
        case 'task':
          key = t.taskId || 'unassigned';
          break;
        case 'date':
          key = t.date.toISOString().split('T')[0];
          break;
        default: // employee
          key = t.employeeId;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          details: [],
        };
      }

      groupedData[key].totalHours += t.hours;
      groupedData[key].billableHours += t.billable ? t.hours : 0;
      groupedData[key].entries += 1;
      groupedData[key].details.push(t);
    });

    return {
      summary: {
        totalHours: parseFloat(timesheets.reduce((sum, t) => sum + t.hours, 0).toFixed(2)),
        billableHours: parseFloat(timesheets.filter(t => t.billable).reduce((sum, t) => sum + t.hours, 0).toFixed(2)),
        totalEntries: timesheets.length,
      },
      groupedData,
    };
  }
}

export default new TimesheetService();
