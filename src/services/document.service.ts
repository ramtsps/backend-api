import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class DocumentService {
  /**
   * Get documents
   */
  async getDocuments(
    filters: any,
    page: number = 1,
    limit: number = 50,
    requestingUser: { companyId?: string; isSuperAdmin: boolean; userId?: string }
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

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { fileName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.uploadedAt = 'desc';
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          employee: {
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
          _count: {
            select: {
              versions: true,
              shares: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit };
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        category: true,
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        employee: {
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
        versions: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { versionNumber: 'desc' },
        },
        shares: {
          include: {
            sharedWith: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return document;
  }

  /**
   * Upload document
   */
  async uploadDocument(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean; userId?: string }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Verify category if provided
    if (data.categoryId) {
      const category = await prisma.documentCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.companyId !== companyId) {
        throw new NotFoundError('Document category not found');
      }
    }

    // Verify employee if provided
    if (data.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: data.employeeId },
      });

      if (!employee || employee.companyId !== companyId) {
        throw new NotFoundError('Employee not found');
      }
    }

    // Verify project if provided
    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project || project.companyId !== companyId) {
        throw new NotFoundError('Project not found');
      }
    }

    const document = await prisma.document.create({
      data: {
        title: data.title,
        description: data.description,
        companyId,
        categoryId: data.categoryId,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        employeeId: data.employeeId,
        projectId: data.projectId,
        uploadedById: requestingUser.userId,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        tags: data.tags || [],
        isPublic: data.isPublic || false,
        currentVersion: 1,
      },
      include: {
        category: true,
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return document;
  }

  /**
   * Update document
   */
  async updateDocument(
    documentId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && document.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        tags: data.tags,
        isPublic: data.isPublic,
      },
      include: {
        category: true,
      },
    });

    return updated;
  }

  /**
   * Delete document
   */
  async deleteDocument(
    documentId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && document.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }

  // ===== DOCUMENT CATEGORIES =====

  /**
   * Get document categories
   */
  async getDocumentCategories(
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

    const categories = await prisma.documentCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  /**
   * Create document category
   */
  async createDocumentCategory(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    const category = await prisma.documentCategory.create({
      data: {
        name: data.name,
        description: data.description,
        companyId,
        icon: data.icon,
        color: data.color,
      },
    });

    return category;
  }

  /**
   * Update document category
   */
  async updateDocumentCategory(categoryId: string, data: any) {
    const category = await prisma.documentCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundError('Document category not found');
    }

    const updated = await prisma.documentCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
      },
    });

    return updated;
  }

  /**
   * Delete document category
   */
  async deleteDocumentCategory(categoryId: string) {
    const category = await prisma.documentCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Document category not found');
    }

    if (category._count.documents > 0) {
      throw new BadRequestError('Cannot delete category with existing documents');
    }

    await prisma.documentCategory.delete({
      where: { id: categoryId },
    });

    return { message: 'Document category deleted successfully' };
  }

  // ===== DOCUMENT VERSIONS =====

  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });

    return versions;
  }

  /**
   * Create document version
   */
  async createDocumentVersion(
    documentId: string,
    data: any,
    requestingUser: { userId?: string }
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Get current version number
    const currentVersion = document.currentVersion;
    const newVersionNumber = currentVersion + 1;

    // Create new version
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        versionNotes: data.versionNotes,
        uploadedById: requestingUser.userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update document current version
    await prisma.document.update({
      where: { id: documentId },
      data: {
        currentVersion: newVersionNumber,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      },
    });

    return version;
  }

  // ===== DOCUMENT SHARING =====

  /**
   * Share document
   */
  async shareDocument(documentId: string, data: any, requestingUser: { userId?: string }) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const shares: any[] = [];

    // Share with specific employees
    if (data.employeeIds && data.employeeIds.length > 0) {
      for (const employeeId of data.employeeIds) {
        const share = await prisma.documentShare.create({
          data: {
            documentId,
            sharedWithId: employeeId,
            sharedById: requestingUser.userId,
            permissions: data.permissions || 'view',
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          },
          include: {
            sharedWith: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        shares.push(share);
      }
    }

    // Share with departments (get all employees in departments)
    if (data.departmentIds && data.departmentIds.length > 0) {
      const employees = await prisma.employee.findMany({
        where: {
          departmentId: { in: data.departmentIds },
        },
      });

      for (const employee of employees) {
        const share = await prisma.documentShare.create({
          data: {
            documentId,
            sharedWithId: employee.id,
            sharedById: requestingUser.userId,
            permissions: data.permissions || 'view',
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          },
          include: {
            sharedWith: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        shares.push(share);
      }
    }

    // Share with all (make document public)
    if (data.shareWithAll) {
      await prisma.document.update({
        where: { id: documentId },
        data: { isPublic: true },
      });
    }

    return shares;
  }

  /**
   * Revoke document share
   */
  async revokeDocumentShare(documentId: string, shareId: string) {
    const share = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        documentId,
      },
    });

    if (!share) {
      throw new NotFoundError('Document share not found');
    }

    await prisma.documentShare.delete({
      where: { id: shareId },
    });

    return { message: 'Document share revoked successfully' };
  }

  // ===== STATISTICS =====

  /**
   * Get document statistics
   */
  async getDocumentStats(
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

    const documents = await prisma.document.findMany({
      where,
      include: {
        category: true,
      },
    });

    // Calculate statistics
    const totalDocuments = documents.length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

    const byType: any = {};
    const byCategory: any = {};

    documents.forEach(doc => {
      // By type
      if (!byType[doc.documentType]) {
        byType[doc.documentType] = 0;
      }
      byType[doc.documentType]++;

      // By category
      const categoryName = doc.category?.name || 'Uncategorized';
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = 0;
      }
      byCategory[categoryName]++;
    });

    // Expiring documents
    const expiringDocuments = documents.filter(doc => {
      if (!doc.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });

    // Expired documents
    const expiredDocuments = documents.filter(doc => {
      if (!doc.expiryDate) return false;
      return doc.expiryDate < new Date();
    });

    return {
      totalDocuments,
      totalSize: parseFloat((totalSize / (1024 * 1024)).toFixed(2)), // Convert to MB
      byType,
      byCategory,
      expiringDocuments: {
        count: expiringDocuments.length,
        documents: expiringDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          expiryDate: doc.expiryDate,
        })),
      },
      expiredDocuments: {
        count: expiredDocuments.length,
        documents: expiredDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          expiryDate: doc.expiryDate,
        })),
      },
    };
  }
}

export default new DocumentService();
