import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class TaskService {
  /**
   * Get tasks
   */
  async getTasks(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Multi-tenant filter via project
    if (!requestingUser.isSuperAdmin && requestingUser.companyId) {
      where.project = {
        companyId: requestingUser.companyId,
      };
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { taskNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              subtasks: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total, page, limit };
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        subtasks: {
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
        parentTask: {
          select: {
            id: true,
            title: true,
            taskNumber: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return task;
  }

  /**
   * Create task
   */
  async createTask(data: any) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Generate task number
    const taskCount = await prisma.task.count({
      where: { projectId: data.projectId },
    });
    const taskNumber = `${project.code}-${taskCount + 1}`;

    // Verify assignee if provided
    if (data.assigneeId) {
      const assignee = await prisma.employee.findUnique({
        where: { id: data.assigneeId },
      });

      if (!assignee || assignee.companyId !== project.companyId) {
        throw new NotFoundError('Assignee not found');
      }
    }

    // Verify parent task if provided
    if (data.parentTaskId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: data.parentTaskId },
      });

      if (!parentTask || parentTask.projectId !== data.projectId) {
        throw new BadRequestError('Invalid parent task');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        taskNumber,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        reporterId: data.reporterId,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        tags: data.tags || [],
        parentTaskId: data.parentTaskId,
      },
      include: {
        assignee: {
          select: {
            id: true,
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
      },
    });

    return task;
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, data: any) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        tags: data.tags,
      },
      include: {
        assignee: {
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
   * Delete task
   */
  async deleteTask(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        _count: {
          select: {
            subtasks: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (task._count.subtasks > 0) {
      throw new BadRequestError('Cannot delete task with subtasks');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedDate: status === 'done' ? new Date() : null,
      },
    });

    return updated;
  }

  /**
   * Assign task
   */
  async assignTask(taskId: string, assigneeId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const assignee = await prisma.employee.findUnique({
      where: { id: assigneeId },
    });

    if (!assignee || assignee.companyId !== task.project.companyId) {
      throw new NotFoundError('Assignee not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  // ===== COMMENTS =====

  /**
   * Get task comments
   */
  async getTaskComments(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }

  /**
   * Add task comment
   */
  async addTaskComment(taskId: string, comment: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const taskComment = await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return taskComment;
  }

  /**
   * Update task comment
   */
  async updateTaskComment(commentId: string, comment: string, userId: string) {
    const taskComment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!taskComment) {
      throw new NotFoundError('Comment not found');
    }

    if (taskComment.userId !== userId) {
      throw new ForbiddenError('Cannot update others comments');
    }

    const updated = await prisma.taskComment.update({
      where: { id: commentId },
      data: { comment },
    });

    return updated;
  }

  /**
   * Delete task comment
   */
  async deleteTaskComment(commentId: string, userId: string) {
    const taskComment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!taskComment) {
      throw new NotFoundError('Comment not found');
    }

    if (taskComment.userId !== userId) {
      throw new ForbiddenError('Cannot delete others comments');
    }

    await prisma.taskComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }

  // ===== ATTACHMENTS =====

  /**
   * Add task attachment
   */
  async addTaskAttachment(taskId: string, data: any) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        fileType: data.fileType,
      },
    });

    return attachment;
  }

  /**
   * Delete task attachment
   */
  async deleteTaskAttachment(attachmentId: string) {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    await prisma.taskAttachment.delete({
      where: { id: attachmentId },
    });

    return { message: 'Attachment deleted successfully' };
  }

  // ===== KANBAN BOARD =====

  /**
   * Get Kanban board
   */
  async getKanbanBoard(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            subtasks: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    // Group by status
    const board = {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      in_review: tasks.filter(t => t.status === 'in_review'),
      done: tasks.filter(t => t.status === 'done'),
      cancelled: tasks.filter(t => t.status === 'cancelled'),
    };

    return board;
  }

  /**
   * Move task (Kanban drag and drop)
   */
  async moveTask(taskId: string, status: string, position?: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        position,
        completedDate: status === 'done' ? new Date() : null,
      },
    });

    return updated;
  }

  // ===== SUBTASKS =====

  /**
   * Get subtasks
   */
  async getSubtasks(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const subtasks = await prisma.task.findMany({
      where: { parentTaskId: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return subtasks;
  }

  /**
   * Create subtask
   */
  async createSubtask(taskId: string, data: any) {
    const parentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!parentTask) {
      throw new NotFoundError('Parent task not found');
    }

    // Generate task number
    const taskCount = await prisma.task.count({
      where: { projectId: parentTask.projectId },
    });
    const taskNumber = `${parentTask.project.code}-${taskCount + 1}`;

    const subtask = await prisma.task.create({
      data: {
        title: data.title,
        taskNumber,
        description: data.description,
        projectId: parentTask.projectId,
        assigneeId: data.assigneeId,
        parentTaskId: taskId,
        status: 'todo',
        priority: 'medium',
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return subtask;
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(taskIds: string[], updates: any) {
    const results = {
      successful: [] as string[],
      failed: [] as any[],
    };

    for (const taskId of taskIds) {
      try {
        await prisma.task.update({
          where: { id: taskId },
          data: updates,
        });
        results.successful.push(taskId);
      } catch (error: any) {
        results.failed.push({
          taskId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new TaskService();
