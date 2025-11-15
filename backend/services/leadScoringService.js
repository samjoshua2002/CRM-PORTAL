const Lead = require('../models/Lead');
const { query } = require('../config/database');

class LeadScoringService {
  // Scoring constants
  static SCORING_RULES = {
    // Academic scoring (max 30 points)
    ACADEMIC: {
      PhD: 30,
      MASTERS: 25,
      BACHELORS: 20,
      DIPLOMA: 15,
      HS: 10
    },
    GPA_SCALING: 2.0, // Scale factor for GPA-based scoring
    // Experience scoring (max 25 points)
    EXPERIENCE: {
      RELEVANT_EXPERIENCE: 15,
      YEARS_EXPERIENCE: 10,
      LEADERSHIP_ROLE: 5
    },
    // Program fit scoring (max 20 points)
    PROGRAM_FIT: {
      DIRECT_MATCH: 20,
      RELATED_FIELD: 15,
      PARTIAL_MATCH: 10,
      INTEREST_ONLY: 5
    },
    // Engagement scoring (max 15 points)
    ENGAGEMENT: {
      FORM_SUBMIT: 10,
      EMAIL_CLICKED: 5,
      WEBSITE_VISIT: 3,
      DOWNLOAD: 5
    },
    // Geography scoring (max 15 points)
    GEOGRAPHY: {
      TARGET_COUNTRY: 15,
      NEARBY_COUNTRY: 10,
      INTERNATIONAL: 5
    },
    // Data quality scoring (max 5 points)
    DATA_QUALITY: {
      COMPLETE_PROFILE: 5,
      PARTIAL_PROFILE: 3,
      MINIMAL_PROFILE: 1
    }
  };

  // Hotness thresholds
  static HOTNESS_THRESHOLDS = {
    HOT: 70,
    WARM: 40,
    COLD: 0
  };

  // Calculate lead score for a new lead
  static async calculateLeadScore(leadId) {
    try {
      // Get lead data with education, experience, and test scores
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      const [education, experience, testScores] = await Promise.all([
        this.getLeadEducation(leadId),
        this.getLeadExperience(leadId),
        this.getLeadTestScores(leadId)
      ]);

      let totalScore = 0;
      const scoreBreakdown = {};

      // Academic score (30 points max)
      const academicScore = this.calculateAcademicScore(education, testScores);
      scoreBreakdown.academic_score = academicScore;
      totalScore += academicScore;

      // Experience score (25 points max)
      const experienceScore = this.calculateExperienceScore(experience);
      scoreBreakdown.experience_score = experienceScore;
      totalScore += experienceScore;

      // Program fit score (20 points max)
      const programFitScore = this.calculateProgramFitScore(lead.program_interest, education, experience);
      scoreBreakdown.program_fit_score = programFitScore;
      totalScore += programFitScore;

      // Engagement score (15 points max)
      const engagementScore = this.calculateEngagementScore(lead);
      scoreBreakdown.engagement_score = engagementScore;
      totalScore += engagementScore;

      // Geography score (15 points max)
      const geographyScore = this.calculateGeographyScore(lead.country_code);
      scoreBreakdown.geography_score = geographyScore;
      totalScore += geographyScore;

      // Data quality score (5 points max)
      const dataQualityScore = this.calculateDataQualityScore(lead);
      scoreBreakdown.data_quality_score = dataQualityScore;
      totalScore += dataQualityScore;

      // Determine hotness
      const hotness = this.determineHotness(totalScore);
      scoreBreakdown.hotness_snapshot = hotness;
      scoreBreakdown.lead_score = totalScore;

      // Update lead with scores
      await Lead.updateScores(leadId, scoreBreakdown);

      return {
        lead_id: leadId,
        total_score: totalScore,
        hotness,
        breakdown: scoreBreakdown
      };
    } catch (error) {
      console.error('Error calculating lead score:', error);
      throw error;
    }
  }

  // Calculate academic score based on education level and performance
  static calculateAcademicScore(education, testScores) {
    let score = 0;

    // Find highest education level
    const highestEducation = this.findHighestEducation(education);
    if (highestEducation) {
      const levelScore = this.SCORING_RULES.ACADEMIC[highestEducation.degree_level] || 0;
      score += levelScore;

      // Add GPA bonus
      if (highestEducation.gpa && highestEducation.gpa_scale) {
        const gpaPercentage = (highestEducation.gpa / highestEducation.gpa_scale) * 100;
        if (gpaPercentage >= 90) score += 5;
        else if (gpaPercentage >= 80) score += 3;
        else if (gpaPercentage >= 70) score += 1;
      }

      // Add test score bonus
      const bestTestScore = this.getBestTestScore(testScores);
      if (bestTestScore) {
        score += 5; // Bonus for having test scores
        if (bestTestScore.percentile >= 90) score += 3;
        else if (bestTestScore.percentile >= 80) score += 2;
        else if (bestTestScore.percentile >= 70) score += 1;
      }
    }

    return Math.min(score, 30); // Cap at 30 points
  }

  // Calculate experience score
  static calculateExperienceScore(experience) {
    let score = 0;

    if (experience && experience.length > 0) {
      experience.forEach(exp => {
        // Years of experience
        const years = this.calculateYearsOfExperience(exp);
        if (years >= 5) score += 10;
        else if (years >= 2) score += 7;
        else if (years >= 1) score += 5;
        else score += 3;

        // Relevance (assuming title/industry keywords indicate relevance)
        const isRelevant = this.isExperienceRelevant(exp);
        if (isRelevant) score += 15;

        // Leadership role detection
        if (this.isLeadershipRole(exp.title)) score += 5;
      });

      // Average if multiple experiences
      if (experience.length > 1) {
        score = score / experience.length;
      }
    }

    return Math.min(Math.round(score), 25); // Cap at 25 points
  }

  // Calculate program fit score
  static calculateProgramFitScore(programInterest, education, experience) {
    let score = 0;

    if (!programInterest) return 0;

    const programLower = programInterest.toLowerCase();

    // Check education alignment
    if (education && education.length > 0) {
      const hasRelevantEducation = education.some(edu => {
        const fieldLower = edu.field_of_study ? edu.field_of_study.toLowerCase() : '';
        return fieldLower.includes(programLower) || programLower.includes(fieldLower);
      });

      if (hasRelevantEducation) {
        score += 20; // Direct match
      }
    }

    // Check experience alignment
    if (experience && experience.length > 0) {
      const hasRelevantExperience = experience.some(exp => {
        const titleLower = exp.title.toLowerCase();
        const industryLower = exp.industry ? exp.industry.toLowerCase() : '';
        return titleLower.includes(programLower) ||
               industryLower.includes(programLower) ||
               programLower.includes(titleLower) ||
               programLower.includes(industryLower);
      });

      if (hasRelevantExperience) {
        score = Math.max(score, 15); // At least 15 if experience relevant
      }
    }

    // Partial matches based on keywords
    if (score === 0) {
      score += 10; // Interest only
    }

    return Math.min(score, 20); // Cap at 20 points
  }

  // Calculate engagement score
  static calculateEngagementScore(lead) {
    let score = 10; // Base score for submitting form

    // Add points for various engagement factors
    if (lead.phone_e164) score += 2;
    if (lead.company) score += 2;
    if (lead.website) score += 1;

    // Check if recently contacted/updated
    if (lead.last_contacted_at) {
      const daysSinceContact = this.daysSince(lead.last_contacted_at);
      if (daysSinceContact <= 7) score += 3;
      else if (daysSinceContact <= 30) score += 2;
      else if (daysSinceContact <= 90) score += 1;
    }

    return Math.min(score, 15); // Cap at 15 points
  }

  // Calculate geography score
  static calculateGeographyScore(countryCode) {
    if (!countryCode) return 0;

    // Target countries (example - can be configured per organization)
    const targetCountries = ['US', 'CA', 'GB', 'AU', 'NZ'];
    const nearbyCountries = ['MX', 'PR', 'VI']; // US nearby

    if (targetCountries.includes(countryCode.toUpperCase())) {
      return 15;
    } else if (nearbyCountries.includes(countryCode.toUpperCase())) {
      return 10;
    } else {
      return 5; // International
    }
  }

  // Calculate data quality score
  static calculateDataQualityScore(lead) {
    let score = 0;
    const requiredFields = ['first_name', 'last_name', 'email', 'phone'];
    const optionalFields = ['company', 'website', 'country_code', 'city', 'state'];

    // Check required fields
    const requiredComplete = requiredFields.filter(field => lead[field]);
    score += (requiredComplete.length / requiredFields.length) * 3;

    // Check optional fields
    const optionalComplete = optionalFields.filter(field => lead[field]);
    score += (optionalComplete.length / optionalFields.length) * 2;

    return Math.min(Math.round(score), 5); // Cap at 5 points
  }

  // Determine hotness based on total score
  static determineHotness(totalScore) {
    if (totalScore >= this.HOTNESS_THRESHOLDS.HOT) {
      return 'hot';
    } else if (totalScore >= this.HOTNESS_THRESHOLDS.WARM) {
      return 'warm';
    } else {
      return 'cold';
    }
  }

  // Helper methods
  static async getLeadEducation(leadId) {
    const sql = 'SELECT * FROM lead_education WHERE lead_id = $1 ORDER BY is_highest DESC';
    const result = await query(sql, [leadId]);
    return result.rows;
  }

  static async getLeadExperience(leadId) {
    const sql = 'SELECT * FROM lead_experiences WHERE lead_id = $1 ORDER BY start_date DESC';
    const result = await query(sql, [leadId]);
    return result.rows;
  }

  static async getLeadTestScores(leadId) {
    const sql = 'SELECT * FROM lead_test_scores WHERE lead_id = $1 ORDER BY percentile DESC';
    const result = await query(sql, [leadId]);
    return result.rows;
  }

  static findHighestEducation(education) {
    if (!education || education.length === 0) return null;
    return education.find(edu => edu.is_highest) || education[0];
  }

  static getBestTestScore(testScores) {
    if (!testScores || testScores.length === 0) return null;
    return testScores.reduce((best, current) =>
      (current.percentile || 0) > (best.percentile || 0) ? current : best
    );
  }

  static calculateYearsOfExperience(experience) {
    const start = new Date(experience.start_date);
    const end = experience.end_date ? new Date(experience.end_date) : new Date();
    return Math.floor((end - start) / (1000 * 60 * 60 * 24 * 365));
  }

  static isExperienceRelevant(experience) {
    const relevantKeywords = ['manager', 'director', 'lead', 'senior', 'executive', 'business', 'marketing', 'sales'];
    const title = experience.title.toLowerCase();
    const industry = experience.industry ? experience.industry.toLowerCase() : '';

    return relevantKeywords.some(keyword =>
      title.includes(keyword) || industry.includes(keyword)
    );
  }

  static isLeadershipRole(title) {
    const leadershipKeywords = ['manager', 'director', 'lead', 'head', 'chief', 'executive', 'president', 'vp', 'vice president'];
    return leadershipKeywords.some(keyword =>
      title.toLowerCase().includes(keyword)
    );
  }

  static daysSince(date) {
    const now = new Date();
    const past = new Date(date);
    return Math.floor((now - past) / (1000 * 60 * 60 * 24));
  }

  // Batch score multiple leads
  static async scoreMultipleLeads(leadIds) {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const result = await this.calculateLeadScore(leadId);
        results.push(result);
      } catch (error) {
        console.error(`Error scoring lead ${leadId}:`, error);
        results.push({ lead_id: leadId, error: error.message });
      }
    }

    return results;
  }

  // Recalculate all scores (admin function)
  static async recalculateAllScores() {
    const sql = 'SELECT lead_id FROM leads WHERE gdpr_deleted = FALSE';
    const result = await query(sql);
    const leadIds = result.rows.map(row => row.lead_id);

    return await this.scoreMultipleLeads(leadIds);
  }
}

module.exports = LeadScoringService;