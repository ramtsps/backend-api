import prisma from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ForbiddenError 
} from '@utils/errors';

class CRMService {
  // ===== LEADS =====

  /**
   * Get leads
   */
  async getLeads(
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

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              activities: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, page, limit };
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    return lead;
  }

  /**
   * Create lead
   */
  async createLead(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    // Check for duplicate email
    const existing = await prisma.lead.findFirst({
      where: {
        companyId,
        email: data.email,
      },
    });

    if (existing) {
      throw new ConflictError('Lead with this email already exists');
    }

    const lead = await prisma.lead.create({
      data: {
        companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        jobTitle: data.jobTitle,
        source: data.source || 'manual',
        status: data.status || 'new',
        assignedTo: data.assignedTo,
        estimatedValue: data.estimatedValue,
        notes: data.notes,
        tags: data.tags || [],
        customFields: data.customFields || {},
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return lead;
  }

  /**
   * Update lead
   */
  async updateLead(
    leadId: string,
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && lead.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        jobTitle: data.jobTitle,
        source: data.source,
        status: data.status,
        assignedTo: data.assignedTo,
        estimatedValue: data.estimatedValue,
        notes: data.notes,
        tags: data.tags,
        customFields: data.customFields,
      },
      include: {
        assignedToUser: {
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
   * Delete lead
   */
  async deleteLead(
    leadId: string,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Multi-tenant check
    if (!requestingUser.isSuperAdmin && lead.companyId !== requestingUser.companyId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });

    return { message: 'Lead deleted successfully' };
  }

  /**
   * Convert lead to client
   */
  async convertLead(leadId: string, data: any) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (lead.status === 'won') {
      throw new BadRequestError('Lead already converted');
    }

    let client = null;
    let project = null;

    // Create client if requested
    if (data.createClient) {
      client = await prisma.client.create({
        data: {
          companyId: lead.companyId,
          name: lead.company || `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          phone: lead.phone,
          status: 'active',
          notes: lead.notes,
          tags: lead.tags,
        },
      });

      // Create primary contact
      await prisma.clientContact.create({
        data: {
          clientId: client.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          jobTitle: lead.jobTitle,
          isPrimary: true,
        },
      });
    }

    // Create project if requested
    if (data.createProject && client) {
      project = await prisma.project.create({
        data: {
          companyId: lead.companyId,
          name: data.projectName || `Project for ${client.name}`,
          code: `PROJ-${Date.now()}`,
          clientId: client.id,
          budget: data.projectBudget || lead.estimatedValue,
          status: 'planning',
          priority: 'medium',
          startDate: new Date(),
        },
      });
    }

    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'won',
        convertedAt: new Date(),
        clientId: client?.id,
      },
    });

    return {
      message: 'Lead converted successfully',
      client,
      project,
    };
  }

  // ===== CLIENTS =====

  /**
   * Get clients
   */
  async getClients(
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

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { industry: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.name = 'asc';
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              projects: true,
              contacts: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.client.count({ where }),
    ]);

    return { clients, total, page, limit };
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    return client;
  }

  /**
   * Create client
   */
  async createClient(
    data: any,
    requestingUser: { companyId?: string; isSuperAdmin: boolean }
  ) {
    // Multi-tenant check
    let companyId = data.companyId;
    if (!requestingUser.isSuperAdmin) {
      companyId = requestingUser.companyId;
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zipCode,
        industry: data.industry,
        status: data.status || 'prospect',
        notes: data.notes,
        tags: data.tags || [],
      },
    });

    return client;
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, data: any) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zipCode,
        industry: data.industry,
        status: data.status,
        notes: data.notes,
        tags: data.tags,
      },
    });

    return updated;
  }

  /**
   * Delete client
   */
  async deleteClient(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    if (client._count.projects > 0) {
      throw new BadRequestError('Cannot delete client with existing projects');
    }

    await prisma.client.delete({
      where: { id: clientId },
    });

    return { message: 'Client deleted successfully' };
  }

  // ===== CLIENT CONTACTS =====

  /**
   * Get client contacts
   */
  async getClientContacts(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const contacts = await prisma.clientContact.findMany({
      where: { clientId },
      orderBy: { isPrimary: 'desc' },
    });

    return contacts;
  }

  /**
   * Create client contact
   */
  async createClientContact(clientId: string, data: any) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        jobTitle: data.jobTitle,
        isPrimary: data.isPrimary || false,
      },
    });

    return contact;
  }

  /**
   * Update client contact
   */
  async updateClientContact(clientId: string, contactId: string, data: any) {
    const contact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        jobTitle: data.jobTitle,
        isPrimary: data.isPrimary,
      },
    });

    return updated;
  }

  /**
   * Delete client contact
   */
  async deleteClientContact(clientId: string, contactId: string) {
    const contact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    await prisma.clientContact.delete({
      where: { id: contactId },
    });

    return { message: 'Contact deleted successfully' };
  }

  // ===== LEAD ACTIVITIES =====

  /**
   * Get lead activities
   */
  async getLeadActivities(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    return activities;
  }

  /**
   * Create lead activity
   */
  async createLeadActivity(leadId: string, data: any, userId?: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        type: data.type,
        subject: data.subject,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completed: data.completed || false,
        createdBy: userId,
      },
    });

    return activity;
  }

  // ===== SALES PIPELINE =====

  /**
   * Get sales pipeline
   */
  async getSalesPipeline(
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

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by status
    const pipeline = {
      new: leads.filter(l => l.status === 'new'),
      contacted: leads.filter(l => l.status === 'contacted'),
      qualified: leads.filter(l => l.status === 'qualified'),
      proposal: leads.filter(l => l.status === 'proposal'),
      won: leads.filter(l => l.status === 'won'),
      lost: leads.filter(l => l.status === 'lost'),
    };

    const summary = {
      totalLeads: leads.length,
      totalValue: parseFloat(leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0).toFixed(2)),
      conversionRate: leads.length > 0 ? ((pipeline.won.length / leads.length) * 100).toFixed(2) : 0,
      byStage: {
        new: { count: pipeline.new.length, value: pipeline.new.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
        contacted: { count: pipeline.contacted.length, value: pipeline.contacted.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
        qualified: { count: pipeline.qualified.length, value: pipeline.qualified.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
        proposal: { count: pipeline.proposal.length, value: pipeline.proposal.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
        won: { count: pipeline.won.length, value: pipeline.won.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
        lost: { count: pipeline.lost.length, value: pipeline.lost.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) },
      },
    };

    return { pipeline, summary };
  }
}

export default new CRMService();
