import prisma from '@/lib/prisma';
import { cache, cacheKeys } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

interface ClockInInput {
  employeeId: string;
  clockInTime?: Date;
  location?: string;
  latitude?: number;
  longitude?: number;
  deviceInfo?: string;
  remarks?: string;
}

interface ClockOutInput {
  attendanceId: string;
  clockOutTime?: Date;
  location?: string;
  latitude?: number;
  longitude?: number;
  remarks?: string;
}

class AttendanceService {
  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(
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

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
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
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.attendance.count({ where }),
    ]);

    return { records, total, page, limit };
  }

  /**
   * Get attendance by ID
   */
  async getAttendanceById(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
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
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    return attendance;
  }

  /**
   * Clock in
   */
  async clockIn(input: ClockInInput) {
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        company: {
          select: {
            settings: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status !== 'active') {
      throw new BadRequestError('Employee is not active');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: input.employeeId,
        date: today,
      },
    });

    if (existingAttendance) {
      throw new ConflictError('Already clocked in for today');
    }

    const clockInTime = input.clockInTime || new Date();
    
    // Get company settings for late mark calculation
    const companySettings = employee.company.settings as any;
    const workingHoursStart = companySettings?.attendance?.workingHoursStart || '09:00';
    const lateMarkGracePeriod = companySettings?.attendance?.lateMarkGracePeriod || 15;

    // Calculate if late
    const [expectedHour, expectedMinute] = workingHoursStart.split(':').map(Number);
    const expectedTime = new Date(clockInTime);
    expectedTime.setHours(expectedHour, expectedMinute, 0, 0);
    
    const gracePeriodTime = new Date(expectedTime);
    gracePeriodTime.setMinutes(gracePeriodTime.getMinutes() + lateMarkGracePeriod);

    let status = 'present';
    if (clockInTime > gracePeriodTime) {
      status = 'late';
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        employeeId: input.employeeId,
        date: today,
        clockInTime,
        status,
        clockInLocation: input.location,
        clockInLatitude: input.latitude,
        clockInLongitude: input.longitude,
        deviceInfo: input.deviceInfo,
        remarks: input.remarks,
        isManualEntry: false,
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

    return attendance;
  }

  /**
   * Clock out
   */
  async clockOut(input: ClockOutInput) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: input.attendanceId },
      include: {
        employee: {
          include: {
            company: {
              select: {
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    if (attendance.clockOutTime) {
      throw new ConflictError('Already clocked out');
    }

    const clockOutTime = input.clockOutTime || new Date();

    if (clockOutTime < attendance.clockInTime) {
      throw new BadRequestError('Clock out time cannot be before clock in time');
    }

    // Calculate work hours
    const workMilliseconds = clockOutTime.getTime() - attendance.clockInTime.getTime();
    const workHours = workMilliseconds / (1000 * 60 * 60);

    // Get company settings
    const companySettings = attendance.employee.company.settings as any;
    const fullDayHours = companySettings?.attendance?.fullDayHours || 8;
    const halfDayHours = companySettings?.attendance?.halfDayHours || 4;
    const overtimeEnabled = companySettings?.payroll?.overtimeEnabled || false;

    // Calculate status based on work hours
    let status = attendance.status;
    let overtimeHours = 0;

    if (workHours < halfDayHours) {
      status = 'half_day';
    } else if (workHours >= fullDayHours) {
      status = 'present';
      if (overtimeEnabled && workHours > fullDayHours) {
        overtimeHours = workHours - fullDayHours;
      }
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: input.attendanceId },
      data: {
        clockOutTime,
        workHours: parseFloat(workHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        status,
        clockOutLocation: input.location,
        clockOutLatitude: input.latitude,
        clockOutLongitude: input.longitude,
        remarks: input.remarks || attendance.remarks,
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

    return updatedAttendance;
  }

  /**
   * Create manual attendance entry
   */
  async createAttendance(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: data.employeeId,
        date,
      },
    });

    if (existingAttendance) {
      throw new ConflictError('Attendance already exists for this date');
    }

    // Calculate work hours if both times provided
    let workHours = data.workHours;
    if (!workHours && data.clockInTime && data.clockOutTime) {
      const clockIn = new Date(data.clockInTime);
      const clockOut = new Date(data.clockOutTime);
      const workMilliseconds = clockOut.getTime() - clockIn.getTime();
      workHours = workMilliseconds / (1000 * 60 * 60);
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date,
        clockInTime: data.clockInTime ? new Date(data.clockInTime) : undefined,
        clockOutTime: data.clockOutTime ? new Date(data.clockOutTime) : undefined,
        status: data.status,
        workHours,
        overtimeHours: data.overtimeHours,
        remarks: data.remarks,
        isManualEntry: true,
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

    return attendance;
  }

  /**
   * Update attendance
   */
  async updateAttendance(
    attendanceId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: true },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && attendance.employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    // Calculate work hours if both times updated
    let workHours = data.workHours;
    const clockInTime = data.clockInTime ? new Date(data.clockInTime) : attendance.clockInTime;
    const clockOutTime = data.clockOutTime ? new Date(data.clockOutTime) : attendance.clockOutTime;

    if (!workHours && clockInTime && clockOutTime) {
      const workMilliseconds = clockOutTime.getTime() - clockInTime.getTime();
      workHours = workMilliseconds / (1000 * 60 * 60);
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        clockInTime: data.clockInTime ? new Date(data.clockInTime) : undefined,
        clockOutTime: data.clockOutTime ? new Date(data.clockOutTime) : undefined,
        status: data.status,
        workHours,
        overtimeHours: data.overtimeHours,
        remarks: data.remarks,
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

    return updatedAttendance;
  }

  /**
   * Delete attendance
   */
  async deleteAttendance(
    attendanceId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: true },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && attendance.employee.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.attendance.delete({
      where: { id: attendanceId },
    });

    return { message: 'Attendance record deleted successfully' };
  }

  /**
   * Get employee attendance summary
   */
  async getEmployeeAttendanceSummary(
    employeeId: string,
    filters: any
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
    } else {
      const year = filters.year ? parseInt(filters.year) : new Date().getFullYear();
      const month = filters.month ? parseInt(filters.month) - 1 : new Date().getMonth();
      
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'half_day').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const leaveDays = attendanceRecords.filter(r => r.status === 'on_leave').length;
    const holidayDays = attendanceRecords.filter(r => r.status === 'holiday').length;

    const totalWorkHours = attendanceRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const totalOvertimeHours = attendanceRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

    return {
      employeeId,
      startDate,
      endDate,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        halfDays,
        lateDays,
        leaveDays,
        holidayDays,
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      },
      records: attendanceRecords,
    };
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(
    filters: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      date: today,
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

    if (filters.status) {
      where.status = filters.status;
    }

    const records = await prisma.attendance.findMany({
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
      },
      orderBy: { clockInTime: 'desc' },
    });

    return records;
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStatistics(
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

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const records = await prisma.attendance.findMany({
      where,
    });

    const statistics = {
      totalRecords: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      late: records.filter(r => r.status === 'late').length,
      onLeave: records.filter(r => r.status === 'on_leave').length,
      holiday: records.filter(r => r.status === 'holiday').length,
      totalWorkHours: parseFloat(records.reduce((sum, r) => sum + (r.workHours || 0), 0).toFixed(2)),
      totalOvertimeHours: parseFloat(records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(2)),
    };

    return statistics;
  }

  /**
   * Mark bulk attendance
   */
  async markBulkAttendance(
    attendances: Array<any>,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const attendanceData of attendances) {
      try {
        const attendance = await this.createAttendance(attendanceData, requestingUser);
        results.successful.push({
          employeeId: attendance.employeeId,
          date: attendance.date,
          status: attendance.status,
        });
      } catch (error: any) {
        results.failed.push({
          employeeId: attendanceData.employeeId,
          date: attendanceData.date,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Request attendance regularization
   */
  async requestRegularization(data: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    // Check if regularization already requested
    const existingRequest = await prisma.attendanceRegularization.findFirst({
      where: {
        employeeId: data.employeeId,
        date,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new ConflictError('Regularization request already exists');
    }

    const regularization = await prisma.attendanceRegularization.create({
      data: {
        employeeId: data.employeeId,
        date,
        clockInTime: new Date(data.clockInTime),
        clockOutTime: new Date(data.clockOutTime),
        reason: data.reason,
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
      },
    });

    return regularization;
  }

  /**
   * Get regularization requests
   */
  async getRegularizationRequests(
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

    if (filters.status) {
      where.status = filters.status;
    }

    const [requests, total] = await Promise.all([
      prisma.attendanceRegularization.findMany({
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceRegularization.count({ where }),
    ]);

    return { requests, total, page, limit };
  }

  /**
   * Approve/Reject regularization
   */
  async approveRegularization(
    regularizationId: string,
    status: 'approved' | 'rejected',
    remarks?: string
  ) {
    const regularization = await prisma.attendanceRegularization.findUnique({
      where: { id: regularizationId },
    });

    if (!regularization) {
      throw new NotFoundError('Regularization request not found');
    }

    if (regularization.status !== 'pending') {
      throw new BadRequestError('Regularization request already processed');
    }

    // Update regularization status
    const updated = await prisma.attendanceRegularization.update({
      where: { id: regularizationId },
      data: {
        status,
        approverRemarks: remarks,
        approvedAt: status === 'approved' ? new Date() : null,
      },
    });

    // If approved, update or create attendance record
    if (status === 'approved') {
      const date = new Date(regularization.date);
      date.setHours(0, 0, 0, 0);

      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          employeeId: regularization.employeeId,
          date,
        },
      });

      const clockIn = new Date(regularization.clockInTime);
      const clockOut = new Date(regularization.clockOutTime);
      const workMilliseconds = clockOut.getTime() - clockIn.getTime();
      const workHours = workMilliseconds / (1000 * 60 * 60);

      if (existingAttendance) {
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            clockInTime: regularization.clockInTime,
            clockOutTime: regularization.clockOutTime,
            workHours: parseFloat(workHours.toFixed(2)),
            status: 'present',
            remarks: `Regularized: ${regularization.reason}`,
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            employeeId: regularization.employeeId,
            date,
            clockInTime: regularization.clockInTime,
            clockOutTime: regularization.clockOutTime,
            workHours: parseFloat(workHours.toFixed(2)),
            status: 'present',
            remarks: `Regularized: ${regularization.reason}`,
            isManualEntry: true,
          },
        });
      }
    }

    return updated;
  }
}

export default new AttendanceService();
