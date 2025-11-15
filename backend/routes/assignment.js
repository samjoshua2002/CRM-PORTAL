const express = require('express');
const AssignmentController = require('../controllers/assignmentController');

const router = express.Router();

// GET /api/assignment/rules - Get active assignment rules for an organization
router.get('/rules', AssignmentController.getAssignmentRules);

// POST /api/assignment/leads/:id - Assign a specific lead
router.post('/leads/:id', AssignmentController.assignLead);

// PUT /api/assignment/leads/:id/reassign - Reassign a lead to a different counselor
router.put('/leads/:id/reassign', AssignmentController.reassignLead);

// POST /api/assignment/bulk - Bulk assign unassigned leads
router.post('/bulk', AssignmentController.bulkAssignLeads);

// GET /api/assignment/counselors/team/:team_id - Get available counselors for a team
router.get('/counselors/team/:team_id', AssignmentController.getAvailableCounselors);

// GET /api/assignment/counselors/:counselor_id/workload - Get workload for a specific counselor
router.get('/counselors/:counselor_id/workload', AssignmentController.getCounselorWorkload);

// GET /api/assignment/stats - Get assignment statistics for an organization
router.get('/stats', AssignmentController.getAssignmentStats);

// GET /api/assignment/logs/lead/:lead_id - Get assignment logs for a lead
router.get('/logs/lead/:lead_id', AssignmentController.getAssignmentLogs);

// GET /api/assignment/teams/:team_id/stats - Get assignment stats for a specific team
router.get('/teams/:team_id/stats', AssignmentController.getTeamAssignmentStats);

// GET /api/assignment/overview - Get a high-level overview of assignment workload
router.get('/overview', AssignmentController.getWorkloadOverview);

module.exports = router;