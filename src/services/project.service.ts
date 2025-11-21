import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class ProjectService {
  /**
   * Get projects
   */
  async getProjects(
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

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              teamMembers: true,
              milestones: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total, page, limit };
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        teamMembers: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                designation: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  /**
   * Create project
   */
  async createProject(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check for duplicate code
    const existing = await prisma.project.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existing) {
      throw new ConflictError('Project code already exists');
    }

    // Verify manager if provided
    if (data.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: data.managerId },
      });

      if (!manager || manager.companyId !== companyId) {
        throw new NotFoundError('Manager not found');
      }
    }

    // Verify client if provided
    if (data.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
      });

      if (!client || client.companyId !== companyId) {
        throw new NotFoundError('Client not found');
      }
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        code: data.code,
        companyId,
        clientId: data.clientId,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        budget: data.budget,
        currency: data.currency || 'USD',
        status: data.status || 'planning',
        priority: data.priority || 'medium',
        managerId: data.managerId,
        tags: data.tags || [],
        customFields: data.customFields || {},
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Add team members if provided
    if (data.teamMembers && data.teamMembers.length > 0) {
      await Promise.all(
        data.teamMembers.map((employeeId: string) =>
          prisma.projectTeamMember.create({
            data: {
              projectId: project.id,
              employeeId,
              role: 'Team Member',
            },
          })
        )
      );
    }

    return project;
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && project.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        budget: data.budget,
        currency: data.currency,
        status: data.status,
        priority: data.priority,
        managerId: data.managerId,
        clientId: data.clientId,
        tags: data.tags,
        customFields: data.customFields,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete project
   */
  async deleteProject(
    projectId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && project.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    if (project._count.tasks > 0) {
      throw new BadRequestError('Cannot delete project with existing tasks');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { message: 'Project deleted successfully' };
  }

  // ===== TEAM MEMBERS =====

  /**
   * Add team member to project
   */
  async addTeamMember(projectId: string, data: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee || employee.companyId !== project.companyId) {
      throw new NotFoundError('Employee not found');
    }

    // Check if already a member
    const existing = await prisma.projectTeamMember.findFirst({
      where: {
        projectId,
        employeeId: data.employeeId,
      },
    });

    if (existing) {
      throw new ConflictError('Employee is already a team member');
    }

    const teamMember = await prisma.projectTeamMember.create({
      data: {
        projectId,
        employeeId: data.employeeId,
        role: data.role,
        billableRate: data.billableRate,
        allocationPercentage: data.allocationPercentage || 100,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return teamMember;
  }

  /**
   * Update team member
   */
  async updateTeamMember(projectId: string, memberId: string, data: any) {
    const teamMember = await prisma.projectTeamMember.findFirst({
      where: {
        id: memberId,
        projectId,
      },
    });

    if (!teamMember) {
      throw new NotFoundError('Team member not found');
    }

    const updated = await prisma.projectTeamMember.update({
      where: { id: memberId },
      data: {
        role: data.role,
        billableRate: data.billableRate,
        allocationPercentage: data.allocationPercentage,
        isActive: data.isActive,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Remove team member
   */
  async removeTeamMember(projectId: string, memberId: string) {
    const teamMember = await prisma.projectTeamMember.findFirst({
      where: {
        id: memberId,
        projectId,
      },
    });

    if (!teamMember) {
      throw new NotFoundError('Team member not found');
    }

    await prisma.projectTeamMember.delete({
      where: { id: memberId },
    });

    return { message: 'Team member removed successfully' };
  }

  // ===== MILESTONES =====

  /**
   * Get project milestones
   */
  async getProjectMilestones(projectId: string, filters: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const where: any = { projectId };

    if (filters.status) {
      where.status = filters.status;
    }

    const milestones = await prisma.projectMilestone.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return milestones;
  }

  /**
   * Create milestone
   */
  async createMilestone(projectId: string, data: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        dueDate: new Date(data.dueDate),
        status: data.status || 'pending',
        budget: data.budget,
      },
    });

    return milestone;
  }

  /**
   * Update milestone
   */
  async updateMilestone(projectId: string, milestoneId: string, data: any) {
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        name: data.name,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: data.status,
        budget: data.budget,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      },
    });

    return updated;
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(projectId: string, milestoneId: string) {
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    await prisma.projectMilestone.delete({
      where: { id: milestoneId },
    });

    return { message: 'Milestone deleted successfully' };
  }

  // ===== BUDGET TRACKING =====

  /**
   * Get project budget
   */
  async getProjectBudget(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        budgetExpenses: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const totalSpent = project.budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = (project.budget || 0) - totalSpent;

    return {
      budget: project.budget || 0,
      spent: parseFloat(totalSpent.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      expenses: project.budgetExpenses,
    };
  }

  /**
   * Add budget expense
   */
  async addBudgetExpense(projectId: string, data: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const expense = await prisma.projectBudgetExpense.create({
      data: {
        projectId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    return expense;
  }

  // ===== REPORTS =====

  /**
   * Get project report
   */
  async getProjectReport(projectId: string, filters: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        teamMembers: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        milestones: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Get time tracking data
    const where: any = { projectId };

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
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
    const billableHours = timesheets.filter(t => t.billable).reduce((sum, t) => sum + t.hours, 0);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget,
      },
      tasks: {
        total: project.tasks.length,
        completed: project.tasks.filter(t => t.status === 'done').length,
        inProgress: project.tasks.filter(t => t.status === 'in_progress').length,
        todo: project.tasks.filter(t => t.status === 'todo').length,
      },
      milestones: {
        total: project.milestones.length,
        completed: project.milestones.filter(m => m.status === 'completed').length,
        pending: project.milestones.filter(m => m.status === 'pending').length,
      },
      timeTracking: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        billableHours: parseFloat(billableHours.toFixed(2)),
        nonBillableHours: parseFloat((totalHours - billableHours).toFixed(2)),
      },
      teamMembers: project.teamMembers.length,
    };
  }

  /**
   * Get projects overview
   */
  async getProjectsOverview(
    filters: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const where: any = {};

    // Multi-tenant filter
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.companyId = requestingUser.companyId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
            teamMembers: true,
          },
        },
      },
    });

    return {
      total: projects.length,
      byStatus: {
        planning: projects.filter(p => p.status === 'planning').length,
        active: projects.filter(p => p.status === 'active').length,
        onHold: projects.filter(p => p.status === 'on_hold').length,
        completed: projects.filter(p => p.status === 'completed').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length,
      },
      byPriority: {
        low: projects.filter(p => p.priority === 'low').length,
        medium: projects.filter(p => p.priority === 'medium').length,
        high: projects.filter(p => p.priority === 'high').length,
        critical: projects.filter(p => p.priority === 'critical').length,
      },
      totalBudget: parseFloat(projects.reduce((sum, p) => sum + (p.budget || 0), 0).toFixed(2)),
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        budget: p.budget,
        tasksCount: p._count.tasks,
        teamSize: p._count.teamMembers,
      })),
    };
  }

  /**
   * Get project time tracking
   */
  async getProjectTimeTracking(projectId: string, filters: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const where: any = { projectId };

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

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Group by employee
    const byEmployee: any = {};

    timesheets.forEach(ts => {
      const key = ts.employeeId;

      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee: ts.employee,
          totalHours: 0,
          billableHours: 0,
          entries: [],
        };
      }

      byEmployee[key].totalHours += ts.hours;
      byEmployee[key].billableHours += ts.billable ? ts.hours : 0;
      byEmployee[key].entries.push(ts);
    });

    return {
      summary: {
        totalHours: parseFloat(timesheets.reduce((sum, ts) => sum + ts.hours, 0).toFixed(2)),
        billableHours: parseFloat(timesheets.filter(ts => ts.billable).reduce((sum, ts) => sum + ts.hours, 0).toFixed(2)),
        totalEntries: timesheets.length,
      },
      byEmployee: Object.values(byEmployee),
    };
  }
}

export default new ProjectService();
