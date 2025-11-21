import prisma from '@/lib/prisma';
import { NotFoundError, BadRequestError } from '@utils/errors';
import config from '@config/index';

interface ReconciliationInput {
  payrollCycleId: string;
  bankData: Array<{
    utrNumber: string;
    amount: number;
    paymentDate: Date;
    bankReference?: string;
  }>;
  erpData?: Array<{
    employeeId: string;
    amount: number;
    paymentDate: Date;
    reference?: string;
  }>;
  performedBy: string;
  companyId: string;
}

class ReconciliationService {
  /**
   * Perform three-way reconciliation (HRMS-Bank-ERP)
   */
  async performReconciliation(input: ReconciliationInput) {
    const { payrollCycleId, bankData, erpData, performedBy, companyId } = input;

    // Get HRMS data (payslips from this cycle)
    const hrmsPayments = await prisma.payslip.findMany({
      where: {
        payrollCycleId,
        companyId,
        status: { in: ['paid', 'processing', 'approved'] },
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
        utrTracking: true,
      },
    });

    // Perform matching logic
    const matchResults = {
      matched: [] as any[],
      unmatched: [] as any[],
      discrepancies: [] as any[],
    };

    // Create reconciliation record
    const reconciliation = await prisma.$transaction(async (tx) => {
      const recon = await tx.uTR_Reconciliation.create({
        data: {
          payrollCycleId,
          companyId,
          reconciliation_date: new Date(),
          total_hrms_records: hrmsPayments.length,
          total_bank_records: bankData.length,
          total_erp_records: erpData?.length || 0,
          matched_records: 0,
          unmatched_hrms: 0,
          unmatched_bank: 0,
          unmatched_erp: 0,
          total_discrepancy_amount: 0,
          status: 'in_progress',
          performed_by: performedBy,
        },
      });

      // Match HRMS with Bank data
      for (const hrmsPayment of hrmsPayments) {
        const bankMatch = bankData.find(
          (b) =>
            b.utrNumber === hrmsPayment.utrNumber ||
            (Math.abs(b.amount - hrmsPayment.netSalary) < 0.01 &&
              this.isSameDate(b.paymentDate, hrmsPayment.paymentDate))
        );

        if (bankMatch) {
          // Check for amount discrepancy
          const amountDiff = Math.abs(bankMatch.amount - hrmsPayment.netSalary);
          const matchStatus =
            amountDiff < 0.01 ? 'exact_match' : amountDiff / hrmsPayment.netSalary < 0.01 ? 'minor_variance' : 'major_variance';

          // Create reconciliation item
          await tx.uTR_ReconciliationItem.create({
            data: {
              reconciliationId: recon.id,
              payslipId: hrmsPayment.id,
              employeeId: hrmsPayment.employeeId,
              hrms_amount: hrmsPayment.netSalary,
              bank_amount: bankMatch.amount,
              erp_amount: null,
              hrms_utr: hrmsPayment.utrNumber,
              bank_utr: bankMatch.utrNumber,
              erp_reference: null,
              match_status: matchStatus,
              variance_amount: amountDiff,
              variance_reason: amountDiff > 0.01 ? 'amount_mismatch' : null,
            },
          });

          matchResults.matched.push({
            payslipId: hrmsPayment.id,
            employeeCode: hrmsPayment.employee.employeeCode,
            utrNumber: bankMatch.utrNumber,
            matchStatus,
          });

          if (amountDiff > 0.01) {
            matchResults.discrepancies.push({
              payslipId: hrmsPayment.id,
              hrmsAmount: hrmsPayment.netSalary,
              bankAmount: bankMatch.amount,
              variance: amountDiff,
            });
          }
        } else {
          // Unmatched HRMS record
          await tx.uTR_ReconciliationItem.create({
            data: {
              reconciliationId: recon.id,
              payslipId: hrmsPayment.id,
              employeeId: hrmsPayment.employeeId,
              hrms_amount: hrmsPayment.netSalary,
              bank_amount: null,
              erp_amount: null,
              hrms_utr: hrmsPayment.utrNumber,
              bank_utr: null,
              erp_reference: null,
              match_status: 'unmatched',
              variance_amount: hrmsPayment.netSalary,
              variance_reason: 'missing_in_bank',
            },
          });

          matchResults.unmatched.push({
            source: 'HRMS',
            payslipId: hrmsPayment.id,
            employeeCode: hrmsPayment.employee.employeeCode,
            amount: hrmsPayment.netSalary,
          });
        }
      }

      // Find unmatched bank records
      for (const bankRecord of bankData) {
        const hrmsMatch = hrmsPayments.find((h) => h.utrNumber === bankRecord.utrNumber);
        if (!hrmsMatch) {
          matchResults.unmatched.push({
            source: 'Bank',
            utrNumber: bankRecord.utrNumber,
            amount: bankRecord.amount,
          });
        }
      }

      // Update reconciliation summary
      const totalDiscrepancy = matchResults.discrepancies.reduce(
        (sum, d) => sum + d.variance,
        0
      );

      const updatedRecon = await tx.uTR_Reconciliation.update({
        where: { id: recon.id },
        data: {
          matched_records: matchResults.matched.length,
          unmatched_hrms: matchResults.unmatched.filter((u) => u.source === 'HRMS').length,
          unmatched_bank: matchResults.unmatched.filter((u) => u.source === 'Bank').length,
          total_discrepancy_amount: totalDiscrepancy,
          status: matchResults.unmatched.length === 0 ? 'reconciled' : 'discrepancies_found',
          reconciliation_summary: {
            matched: matchResults.matched.length,
            unmatched: matchResults.unmatched.length,
            discrepancies: matchResults.discrepancies.length,
          },
        },
      });

      return updatedRecon;
    });

    return {
      reconciliation,
      matchResults,
    };
  }

  /**
   * Get reconciliation details
   */
  async getReconciliationDetails(reconciliationId: string) {
    const reconciliation = await prisma.uTR_Reconciliation.findUnique({
      where: { id: reconciliationId },
      include: {
        payrollCycle: true,
        company: true,
        items: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
            payslip: {
              select: {
                id: true,
                netSalary: true,
                paymentDate: true,
                utrNumber: true,
              },
            },
          },
        },
      },
    });

    if (!reconciliation) {
      throw new NotFoundError('Reconciliation record not found');
    }

    return reconciliation;
  }

  /**
   * Get reconciliation list
   */
  async getReconciliations(filters: any, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.payrollCycleId) where.payrollCycleId = filters.payrollCycleId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.reconciliation_date = {};
      if (filters.startDate) where.reconciliation_date.gte = new Date(filters.startDate);
      if (filters.endDate) where.reconciliation_date.lte = new Date(filters.endDate);
    }

    const [reconciliations, total] = await Promise.all([
      prisma.uTR_Reconciliation.findMany({
        where,
        include: {
          payrollCycle: {
            select: {
              id: true,
              cycleName: true,
              startDate: true,
              endDate: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { reconciliation_date: 'desc' },
      }),
      prisma.uTR_Reconciliation.count({ where }),
    ]);

    return { reconciliations, total, page, limit };
  }

  /**
   * Resolve reconciliation discrepancy
   */
  async resolveDiscrepancy(
    itemId: string,
    resolution: string,
    remarks: string,
    resolvedBy: string
  ) {
    const item = await prisma.uTR_ReconciliationItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Reconciliation item not found');
    }

    const updated = await prisma.uTR_ReconciliationItem.update({
      where: { id: itemId },
      data: {
        resolution_status: 'resolved',
        resolution_notes: remarks,
        resolved_at: new Date(),
      },
    });

    return updated;
  }

  /**
   * Export reconciliation report
   */
  async exportReconciliationReport(reconciliationId: string) {
    const reconciliation = await this.getReconciliationDetails(reconciliationId);

    // Format data for export
    const exportData = {
      summary: {
        reconciliationId: reconciliation.id,
        payrollCycle: reconciliation.payrollCycle.cycleName,
        reconciliationDate: reconciliation.reconciliation_date,
        totalHRMSRecords: reconciliation.total_hrms_records,
        totalBankRecords: reconciliation.total_bank_records,
        matchedRecords: reconciliation.matched_records,
        unmatchedHRMS: reconciliation.unmatched_hrms,
        unmatchedBank: reconciliation.unmatched_bank,
        totalDiscrepancy: reconciliation.total_discrepancy_amount,
        status: reconciliation.status,
      },
      items: reconciliation.items.map((item) => ({
        employeeCode: item.employee.employeeCode,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        hrmsAmount: item.hrms_amount,
        bankAmount: item.bank_amount,
        hrmsUTR: item.hrms_utr,
        bankUTR: item.bank_utr,
        matchStatus: item.match_status,
        variance: item.variance_amount,
        varianceReason: item.variance_reason,
        resolutionStatus: item.resolution_status,
      })),
    };

    return exportData;
  }

  /**
   * Get reconciliation statistics
   */
  async getReconciliationStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.reconciliation_date = {};
      if (startDate) where.reconciliation_date.gte = startDate;
      if (endDate) where.reconciliation_date.lte = endDate;
    }

    const stats = await prisma.uTR_Reconciliation.aggregate({
      where,
      _count: {
        id: true,
      },
      _sum: {
        matched_records: true,
        unmatched_hrms: true,
        unmatched_bank: true,
        total_discrepancy_amount: true,
      },
    });

    const statusBreakdown = await prisma.uTR_Reconciliation.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    return {
      totalReconciliations: stats._count.id,
      totalMatched: stats._sum.matched_records || 0,
      totalUnmatchedHRMS: stats._sum.unmatched_hrms || 0,
      totalUnmatchedBank: stats._sum.unmatched_bank || 0,
      totalDiscrepancyAmount: stats._sum.total_discrepancy_amount || 0,
      statusBreakdown,
    };
  }

  /**
   * Helper: Check if dates are the same (ignoring time)
   */
  private isSameDate(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Auto-match pending payments with bank data
   */
  async autoMatchPayments(
    payrollCycleId: string,
    bankData: Array<{ utrNumber: string; amount: number; paymentDate: Date }>,
    userId: string
  ) {
    const matches = [];
    const unmatched = [];

    // Get pending payslips
    const pendingPayslips = await prisma.payslip.findMany({
      where: {
        payrollCycleId,
        status: 'processing',
        utrNumber: null,
      },
      include: {
        employee: true,
      },
    });

    for (const payslip of pendingPayslips) {
      // Try to find a match in bank data
      const bankMatch = bankData.find(
        (b) =>
          Math.abs(b.amount - payslip.netSalary) / payslip.netSalary <
            config.utr.autoMatchThreshold &&
          this.isSameDate(b.paymentDate, payslip.paymentDate)
      );

      if (bankMatch) {
        matches.push({
          payslipId: payslip.id,
          utrNumber: bankMatch.utrNumber,
          confidence: 1 - Math.abs(bankMatch.amount - payslip.netSalary) / payslip.netSalary,
        });
      } else {
        unmatched.push({
          payslipId: payslip.id,
          employeeCode: payslip.employee.employeeCode,
          amount: payslip.netSalary,
        });
      }
    }

    return { matches, unmatched };
  }
}

export default new ReconciliationService();
