import { z } from 'zod';

// Get tasks
export const getTasksSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    projectId: z.string().uuid().optional(),
    assigneeId: z.string().uuid().optional(),
    reporterId: z.string().uuid().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get task by ID
export const getTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

// Create task
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID'),
    assigneeId: z.string().uuid().optional(),
    reporterId: z.string().uuid().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    dueDate: z.string().optional(),
    estimatedHours: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    parentTaskId: z.string().uuid().optional(),
  }),
});

// Update task
export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assigneeId: z.string().uuid().optional(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    dueDate: z.string().optional(),
    estimatedHours: z.number().min(0).optional(),
    actualHours: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Delete task
export const deleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

// Update task status
export const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']),
  }),
});

// Assign task
export const assignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    assigneeId: z.string().uuid('Invalid assignee ID'),
  }),
});

// Task comments
export const getTaskCommentsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const addTaskCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    comment: z.string().min(1, 'Comment is required'),
  }),
});

export const updateTaskCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
    commentId: z.string().uuid('Invalid comment ID'),
  }),
  body: z.object({
    comment: z.string().min(1, 'Comment is required'),
  }),
});

export const deleteTaskCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
    commentId: z.string().uuid('Invalid comment ID'),
  }),
});

// Task attachments
export const addTaskAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().optional(),
    fileType: z.string().optional(),
  }),
});

export const deleteTaskAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
    attachmentId: z.string().uuid('Invalid attachment ID'),
  }),
});

// Kanban board
export const getKanbanBoardSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Project ID is required'),
  }),
});

export const moveTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']),
    position: z.number().int().min(0).optional(),
  }),
});

// Subtasks
export const getSubtasksSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const createSubtaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Subtask title is required'),
    description: z.string().optional(),
    assigneeId: z.string().uuid().optional(),
  }),
});

// Task activity
export const getTaskActivitySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

// Bulk operations
export const bulkUpdateTasksSchema = z.object({
  body: z.object({
    taskIds: z.array(z.string().uuid()),
    updates: z.object({
      status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assigneeId: z.string().uuid().optional(),
    }),
  }),
});
