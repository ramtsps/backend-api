import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class PayrollService {
  // ===== SALARY COMPONENTS =====

  /**
   * Get salary components
   */
  async getSalaryComponents(
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

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const [components, total] = await Promise.all([
      prisma.salaryComponent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.salaryComponent.count({ where }),
    ]);

    return { components, total, page, limit };
  }

  /**
   * Create salary component
   */
  async createSalaryComponent(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check for duplicate code
    const existing = await prisma.salaryComponent.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existing) {
      throw new ConflictError('Salary component code already exists');
    }

    const component = await prisma.salaryComponent.create({
      data: {
        ...data,
        companyId,
      },
    });

    return component;
  }

  /**
   * Update salary component
   */
  async updateSalaryComponent(componentId: string, data: any) {
    const component = await prisma.salaryComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundError('Salary component not found');
    }

    const updated = await prisma.salaryComponent.update({
      where: { id: componentId },
      data,
    });

    return updated;
  }

  /**
   * Delete salary component
   */
  async deleteSalaryComponent(componentId: string) {
    const component = await prisma.salaryComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundError('Salary component not found');
    }

    await prisma.salaryComponent.delete({
      where: { id: componentId },
    });

    return { message: 'Salary component deleted successfully' };
  }

  // ===== EMPLOYEE SALARY STRUCTURE =====

  /**
   * Get employee salary structure
   */
  async getEmployeeSalaryStructure(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const structure = await prisma.salaryStructure.findFirst({
      where: { employeeId },
      include: {
        components: {
          include: {
            component: true,
          },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return structure;
  }

  /**
   * Create employee salary structure
   */
  async createEmployeeSalaryStructure(data: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Validate all components exist
    for (const comp of data.components) {
      const component = await prisma.salaryComponent.findUnique({
        where: { id: comp.componentId },
      });

      if (!component) {
        throw new NotFoundError(`Salary component ${comp.componentId} not found`);
      }
    }

    // Calculate gross salary
    const earnings = data.components
      .filter((c: any) => c.type === 'earning')
      .reduce((sum: number, c: any) => sum + c.value, 0);
    
    const deductions = data.components
      .filter((c: any) => c.type === 'deduction')
      .reduce((sum: number, c: any) => sum + c.value, 0);

    const grossSalary = data.basicSalary + earnings;
    const netSalary = grossSalary - deductions;

    // Create salary structure
    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId: data.employeeId,
        effectiveFrom: new Date(data.effectiveFrom),
        basicSalary: data.basicSalary,
        grossSalary,
        netSalary,
        components: {
          create: data.components.map((c: any) => ({
            componentId: c.componentId,
            value: c.value,
          })),
        },
      },
      include: {
        components: {
          include: {
            component: true,
          },
        },
      },
    });

    return structure;
  }

  /**
   * Update employee salary structure
   */
  async updateEmployeeSalaryStructure(structureId: string, data: any) {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: structureId },
      include: { components: true },
    });

    if (!structure) {
      throw new NotFoundError('Salary structure not found');
    }

    // If components are being updated, delete old ones and create new
    if (data.components) {
      await prisma.salaryStructureComponent.deleteMany({
        where: { salaryStructureId: structureId },
      });
    }

    // Calculate new totals
    let grossSalary = structure.grossSalary;
    let netSalary = structure.netSalary;

    if (data.basicSalary !== undefined || data.components) {
      const basicSalary = data.basicSalary || structure.basicSalary;
      const components = data.components || structure.components;

      const earnings = components
        .filter((c: any) => c.type === 'earning')
        .reduce((sum: number, c: any) => sum + c.value, 0);
      
      const deductions = components
        .filter((c: any) => c.type === 'deduction')
        .reduce((sum: number, c: any) => sum + c.value, 0);

      grossSalary = basicSalary + earnings;
      netSalary = grossSalary - deductions;
    }

    const updated = await prisma.salaryStructure.update({
      where: { id: structureId },
      data: {
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
        basicSalary: data.basicSalary,
        grossSalary,
        netSalary,
        components: data.components ? {
          create: data.components.map((c: any) => ({
            componentId: c.componentId,
            value: c.value,
          })),
        } : undefined,
      },
      include: {
        components: {
          include: {
            component: true,
          },
        },
      },
    });

    return updated;
  }

  // ===== PAYROLL PROCESSING =====

  /**
   * Get payrolls
   */
  async getPayrolls(
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

    if (filters.companyId) {
      where.employee = {
        ...where.employee,
        companyId: filters.companyId,
      };
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.month) {
      where.month = parseInt(filters.month);
    }

    if (filters.year) {
      where.year = parseInt(filters.year);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
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
        },
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.payroll.count({ where }),
    ]);

    return { payrolls, total, page, limit };
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(payrollId: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
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
        earnings: {
          include: {
            component: true,
          },
        },
        deductions: {
          include: {
            component: true,
          },
        },
        adjustments: true,
      },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    return payroll;
  }

  /**
   * Generate payroll for month
   */
  async generatePayroll(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Get employees
    const where: any = { companyId, status: 'active' };
    
    if (data.employeeIds && data.employeeIds.length > 0) {
      where.id = { in: data.employeeIds };
    }

    if (data.departmentId) {
      where.departmentId = data.departmentId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        salaryStructure: {
          where: {
            effectiveFrom: {
              lte: new Date(data.year, data.month - 1, 1),
            },
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          include: {
            components: {
              include: {
                component: true,
              },
            },
          },
        },
      },
    });

    if (employees.length === 0) {
      throw new BadRequestError('No employees found for payroll generation');
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const employee of employees) {
      try {
        // Check if payroll already exists
        const existingPayroll = await prisma.payroll.findFirst({
          where: {
            employeeId: employee.id,
            month: data.month,
            year: data.year,
          },
        });

        if (existingPayroll) {
          results.failed.push({
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            error: 'Payroll already exists for this month',
          });
          continue;
        }

        // Get salary structure
        const salaryStructure = employee.salaryStructure?.[0];
        if (!salaryStructure) {
          results.failed.push({
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            error: 'No salary structure defined',
          });
          continue;
        }

        // Get attendance for the month
        const startDate = new Date(data.year, data.month - 1, 1);
        const endDate = new Date(data.year, data.month, 0);

        const attendance = await prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const absentDays = attendance.filter(a => a.status === 'absent').length;
        const totalWorkingDays = attendance.length;

        // Get leave records
        const leaves = await prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            status: 'approved',
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const paidLeaveDays = leaves.filter(l => l.leaveType?.isPaid).reduce((sum, l) => sum + l.numberOfDays, 0);
        const unpaidLeaveDays = leaves.filter(l => !l.leaveType?.isPaid).reduce((sum, l) => sum + l.numberOfDays, 0);

        // Calculate salary
        const payableDays = presentDays + paidLeaveDays;
        const lossOfPayDays = absentDays + unpaidLeaveDays;

        // Get adjustments for the month
        const adjustments = await prisma.payrollAdjustment.findMany({
          where: {
            employeeId: employee.id,
            month: data.month,
            year: data.year,
            applied: false,
          },
        });

        // Calculate earnings
        let basicSalary = salaryStructure.basicSalary;
        if (lossOfPayDays > 0) {
          basicSalary = (salaryStructure.basicSalary / totalWorkingDays) * payableDays;
        }

        let totalEarnings = basicSalary;
        const earningsBreakdown: any[] = [];

        for (const comp of salaryStructure.components.filter((c: any) => c.component.type === 'earning')) {
          let value = comp.value;
          
          // Apply LOP if needed
          if (lossOfPayDays > 0 && !comp.component.isStatutory) {
            value = (comp.value / totalWorkingDays) * payableDays;
          }

          totalEarnings += value;
          earningsBreakdown.push({
            componentId: comp.componentId,
            amount: parseFloat(value.toFixed(2)),
          });
        }

        // Add bonuses and reimbursements
        const bonusAdjustments = adjustments.filter(a => a.type === 'bonus' || a.type === 'reimbursement' || a.type === 'arrear');
        bonusAdjustments.forEach(adj => {
          totalEarnings += adj.amount;
        });

        // Calculate deductions
        let totalDeductions = 0;
        const deductionsBreakdown: any[] = [];

        for (const comp of salaryStructure.components.filter((c: any) => c.component.type === 'deduction')) {
          let value = comp.value;
          
          // Percentage-based deductions
          if (comp.component.calculationType === 'percentage') {
            value = (totalEarnings * comp.value) / 100;
          }

          totalDeductions += value;
          deductionsBreakdown.push({
            componentId: comp.componentId,
            amount: parseFloat(value.toFixed(2)),
          });
        }

        // Add deduction adjustments
        const deductionAdjustments = adjustments.filter(a => a.type === 'deduction' || a.type === 'advance');
        deductionAdjustments.forEach(adj => {
          totalDeductions += adj.amount;
        });

        const grossSalary = totalEarnings;
        const netSalary = grossSalary - totalDeductions;

        // Create payroll
        const payroll = await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            month: data.month,
            year: data.year,
            basicSalary: parseFloat(basicSalary.toFixed(2)),
            grossSalary: parseFloat(grossSalary.toFixed(2)),
            totalDeductions: parseFloat(totalDeductions.toFixed(2)),
            netSalary: parseFloat(netSalary.toFixed(2)),
            workingDays: totalWorkingDays,
            presentDays,
            absentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            lossOfPayDays,
            status: 'draft',
            earnings: {
              create: earningsBreakdown,
            },
            deductions: {
              create: deductionsBreakdown,
            },
          },
        });

        // Mark adjustments as applied
        if (adjustments.length > 0) {
          await prisma.payrollAdjustment.updateMany({
            where: {
              id: { in: adjustments.map(a => a.id) },
            },
            data: { applied: true },
          });
        }

        results.successful.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          payrollId: payroll.id,
          netSalary: payroll.netSalary,
        });

      } catch (error: any) {
        results.failed.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Process payroll (calculate final amounts)
   */
  async processPayroll(payrollId: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    if (payroll.status !== 'draft') {
      throw new BadRequestError('Can only process draft payroll');
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Approve payroll
   */
  async approvePayroll(payrollId: string, remarks?: string, approverId?: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    if (payroll.status !== 'processed') {
      throw new BadRequestError('Can only approve processed payroll');
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverId,
        approverRemarks: remarks,
      },
    });

    return updated;
  }

  /**
   * Mark payroll as paid
   */
  async markPayrollPaid(payrollId: string, data: any) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { employee: true },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    if (payroll.status !== 'approved') {
      throw new BadRequestError('Can only mark approved payroll as paid');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        companyId: payroll.employee.companyId,
        employeeId: payroll.employeeId,
        amount: payroll.netSalary,
        paymentDate: new Date(data.paymentDate),
        paymentMethod: data.paymentMethod,
        paymentType: 'salary',
        status: 'completed',
        transactionReference: data.transactionReference,
        utrNumber: data.utrNumber,
        month: payroll.month,
        year: payroll.year,
      },
    });

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'paid',
        paidAt: new Date(data.paymentDate),
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference,
        utrNumber: data.utrNumber,
        paymentId: payment.id,
      },
    });

    return updated;
  }

  // ===== PAYSLIPS =====

  /**
   * Get payslips
   */
  async getPayslips(
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.month) {
      where.month = parseInt(filters.month);
    }

    if (filters.year) {
      where.year = parseInt(filters.year);
    }

    const [payslips, total] = await Promise.all([
      prisma.payroll.findMany({
        where: {
          ...where,
          status: { in: ['approved', 'paid'] },
        },
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
          earnings: {
            include: {
              component: true,
            },
          },
          deductions: {
            include: {
              component: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.payroll.count({
        where: {
          ...where,
          status: { in: ['approved', 'paid'] },
        },
      }),
    ]);

    return { payslips, total, page, limit };
  }

  // ===== ADJUSTMENTS =====

  /**
   * Create payroll adjustment
   */
  async createPayrollAdjustment(data: any) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
        applied: false,
      },
    });

    return adjustment;
  }

  /**
   * Get payroll adjustments
   */
  async getPayrollAdjustments(
    filters: any,
    page: number = 1,
    limit: number = 50
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.month) {
      where.month = parseInt(filters.month);
    }

    if (filters.year) {
      where.year = parseInt(filters.year);
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const [adjustments, total] = await Promise.all([
      prisma.payrollAdjustment.findMany({
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payrollAdjustment.count({ where }),
    ]);

    return { adjustments, total, page, limit };
  }

  /**
   * Delete payroll adjustment
   */
  async deletePayrollAdjustment(adjustmentId: string) {
    const adjustment = await prisma.payrollAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundError('Payroll adjustment not found');
    }

    if (adjustment.applied) {
      throw new BadRequestError('Cannot delete applied adjustment');
    }

    await prisma.payrollAdjustment.delete({
      where: { id: adjustmentId },
    });

    return { message: 'Payroll adjustment deleted successfully' };
  }

  // ===== REPORTS =====

  /**
   * Get payroll report
   */
  async getPayrollReport(
    filters: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const where: any = {
      month: parseInt(filters.month),
      year: parseInt(filters.year),
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

    const payrolls = await prisma.payroll.findMany({
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
            designation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by specified field
    const groupBy = filters.groupBy || 'department';
    const grouped: any = {};

    payrolls.forEach(p => {
      let key: string;

      switch (groupBy) {
        case 'designation':
          key = p.employee.designation?.id || 'unassigned';
          break;
        case 'employee':
          key = p.employeeId;
          break;
        default: // department
          key = p.employee.department?.id || 'unassigned';
      }

      if (!grouped[key]) {
        grouped[key] = {
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
          employeeCount: 0,
          payrolls: [],
        };
      }

      grouped[key].totalGrossSalary += p.grossSalary;
      grouped[key].totalDeductions += p.totalDeductions;
      grouped[key].totalNetSalary += p.netSalary;
      grouped[key].employeeCount += 1;
      grouped[key].payrolls.push(p);
    });

    return {
      summary: {
        totalGrossSalary: parseFloat(payrolls.reduce((sum, p) => sum + p.grossSalary, 0).toFixed(2)),
        totalDeductions: parseFloat(payrolls.reduce((sum, p) => sum + p.totalDeductions, 0).toFixed(2)),
        totalNetSalary: parseFloat(payrolls.reduce((sum, p) => sum + p.netSalary, 0).toFixed(2)),
        employeeCount: payrolls.length,
      },
      groupedData: grouped,
    };
  }

  /**
   * Bulk approve payrolls
   */
  async bulkApprovePayrolls(
    payrollIds: string[],
    remarks?: string,
    approverId?: string
  ) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const payrollId of payrollIds) {
      try {
        await this.approvePayroll(payrollId, remarks, approverId);
        results.successful.push(payrollId);
      } catch (error: any) {
        results.failed.push({
          payrollId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk mark payrolls as paid
   */
  async bulkMarkPayrollsPaid(payrollIds: string[], data: any) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const payrollId of payrollIds) {
      try {
        await this.markPayrollPaid(payrollId, data);
        results.successful.push(payrollId);
      } catch (error: any) {
        results.failed.push({
          payrollId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new PayrollService();
