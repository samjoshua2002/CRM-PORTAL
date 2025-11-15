const Lead = require('../models/Lead');
const { query } = require('../config/database');

class AssignmentService {
  // Load balancing strategies
  static LOAD_STRATEGIES = {
    ROUND_ROBIN: 'round_robin',
    LEAST_LOAD: 'least_load',
    WEIGHTED: 'weighted'
  };

  // Assign lead to counselor based on rules
  static async assignLead(leadId, orgId) {
    try {
      // Get lead information
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get active assignment rules in priority order
      const rules = await this.getActiveAssignmentRules(orgId);

      // Find matching rule
      const matchingRule = await this.findMatchingRule(lead, rules);

      if (!matchingRule) {
        throw new Error('No matching assignment rule found');
      }

      // Get available counselors for the matching rule
      const availableCounselors = await this.getAvailableCounselors(matchingRule.team_id);

      if (availableCounselors.length === 0) {
        throw new Error('No available counselors found for assignment');
      }

      // Select counselor based on team's load strategy
      const selectedCounselor = await this.selectCounselor(
        availableCounselors,
        matchingRule.team_id
      );

      // Assign lead to counselor
      const ruleSnapshot = {
        rule_id: matchingRule.rule_id,
        rule_name: matchingRule.rule_name,
        type: matchingRule.type,
        priority: matchingRule.priority,
        matched_conditions: this.getMatchedConditions(lead, matchingRule),
        timestamp: new Date().toISOString()
      };

      const assignedLead = await Lead.assign(
        leadId,
        selectedCounselor.user_id,
        matchingRule.team_id,
        matchingRule.rule_id,
        ruleSnapshot
      );

      // Update counselor workload
      await this.updateCounselorWorkload(selectedCounselor.user_id);

      return {
        lead_id: leadId,
        counselor_id: selectedCounselor.user_id,
        counselor_name: `${selectedCounselor.first_name} ${selectedCounselor.last_name}`,
        team_id: matchingRule.team_id,
        team_name: matchingRule.team_name,
        rule_name: matchingRule.rule_name,
        assigned_at: assignedLead.assignment_date
      };
    } catch (error) {
      console.error('Error assigning lead:', error);
      throw error;
    }
  }

  // Get active assignment rules for organization
  static async getActiveAssignmentRules(orgId) {
    const sql = `
      SELECT ar.*, t.team_name, t.load_strategy, t.round_robin_offset
      FROM assignment_rules ar
      INNER JOIN teams t ON ar.team_id = t.team_id
      WHERE ar.active = TRUE
      AND t.is_active = TRUE
      AND t.can_receive_leads = TRUE
      AND t.org_id = $1
      ORDER BY ar.priority ASC, ar.rule_id ASC
    `;

    try {
      const result = await query(sql, [orgId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting assignment rules:', error);
      throw error;
    }
  }

  // Find first rule that matches the lead
  static async findMatchingRule(lead, rules) {
    for (const rule of rules) {
      if (await this.evaluateRule(lead, rule)) {
        return rule;
      }
    }
    return null;
  }

  // Evaluate if a rule matches the lead
  static async evaluateRule(lead, rule) {
    switch (rule.type) {
      case 'geography':
        return this.evaluateGeographyRule(lead, rule);
      case 'program_interest':
        return this.evaluateProgramRule(lead, rule);
      case 'lead_score':
        return this.evaluateScoreRule(lead, rule);
      case 'load_balancing':
        return this.evaluateLoadBalancingRule(lead, rule);
      default:
        return false;
    }
  }

  // Evaluate geography-based rule
  static evaluateGeographyRule(lead, rule) {
    if (!rule.country_code || !lead.country_code) {
      return false;
    }
    return lead.country_code.toUpperCase() === rule.country_code.toUpperCase();
  }

  // Evaluate program interest-based rule
  static evaluateProgramRule(lead, rule) {
    if (!rule.program_equals || !lead.program_interest) {
      return false;
    }
    return lead.program_interest.toLowerCase().includes(rule.program_equals.toLowerCase()) ||
           rule.program_equals.toLowerCase().includes(lead.program_interest.toLowerCase());
  }

  // Evaluate lead score-based rule
  static evaluateScoreRule(lead, rule) {
    if (!rule.min_lead_score || lead.lead_score === null) {
      return false;
    }
    return parseFloat(lead.lead_score) >= parseFloat(rule.min_lead_score);
  }

  // Evaluate load balancing rule (always matches if no other conditions)
  static evaluateLoadBalancingRule(lead, rule) {
    // Load balancing rules are catch-all rules
    return true;
  }

  // Get available counselors for a team
  static async getAvailableCounselors(teamId) {
    const sql = `
      SELECT
        u.user_id, u.first_name, u.last_name, u.email,
        u.capacity_daily, u.workload_weight, u.can_receive_leads,
        u.team_id, t.load_strategy, t.round_robin_offset,
        COALESCE(current_load.today_count, 0) as current_daily_load
      FROM users u
      INNER JOIN teams t ON u.team_id = t.team_id
      LEFT JOIN (
        SELECT
          assigned_counselor,
          COUNT(*) as today_count
        FROM leads
        WHERE assigned_counselor = u.user_id
        AND DATE(assigned_date) = CURRENT_DATE
        AND status != 'disqualified'
        GROUP BY assigned_counselor
      ) current_load ON u.user_id = current_load.assigned_counselor
      WHERE u.team_id = $1
      AND u.status = 'active'
      AND u.can_receive_leads = TRUE
      AND t.is_active = TRUE
      AND (u.capacity_daily IS NULL OR current_load.today_count < u.capacity_daily)
      ORDER BY u.first_name, u.last_name
    `;

    try {
      const result = await query(sql, [teamId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting available counselors:', error);
      throw error;
    }
  }

  // Select counselor based on team's load strategy
  static async selectCounselor(counselors, teamId) {
    const sql = `
      SELECT load_strategy, round_robin_offset
      FROM teams
      WHERE team_id = $1
    `;

    const teamResult = await query(sql, [teamId]);
    const team = teamResult.rows[0];

    if (!team) {
      throw new Error('Team not found');
    }

    switch (team.load_strategy) {
      case this.LOAD_STRATEGIES.ROUND_ROBIN:
        return this.selectByRoundRobin(counselors, teamId);
      case this.LOAD_STRATEGIES.LEAST_LOAD:
        return this.selectByLeastLoad(counselors);
      case this.LOAD_STRATEGIES.WEIGHTED:
        return this.selectByWeighted(counselors);
      default:
        return counselors[0]; // Fallback to first available
    }
  }

  // Select counselor by round-robin
  static async selectByRoundRobin(counselors, teamId) {
    const sql = `
      UPDATE teams
      SET round_robin_offset = (round_robin_offset % $2) + 1
      WHERE team_id = $1
      RETURNING round_robin_offset - 1 as selected_index
    `;

    const result = await query(sql, [teamId, counselors.length]);
    const selectedIndex = result.rows[0].selected_index;

    return counselors[selectedIndex];
  }

  // Select counselor with least current load
  static selectByLeastLoad(counselors) {
    return counselors.reduce((least, current) =>
      current.current_daily_load < least.current_daily_load ? current : least
    );
  }

  // Select counselor by weighted selection
  static selectByWeighted(counselors) {
    // Calculate weights based on workload weight and current load
    const weights = counselors.map(counselor => {
      const availableCapacity = counselor.capacity_daily - counselor.current_daily_load;
      const baseWeight = counselor.workload_weight || 1.0;
      return {
        counselor,
        weight: baseWeight * Math.max(availableCapacity, 1)
      };
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weights) {
      random -= item.weight;
      if (random <= 0) {
        return item.counselor;
      }
    }

    return weights[0].counselor; // Fallback
  }

  // Get matched conditions for rule snapshot
  static getMatchedConditions(lead, rule) {
    const conditions = {};

    if (rule.type === 'geography' && rule.country_code) {
      conditions.country_code = {
        rule_value: rule.country_code,
        lead_value: lead.country_code,
        matched: lead.country_code === rule.country_code
      };
    }

    if (rule.type === 'program_interest' && rule.program_equals) {
      conditions.program_interest = {
        rule_value: rule.program_equals,
        lead_value: lead.program_interest,
        matched: lead.program_interest.toLowerCase().includes(rule.program_equals.toLowerCase())
      };
    }

    if (rule.type === 'lead_score' && rule.min_lead_score) {
      conditions.lead_score = {
        rule_value: rule.min_lead_score,
        lead_value: lead.lead_score,
        matched: parseFloat(lead.lead_score) >= parseFloat(rule.min_lead_score)
      };
    }

    return conditions;
  }

  // Update counselor workload tracking
  static async updateCounselorWorkload(counselorId) {
    // This could be implemented with a separate workload tracking table
    // For now, we'll rely on real-time queries for workload calculation
    console.log(`Counselor ${counselorId} workload updated`);
  }

  // Get counselor workload statistics
  static async getCounselorWorkload(counselorId, days = 7) {
    const sql = `
      SELECT
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN DATE(assigned_date) = CURRENT_DATE THEN 1 END) as today_assigned,
        COUNT(CASE WHEN assigned_date >= $2 THEN 1 END) as period_assigned,
        AVG(CASE WHEN assigned_date >= $2 THEN
          EXTRACT(EPOCH FROM (first_response_at - assigned_date))/3600
        END) as avg_response_hours
      FROM leads
      WHERE assigned_counselor = $1
      AND status != 'disqualified'
      AND assigned_date >= $1
    `;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const result = await query(sql, [counselorId, startDate]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting counselor workload:', error);
      throw error;
    }
  }

  // Reassign lead to different counselor
  static async reassignLead(leadId, newCounselorId, reason) {
    try {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get new counselor's team
      const counselorSql = 'SELECT team_id FROM users WHERE user_id = $1';
      const counselorResult = await query(counselorSql, [newCounselorId]);
      const counselor = counselorResult.rows[0];

      if (!counselor) {
        throw new Error('New counselor not found');
      }

      // Create reassignment rule snapshot
      const ruleSnapshot = {
        type: 'reassignment',
        reason: reason,
        previous_counselor: lead.assigned_counselor,
        previous_team: await this.getCounselorTeam(lead.assigned_counselor),
        timestamp: new Date().toISOString()
      };

      // Update lead assignment
      const updatedLead = await Lead.assign(
        leadId,
        newCounselorId,
        counselor.team_id,
        null, // No rule ID for reassignment
        ruleSnapshot
      );

      return updatedLead;
    } catch (error) {
      console.error('Error reassigning lead:', error);
      throw error;
    }
  }

  // Get counselor's team
  static async getCounselorTeam(counselorId) {
    const sql = `
      SELECT t.team_id, t.team_name
      FROM teams t
      INNER JOIN users u ON u.team_id = t.team_id
      WHERE u.user_id = $1
    `;
    const result = await query(sql, [counselorId]);
    return result.rows[0] || null;
  }

  // Get assignment statistics
  static async getAssignmentStats(orgId, startDate, endDate) {
    const sql = `
      SELECT
        t.team_name,
        COUNT(*) as assigned_leads,
        COUNT(DISTINCT l.assigned_counselor) as active_counselors,
        AVG(EXTRACT(EPOCH FROM (first_response_at - assigned_date))/3600) as avg_response_hours,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::float / COUNT(*) * 100 as conversion_rate
      FROM leads l
      INNER JOIN users u ON l.assigned_counselor = u.user_id
      INNER JOIN teams t ON u.team_id = t.team_id
      WHERE l.org_id = $1
      AND l.assigned_date >= $2
      AND l.assigned_date <= $3
      AND l.assigned_counselor IS NOT NULL
      GROUP BY t.team_id, t.team_name
      ORDER BY assigned_leads DESC
    `;

    try {
      const result = await query(sql, [orgId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      throw error;
    }
  }
}

module.exports = AssignmentService;