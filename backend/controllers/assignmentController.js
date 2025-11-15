const AssignmentService = require('../services/assignmentService');
const Lead = require('../models/Lead');
const { query } = require('../config/database');

class AssignmentController {
  // Get assignment rules
  static async getAssignmentRules(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const rules = await AssignmentService.getActiveAssignmentRules(org_id);

      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Error getting assignment rules:', error);
      next(error);
    }
  }

  // Assign lead to counselor
  static async assignLead(req, res, next) {
    try {
      const { id } = req.params;
      const { org_id } = req.body;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const result = await AssignmentService.assignLead(id, org_id);

      res.json({
        success: true,
        data: result,
        message: 'Lead assigned successfully'
      });
    } catch (error) {
      console.error('Error assigning lead:', error);
      next(error);
    }
  }

  // Reassign lead
  static async reassignLead(req, res, next) {
    try {
      const { id } = req.params;
      const { new_counselor_id, reason } = req.body;

      if (!new_counselor_id || !reason) {
        return res.status(400).json({
          success: false,
          error: 'new_counselor_id and reason are required'
        });
      }

      const result = await AssignmentService.reassignLead(id, new_counselor_id, reason);

      res.json({
        success: true,
        data: result,
        message: 'Lead reassigned successfully'
      });
    } catch (error) {
      console.error('Error reassigning lead:', error);
      next(error);
    }
  }

  // Get available counselors for a team
  static async getAvailableCounselors(req, res, next) {
    try {
      const { team_id } = req.params;

      if (!team_id) {
        return res.status(400).json({
          success: false,
          error: 'team_id is required'
        });
      }

      const counselors = await AssignmentService.getAvailableCounselors(team_id);

      res.json({
        success: true,
        data: counselors
      });
    } catch (error) {
      console.error('Error getting available counselors:', error);
      next(error);
    }
  }

  // Get counselor workload
  static async getCounselorWorkload(req, res, next) {
    try {
      const { counselor_id } = req.params;
      const { days = 7 } = req.query;

      const workload = await AssignmentService.getCounselorWorkload(counselor_id, parseInt(days));

      res.json({
        success: true,
        data: workload,
        period_days: parseInt(days)
      });
    } catch (error) {
      console.error('Error getting counselor workload:', error);
      next(error);
    }
  }

  // Get assignment statistics
  static async getAssignmentStats(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const {
        start_date,
        end_date
      } = req.query;

      const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date) : new Date();

      const stats = await AssignmentService.getAssignmentStats(org_id, startDate, endDate);

      res.json({
        success: true,
        data: stats,
        period: {
          start_date: startDate,
          end_date: endDate
        }
      });
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      next(error);
    }
  }

  // Get assignment logs for a lead
  static async getAssignmentLogs(req, res, next) {
    try {
      const { lead_id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;

      const sql = `
        SELECT
          al.*,
          u.first_name as counselor_first_name,
          u.last_name as counselor_last_name,
          u.email as counselor_email,
          t.team_name,
          ar.rule_name
        FROM assignment_logs al
        INNER JOIN users u ON al.assigned_counselor = u.user_id
        INNER JOIN teams t ON al.team_id = t.team_id
        LEFT JOIN assignment_rules ar ON al.rule_id = ar.rule_id
        WHERE al.lead_id = $1
        ORDER BY al.assigned_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(sql, [lead_id, parseInt(limit), parseInt(offset)]);

      // Get total count for pagination
      const countSql = 'SELECT COUNT(*) FROM assignment_logs WHERE lead_id = $1';
      const countResult = await query(countSql, [lead_id]);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting assignment logs:', error);
      next(error);
    }
  }

  // Get team assignment statistics
  static async getTeamAssignmentStats(req, res, next) {
    try {
      const { team_id } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const sql = `
        SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.capacity_daily,
          COUNT(CASE WHEN DATE(l.assigned_date) = CURRENT_DATE THEN 1 END) as today_assigned,
          COUNT(CASE WHEN l.assigned_date >= $2 THEN 1 END) as period_assigned,
          COUNT(CASE WHEN l.status = 'converted' AND l.assigned_date >= $2 THEN 1 END) as period_converted,
          AVG(CASE WHEN l.first_response_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (l.first_response_at - l.assigned_date))/3600
          END) as avg_response_hours,
          u.workload_weight
        FROM users u
        LEFT JOIN leads l ON u.user_id = l.assigned_counselor
        WHERE u.team_id = $1
        AND u.status = 'active'
        AND u.can_receive_leads = TRUE
        GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.capacity_daily, u.workload_weight
        ORDER BY period_assigned DESC
      `;

      const result = await query(sql, [team_id, startDate]);

      res.json({
        success: true,
        data: result.rows,
        period_days: parseInt(days),
        start_date: startDate
      });
    } catch (error) {
      console.error('Error getting team assignment stats:', error);
      next(error);
    }
  }

  // Bulk assign unassigned leads
  static async bulkAssignLeads(req, res, next) {
    try {
      const { org_id, lead_ids } = req.body;

      if (!org_id || !lead_ids || !Array.isArray(lead_ids)) {
        return res.status(400).json({
          success: false,
          error: 'org_id and lead_ids array are required'
        });
      }

      const results = [];
      const errors = [];

      for (const leadId of lead_ids) {
        try {
          const result = await AssignmentService.assignLead(leadId, org_id);
          results.push(result);
        } catch (error) {
          errors.push({
            lead_id: leadId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          assigned: results,
          errors: errors,
          total: lead_ids.length,
          successful: results.length,
          failed: errors.length
        },
        message: `Bulk assignment completed: ${results.length}/${lead_ids.length} leads assigned`
      });
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      next(error);
    }
  }

  // Get assignment workload overview
  static async getWorkloadOverview(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const sql = `
        SELECT
          t.team_id,
          t.team_name,
          COUNT(u.user_id) as total_counselors,
          COUNT(CASE WHEN u.can_receive_leads = TRUE THEN 1 END) as active_counselors,
          SUM(u.capacity_daily) as total_capacity,
          SUM(CASE WHEN DATE(l.assigned_date) = CURRENT_DATE THEN 1 ELSE 0 END) as today_assigned,
          SUM(CASE WHEN l.assigned_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as week_assigned,
          SUM(CASE WHEN l.status = 'converted' AND l.assigned_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as month_converted
        FROM teams t
        LEFT JOIN users u ON t.team_id = u.team_id
        LEFT JOIN leads l ON u.user_id = l.assigned_counselor
        WHERE t.org_id = $1
        AND t.is_active = TRUE
        GROUP BY t.team_id, t.team_name
        ORDER BY month_converted DESC
      `;

      const result = await query(sql, [org_id]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting workload overview:', error);
      next(error);
    }
  }
}

module.exports = AssignmentController;