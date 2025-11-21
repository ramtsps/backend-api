import { z } from 'zod';

// ===== LEADS =====

export const getLeadsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
    source: z.string().optional(),
    assignedTo: z.string().uuid().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getLeadByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
});

export const createLeadSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
    assignedTo: z.string().uuid().optional(),
    estimatedValue: z.number().min(0).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
    assignedTo: z.string().uuid().optional(),
    estimatedValue: z.number().min(0).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

export const deleteLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
});

export const convertLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
  body: z.object({
    createClient: z.boolean().optional(),
    createProject: z.boolean().optional(),
    projectName: z.string().optional(),
    projectBudget: z.number().optional(),
  }),
});

// ===== CLIENTS =====

export const getClientsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive', 'prospect']).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getClientByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
  }),
});

export const createClientSchema = z.object({
  body: z.object({
    companyId: z.string().uuid('Invalid company ID'),
    name: z.string().min(1, 'Client name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    industry: z.string().optional(),
    status: z.enum(['active', 'inactive', 'prospect']).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    industry: z.string().optional(),
    status: z.enum(['active', 'inactive', 'prospect']).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const deleteClientSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
  }),
});

// ===== CONTACTS =====

export const getClientContactsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
  }),
});

export const createClientContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
  }),
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    isPrimary: z.boolean().optional(),
  }),
});

export const updateClientContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
    contactId: z.string().uuid('Invalid contact ID'),
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    isPrimary: z.boolean().optional(),
  }),
});

export const deleteClientContactSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID'),
    contactId: z.string().uuid('Invalid contact ID'),
  }),
});

// ===== ACTIVITIES =====

export const getLeadActivitiesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
});

export const createLeadActivitySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead ID'),
  }),
  body: z.object({
    type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
    subject: z.string().min(1, 'Subject is required'),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
  }),
});

// ===== PIPELINES =====

export const getSalesPipelineSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
  }),
});

export const getLeadsByStageSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
    stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
  }),
});
