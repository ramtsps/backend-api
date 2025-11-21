import { Request, Response } from 'express';
import projectService from '@services/project.service';
import { successResponse, createdResponse, paginatedResponse } from '@utils/response';
import { asyncHandler } from '@middleware/error.middleware';

class ProjectController {
  /**
   * Get projects
   * @route GET /api/v1/projects
   */
  getProjects = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      companyId: req.query.companyId,
      status: req.query.status,
      priority: req.query.priority,
      clientId: req.query.clientId,
      managerId: req.query.managerId,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await projectService.getProjects(filters, page, limit, requestingUser);

    return paginatedResponse(
      res,
      result.projects,
      page,
      limit,
      result.total,
      'Projects retrieved successfully'
    );
  });

  /**
   * Get project by ID
   * @route GET /api/v1/projects/:id
   */
  getProjectById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    return successResponse(res, project, 'Project retrieved successfully');
  });

  /**
   * Create project
   * @route POST /api/v1/projects
   */
  createProject = asyncHandler(async (req: Request, res: Response) => {
    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const project = await projectService.createProject(req.body, requestingUser);
    return createdResponse(res, project, 'Project created successfully');
  });

  /**
   * Update project
   * @route PUT /api/v1/projects/:id
   */
  updateProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const project = await projectService.updateProject(id, req.body, requestingUser);
    return successResponse(res, project, 'Project updated successfully');
  });

  /**
   * Delete project
   * @route DELETE /api/v1/projects/:id
   */
  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const result = await projectService.deleteProject(id, requestingUser);
    return successResponse(res, result, 'Project deleted successfully');
  });

  // ===== TEAM MEMBERS =====

  /**
   * Add team member
   * @route POST /api/v1/projects/:id/team
   */
  addTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const teamMember = await projectService.addTeamMember(id, req.body);
    return createdResponse(res, teamMember, 'Team member added successfully');
  });

  /**
   * Update team member
   * @route PUT /api/v1/projects/:id/team/:memberId
   */
  updateTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const { id, memberId } = req.params;
    const teamMember = await projectService.updateTeamMember(id, memberId, req.body);
    return successResponse(res, teamMember, 'Team member updated successfully');
  });

  /**
   * Remove team member
   * @route DELETE /api/v1/projects/:id/team/:memberId
   */
  removeTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const { id, memberId } = req.params;
    const result = await projectService.removeTeamMember(id, memberId);
    return successResponse(res, result, 'Team member removed successfully');
  });

  // ===== MILESTONES =====

  /**
   * Get project milestones
   * @route GET /api/v1/projects/:id/milestones
   */
  getProjectMilestones = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const filters = {
      status: req.query.status,
    };

    const milestones = await projectService.getProjectMilestones(id, filters);
    return successResponse(res, milestones, 'Milestones retrieved successfully');
  });

  /**
   * Create milestone
   * @route POST /api/v1/projects/:id/milestones
   */
  createMilestone = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const milestone = await projectService.createMilestone(id, req.body);
    return createdResponse(res, milestone, 'Milestone created successfully');
  });

  /**
   * Update milestone
   * @route PUT /api/v1/projects/:id/milestones/:milestoneId
   */
  updateMilestone = asyncHandler(async (req: Request, res: Response) => {
    const { id, milestoneId } = req.params;
    const milestone = await projectService.updateMilestone(id, milestoneId, req.body);
    return successResponse(res, milestone, 'Milestone updated successfully');
  });

  /**
   * Delete milestone
   * @route DELETE /api/v1/projects/:id/milestones/:milestoneId
   */
  deleteMilestone = asyncHandler(async (req: Request, res: Response) => {
    const { id, milestoneId } = req.params;
    const result = await projectService.deleteMilestone(id, milestoneId);
    return successResponse(res, result, 'Milestone deleted successfully');
  });

  // ===== BUDGET =====

  /**
   * Get project budget
   * @route GET /api/v1/projects/:id/budget
   */
  getProjectBudget = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const budget = await projectService.getProjectBudget(id);
    return successResponse(res, budget, 'Project budget retrieved successfully');
  });

  /**
   * Add budget expense
   * @route POST /api/v1/projects/:id/budget/expenses
   */
  addBudgetExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expense = await projectService.addBudgetExpense(id, req.body);
    return createdResponse(res, expense, 'Budget expense added successfully');
  });

  // ===== REPORTS =====

  /**
   * Get project report
   * @route GET /api/v1/projects/:id/report
   */
  getProjectReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const report = await projectService.getProjectReport(id, filters);
    return successResponse(res, report, 'Project report generated successfully');
  });

  /**
   * Get projects overview
   * @route GET /api/v1/projects/overview
   */
  getProjectsOverview = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      companyId: req.query.companyId,
      managerId: req.query.managerId,
      status: req.query.status,
    };

    const requestingUser = {
      companyId: req.user!.companyId,
      isSuperAdmin: req.user!.isSuperAdmin,
    };

    const overview = await projectService.getProjectsOverview(filters, requestingUser);
    return successResponse(res, overview, 'Projects overview retrieved successfully');
  });

  /**
   * Get project time tracking
   * @route GET /api/v1/projects/:id/time-tracking
   */
  getProjectTimeTracking = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      employeeId: req.query.employeeId,
    };

    const timeTracking = await projectService.getProjectTimeTracking(id, filters);
    return successResponse(res, timeTracking, 'Time tracking data retrieved successfully');
  });
}

export default new ProjectController();
