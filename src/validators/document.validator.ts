import { z } from 'zod';

// Get documents
export const getDocumentsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    companyId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    documentType: z.enum(['employee', 'project', 'company', 'payroll', 'contract', 'policy', 'other']).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get document by ID
export const getDocumentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
});

// Upload document
export const uploadDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Document title is required'),
    description: z.string().optional(),
    companyId: z.string().uuid('Invalid company ID'),
    categoryId: z.string().uuid().optional(),
    documentType: z.enum(['employee', 'project', 'company', 'payroll', 'contract', 'policy', 'other']),
    fileUrl: z.string().url('Invalid file URL'),
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().min(0),
    fileType: z.string().min(1, 'File type is required'),
    employeeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    expiryDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Update document
export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    expiryDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Delete document
export const deleteDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
});

// Document Categories
export const getDocumentCategoriesSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
  }),
});

export const createDocumentCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
    companyId: z.string().uuid('Invalid company ID'),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const updateDocumentCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const deleteDocumentCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

// Document Versions
export const getDocumentVersionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
});

export const createDocumentVersionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    fileUrl: z.string().url('Invalid file URL'),
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().min(0),
    fileType: z.string().min(1, 'File type is required'),
    versionNotes: z.string().optional(),
  }),
});

// Document Sharing
export const shareDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    employeeIds: z.array(z.string().uuid()).optional(),
    departmentIds: z.array(z.string().uuid()).optional(),
    shareWithAll: z.boolean().optional(),
    permissions: z.enum(['view', 'download', 'edit']).optional(),
    expiresAt: z.string().optional(),
  }),
});

export const revokeDocumentShareSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
    shareId: z.string().uuid('Invalid share ID'),
  }),
});

// Document Statistics
export const getDocumentStatsSchema = z.object({
  query: z.object({
    companyId: z.string().uuid().optional(),
  }),
});
