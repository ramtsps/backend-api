import { z } from 'zod';

// Get projects
export const getProjectsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    clientId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get project by ID
export const getProjectByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

// Create project
export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required'),
    code: z.string().min(1, 'Project code is required'),
    companyId: z.string().uuid('Invalid company ID'),
    clientId: z.string().uuid().optional(),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    budget: z.number().min(0).optional(),
    currency: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    managerId: z.string().uuid().optional(),
    teamMembers: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

// Update project
export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.number().min(0).optional(),
    currency: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    managerId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

// Delete project
export const deleteProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

// Project team members
export const addTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    role: z.string().min(1, 'Role is required'),
    billableRate: z.number().min(0).optional(),
    allocationPercentage: z.number().min(0).max(100).optional(),
  }),
});

export const updateTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    memberId: z.string().uuid('Invalid member ID'),
  }),
  body: z.object({
    role: z.string().optional(),
    billableRate: z.number().min(0).optional(),
    allocationPercentage: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const removeTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    memberId: z.string().uuid('Invalid member ID'),
  }),
});

// Project milestones
export const getProjectMilestonesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
  }),
});

export const createMilestoneSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Milestone name is required'),
    description: z.string().optional(),
    dueDate: z.string().min(1, 'Due date is required'),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
    budget: z.number().min(0).optional(),
  }),
});

export const updateMilestoneSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    milestoneId: z.string().uuid('Invalid milestone ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
    budget: z.number().min(0).optional(),
    completedDate: z.string().optional(),
  }),
});

export const deleteMilestoneSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    milestoneId: z.string().uuid('Invalid milestone ID'),
  }),
});

// Project budget tracking
export const getProjectBudgetSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

export const addBudgetExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    description: z.string().optional(),
    date: z.string().optional(),
  }),
});

// Project reports
export const getProjectReportSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const getProjectsOverviewSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  }),
});

// Project time tracking
export const getProjectTimeTrackingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    employeeId: z.string().uuid().optional(),
  }),
});
