-- EduCRM Database Schema
-- This script creates all tables and relationships for the EduCRM system

-- Drop existing enums if they exist (be cautious in production)
DROP TYPE IF EXISTS degree_level CASCADE;
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS lead_hotness CASCADE;
DROP TYPE IF EXISTS followup_status CASCADE;
DROP TYPE IF EXISTS rule_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Create enums
CREATE TYPE degree_level AS ENUM ('phd','masters','bachelors','diploma','hs');
CREATE TYPE test_type AS ENUM ('GMAT','GRE','CAT','SAT','IELTS','TOEFL');
CREATE TYPE lead_hotness AS ENUM ('hot','warm','cold');
CREATE TYPE followup_status AS ENUM ('pending','contacted','scheduled','closed');
CREATE TYPE rule_type AS ENUM ('geography','program_interest','load_balancing','lead_score');
CREATE TYPE user_status AS ENUM ('active','invited','suspended','disabled');
CREATE TYPE user_role AS ENUM ('admin','manager','counselor','specialist','analyst','viewer');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: organisations
DROP TABLE IF EXISTS organisations CASCADE;
CREATE TABLE organisations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name TEXT NOT NULL,
    org_code TEXT NOT NULL UNIQUE,
    domain TEXT,
    website TEXT,
    country_code CHAR(2),
    timezone TEXT,
    currency TEXT,
    primary_contact_id UUID,
    billing_email TEXT,
    support_email TEXT,
    phone TEXT,
    attribution_model TEXT,
    crm_tier TEXT,
    max_users_allowed INTEGER,
    max_leads_allowed INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: users
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone_e164 TEXT,
    password_hash TEXT,
    sso_provider TEXT,
    sso_subject TEXT,
    status user_status NOT NULL DEFAULT 'invited',
    role user_role NOT NULL,
    team_id UUID,
    title TEXT,
    timezone TEXT,
    locale TEXT,
    can_receive_leads BOOLEAN DEFAULT FALSE,
    capacity_daily INTEGER DEFAULT 0,
    workload_weight NUMERIC(3,2) DEFAULT 1.0,
    calendar_link TEXT,
    meeting_buffer_min INTEGER DEFAULT 0,
    work_hours_json JSONB,
    comm_channels JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Table: teams
DROP TABLE IF EXISTS teams CASCADE;
CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    team_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    type TEXT,
    can_receive_leads BOOLEAN DEFAULT TRUE,
    capacity_daily INTEGER,
    round_robin_offset INTEGER DEFAULT 0,
    load_strategy TEXT,
    weight_multiplier NUMERIC(3,2) DEFAULT 1.0,
    country_codes TEXT[],
    programs_supported TEXT[],
    timezones TEXT[],
    owner_user_id UUID,
    slack_channel TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: journeys
DROP TABLE IF EXISTS journeys CASCADE;
CREATE TABLE journeys (
    journey_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: touchpoints
DROP TABLE IF EXISTS touchpoints CASCADE;
CREATE TABLE touchpoints (
    touchpoint_id BIGSERIAL PRIMARY KEY,
    journey_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    channel TEXT,
    source TEXT,
    medium TEXT,
    campaign TEXT,
    adgroup TEXT,
    keyword TEXT,
    landing_url TEXT,
    page_url TEXT,
    referrer_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    attribution_model TEXT,
    weight NUMERIC(3,2),
    is_bot BOOLEAN DEFAULT FALSE,
    is_test BOOLEAN DEFAULT FALSE,
    ingest_source TEXT,
    event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: leads
DROP TABLE IF EXISTS leads CASCADE;
CREATE TABLE leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    owner_user_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    email_normalized TEXT,
    phone TEXT,
    phone_e164 TEXT,
    company TEXT,
    website TEXT,
    country_code CHAR(2),
    country_name TEXT,
    state TEXT,
    city TEXT,
    source_raw TEXT,
    source_channel TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    first_touch_id BIGINT,
    last_touch_id BIGINT,
    journey_id UUID,
    stage TEXT,
    status TEXT,
    lifecycle_score NUMERIC(6,2),
    intent_score NUMERIC(6,2),
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    next_action_at TIMESTAMPTZ,
    owner_assigned_at TIMESTAMPTZ,
    became_mql_at TIMESTAMPTZ,
    became_sql_at TIMESTAMPTZ,
    opportunity_id UUID,
    converted_at TIMESTAMPTZ,
    disqualified_at TIMESTAMPTZ,
    disqualified_reason TEXT,
    consent_marketing BOOLEAN,
    consent_sales BOOLEAN,
    gdpr_deleted BOOLEAN DEFAULT FALSE,
    enrichment JSONB,
    custom_field JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_scored_at TIMESTAMPTZ,
    hotness_snapshot lead_hotness,
    assigned_counselor UUID,
    assignment_date TIMESTAMPTZ,
    assignment_rule TEXT,
    followup_status followup_status,
    program_interest TEXT,
    -- Lead scoring components
    academic_score NUMERIC(6,2),
    experience_score NUMERIC(6,2),
    program_fit_score NUMERIC(6,2),
    engagement_score NUMERIC(6,2),
    geography_score NUMERIC(6,2),
    data_quality_score NUMERIC(6,2),
    lead_score NUMERIC(6,2)
);

-- Table: assignment_rules
DROP TABLE IF EXISTS assignment_rules CASCADE;
CREATE TABLE assignment_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    priority INTEGER NOT NULL,
    type rule_type NOT NULL,
    country_code CHAR(2),
    program_equals TEXT,
    min_lead_score NUMERIC(6,2),
    team_id UUID,
    fixed_counselor UUID,
    action_note TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: assignment_logs
DROP TABLE IF EXISTS assignment_logs CASCADE;
CREATE TABLE assignment_logs (
    log_id BIGSERIAL PRIMARY KEY,
    lead_id UUID NOT NULL,
    assigned_counselor UUID NOT NULL,
    team_id UUID NOT NULL,
    rule_id BIGINT NOT NULL,
    rule_snapshot JSONB,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    followup_status followup_status
);

-- Table: lead_education
DROP TABLE IF EXISTS lead_education CASCADE;
CREATE TABLE lead_education (
    edu_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    degree_level degree_level NOT NULL,
    field_of_study TEXT,
    institution TEXT,
    country_code CHAR(2),
    start_date DATE,
    end_date DATE,
    grad_year INTEGER,
    gpa NUMERIC(4,2),
    gpa_scale NUMERIC(4,2),
    percentage NUMERIC(5,2),
    grade_letter TEXT,
    is_highest BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lead_experiences
DROP TABLE IF EXISTS lead_experiences CASCADE;
CREATE TABLE lead_experiences (
    exp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    org_name TEXT NOT NULL,
    title TEXT NOT NULL,
    industry TEXT,
    country_code CHAR(2),
    start_date DATE NOT NULL,
    end_date DATE,
    full_time BOOLEAN,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lead_test_scores
DROP TABLE IF EXISTS lead_test_scores CASCADE;
CREATE TABLE lead_test_scores (
    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    test_type test_type NOT NULL,
    test_date DATE,
    total_score NUMERIC(6,2),
    section_json JSONB,
    percentile NUMERIC(5,2),
    attempt_no INTEGER,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
-- Users to Organisations
ALTER TABLE users ADD CONSTRAINT fk_users_org_id FOREIGN KEY (org_id) REFERENCES organisations(org_id);

-- Teams to Organisations and Users
ALTER TABLE teams ADD CONSTRAINT fk_teams_org_id FOREIGN KEY (org_id) REFERENCES organisations(org_id);
ALTER TABLE teams ADD CONSTRAINT fk_teams_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(user_id);

-- Users to Teams
ALTER TABLE users ADD CONSTRAINT fk_users_team_id FOREIGN KEY (team_id) REFERENCES teams(team_id);

-- Organisations to Users (primary contact)
ALTER TABLE organisations ADD CONSTRAINT fk_organisations_primary_contact_id FOREIGN KEY (primary_contact_id) REFERENCES users(user_id);

-- Leads to Organisations and Users
ALTER TABLE leads ADD CONSTRAINT fk_leads_org_id FOREIGN KEY (org_id) REFERENCES organisations(org_id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(user_id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_assigned_counselor FOREIGN KEY (assigned_counselor) REFERENCES users(user_id);

-- Leads to Touchpoints and Journeys
ALTER TABLE leads ADD CONSTRAINT fk_leads_first_touch_id FOREIGN KEY (first_touch_id) REFERENCES touchpoints(touchpoint_id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_last_touch_id FOREIGN KEY (last_touch_id) REFERENCES touchpoints(touchpoint_id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_journey_id FOREIGN KEY (journey_id) REFERENCES journeys(journey_id);

-- Journeys to Leads
ALTER TABLE journeys ADD CONSTRAINT fk_journeys_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id);

-- Touchpoints to Journeys and Leads
ALTER TABLE touchpoints ADD CONSTRAINT fk_touchpoints_journey_id FOREIGN KEY (journey_id) REFERENCES journeys(journey_id);
ALTER TABLE touchpoints ADD CONSTRAINT fk_touchpoints_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id);

-- Assignment Rules to Teams and Users
ALTER TABLE assignment_rules ADD CONSTRAINT fk_assignment_rules_team_id FOREIGN KEY (team_id) REFERENCES teams(team_id);
ALTER TABLE assignment_rules ADD CONSTRAINT fk_assignment_rules_fixed_counselor FOREIGN KEY (fixed_counselor) REFERENCES users(user_id);

-- Assignment Logs to Leads, Users, Teams, and Assignment Rules
ALTER TABLE assignment_logs ADD CONSTRAINT fk_assignment_logs_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id);
ALTER TABLE assignment_logs ADD CONSTRAINT fk_assignment_logs_assigned_counselor FOREIGN KEY (assigned_counselor) REFERENCES users(user_id);
ALTER TABLE assignment_logs ADD CONSTRAINT fk_assignment_logs_team_id FOREIGN KEY (team_id) REFERENCES teams(team_id);
ALTER TABLE assignment_logs ADD CONSTRAINT fk_assignment_logs_rule_id FOREIGN KEY (rule_id) REFERENCES assignment_rules(rule_id);

-- Lead profile tables to Leads
ALTER TABLE lead_education ADD CONSTRAINT fk_lead_education_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE;
ALTER TABLE lead_experiences ADD CONSTRAINT fk_lead_experiences_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE;
ALTER TABLE lead_test_scores ADD CONSTRAINT fk_lead_test_scores_lead_id FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE;

-- Create indexes for performance
-- Users
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_email_normalized ON users(email_normalized);
CREATE INDEX idx_users_status ON users(status);

-- Teams
CREATE INDEX idx_teams_org_id ON teams(org_id);
CREATE INDEX idx_teams_is_active ON teams(is_active);

-- Leads
CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_owner_user_id ON leads(owner_user_id);
CREATE INDEX idx_leads_email_normalized ON leads(email_normalized);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_hotness_snapshot ON leads(hotness_snapshot);
CREATE INDEX idx_leads_program_interest ON leads(program_interest);
CREATE INDEX idx_leads_country_code ON leads(country_code);
CREATE INDEX idx_leads_lead_score ON leads(lead_score);

-- Touchpoints
CREATE INDEX idx_touchpoints_journey_id ON touchpoints(journey_id);
CREATE INDEX idx_touchpoints_lead_id ON touchpoints(lead_id);
CREATE INDEX idx_touchpoints_occurred_at ON touchpoints(occurred_at);
CREATE INDEX idx_touchpoints_utm_source ON touchpoints(utm_source);
CREATE INDEX idx_touchpoints_utm_campaign ON touchpoints(utm_campaign);

-- Journeys
CREATE INDEX idx_journeys_lead_id ON journeys(lead_id);
CREATE INDEX idx_journeys_status ON journeys(status);
CREATE INDEX idx_journeys_started_at ON journeys(started_at);

-- Assignment Rules
CREATE INDEX idx_assignment_rules_team_id ON assignment_rules(team_id);
CREATE INDEX idx_assignment_rules_active ON assignment_rules(active);
CREATE INDEX idx_assignment_rules_priority ON assignment_rules(priority);

-- Assignment Logs
CREATE INDEX idx_assignment_logs_lead_id ON assignment_logs(lead_id);
CREATE INDEX idx_assignment_logs_assigned_counselor ON assignment_logs(assigned_counselor);
CREATE INDEX idx_assignment_logs_team_id ON assignment_logs(team_id);
CREATE INDEX idx_assignment_logs_assigned_at ON assignment_logs(assigned_at);

-- Lead profile tables
CREATE INDEX idx_lead_education_lead_id ON lead_education(lead_id);
CREATE INDEX idx_lead_experiences_lead_id ON lead_experiences(lead_id);
CREATE INDEX idx_lead_test_scores_lead_id ON lead_test_scores(lead_id);

-- Insert sample data for demonstration
INSERT INTO organisations (org_name, org_code, domain, website, country_code, timezone, currency) VALUES
('EduCRM Demo', 'EDUCRM-001', 'edudemo.com', 'https://edudemo.com', 'US', 'America/New_York', 'USD');

-- Generate org_id for later use
-- Create sample team
INSERT INTO teams (org_id, team_name, team_code, type, can_receive_leads, capacity_daily, load_strategy, country_codes, programs_supported) VALUES
((SELECT org_id FROM organisations WHERE org_code = 'EDUCRM-001'), 'Admissions Team', 'ADMISSIONS', 'admissions', TRUE, 50, 'round_robin', ARRAY['US', 'CA', 'IN'], ARRAY['MBA', 'MS', 'PhD']);

-- Create sample users
INSERT INTO users (org_id, email, email_normalized, first_name, last_name, role, team_id, can_receive_leads, capacity_daily, status) VALUES
((SELECT org_id FROM organisations WHERE org_code = 'EDUCRM-001'), 'admin@edudemo.com', 'admin@edudemo.com', 'Admin', 'User', 'admin', (SELECT team_id FROM teams WHERE team_code = 'ADMISSIONS'), TRUE, 100, 'active'),
((SELECT org_id FROM organisations WHERE org_code = 'EDUCRM-001'), 'amit@edudemo.com', 'amit@edudemo.com', 'Amit', 'Mehta', 'counselor', (SELECT team_id FROM teams WHERE team_code = 'ADMISSIONS'), TRUE, 25, 'active');

-- Create sample assignment rules
INSERT INTO assignment_rules (rule_name, priority, type, country_code, program_equals, min_lead_score, team_id, active) VALUES
('India + MBA -> Admissions Team', 10, 'geography', 'IN', 'MBA', 0, (SELECT team_id FROM teams WHERE team_code = 'ADMISSIONS'), TRUE),
('High Score -> Admissions Team', 20, 'lead_score', NULL, NULL, 75, (SELECT team_id FROM teams WHERE team_code = 'ADMISSIONS'), TRUE),
('General Load Balancing', 100, 'load_balancing', NULL, NULL, 0, (SELECT team_id FROM teams WHERE team_code = 'ADMISSIONS'), TRUE);