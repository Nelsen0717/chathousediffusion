/*
  # Office Space Planner Database Schema

  ## Overview
  This migration creates the complete database schema for a commercial office space planning application.
  
  ## New Tables

  ### 1. profiles
  User profile information extending auth.users
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `full_name` (text)
  - `company_name` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. projects
  Main project container for office space planning
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `name` (text) - Project name
  - `description` (text) - Project description
  - `status` (text) - draft/active/archived
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. floor_plans
  Floor plan images and metadata
  - `id` (uuid, PK)
  - `project_id` (uuid, FK to projects)
  - `name` (text)
  - `original_image_url` (text) - Original uploaded image
  - `processed_image_url` (text) - AI processed image
  - `floor_area_sqm` (numeric) - Total floor area in square meters
  - `usable_area_sqm` (numeric) - Usable area after excluding walls/columns
  - `dimensions_json` (jsonb) - Detected dimensions, doors, windows
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. space_requirements
  User-defined space requirements
  - `id` (uuid, PK)
  - `project_id` (uuid, FK to projects)
  - `floor_plan_id` (uuid, FK to floor_plans, nullable)
  - `workstations` (integer) - Number of workstations needed
  - `meeting_rooms_small` (integer) - Small meeting rooms (4-6 people)
  - `meeting_rooms_medium` (integer) - Medium meeting rooms (8-10 people)
  - `meeting_rooms_large` (integer) - Large meeting rooms (12+ people)
  - `phone_booths` (integer) - Individual phone booths
  - `breakout_areas` (integer) - Casual meeting areas
  - `kitchen_pantry` (boolean) - Need kitchen/pantry
  - `reception_area` (boolean) - Need reception
  - `storage_rooms` (integer) - Storage rooms needed
  - `server_room` (boolean) - Need server room
  - `additional_notes` (text)
  - `created_at` (timestamptz)

  ### 5. layout_solutions
  AI-generated layout solutions
  - `id` (uuid, PK)
  - `floor_plan_id` (uuid, FK to floor_plans)
  - `space_requirement_id` (uuid, FK to space_requirements)
  - `solution_image_url` (text) - Generated layout image
  - `feasibility_score` (numeric) - 0-100 score
  - `is_feasible` (boolean)
  - `workstations_placed` (integer)
  - `meeting_rooms_placed` (jsonb) - Breakdown by size
  - `amenities_placed` (jsonb) - Other amenities included
  - `utilization_rate` (numeric) - Space utilization percentage
  - `constraints_met` (jsonb) - Which requirements were met
  - `suggestions` (text) - AI suggestions for optimization
  - `generation_params` (jsonb) - Parameters used for generation
  - `created_at` (timestamptz)

  ### 6. layout_versions
  Version history for layouts
  - `id` (uuid, PK)
  - `layout_solution_id` (uuid, FK to layout_solutions)
  - `version_number` (integer)
  - `solution_image_url` (text)
  - `changes_description` (text)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own projects and related data
  - Implement policies for SELECT, INSERT, UPDATE, DELETE operations
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Floor plans table
CREATE TABLE IF NOT EXISTS floor_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  original_image_url text NOT NULL,
  processed_image_url text,
  floor_area_sqm numeric,
  usable_area_sqm numeric,
  dimensions_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own floor plans"
  ON floor_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = floor_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own floor plans"
  ON floor_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = floor_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own floor plans"
  ON floor_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = floor_plans.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = floor_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own floor plans"
  ON floor_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = floor_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Space requirements table
CREATE TABLE IF NOT EXISTS space_requirements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  floor_plan_id uuid REFERENCES floor_plans(id) ON DELETE SET NULL,
  workstations integer DEFAULT 0,
  meeting_rooms_small integer DEFAULT 0,
  meeting_rooms_medium integer DEFAULT 0,
  meeting_rooms_large integer DEFAULT 0,
  phone_booths integer DEFAULT 0,
  breakout_areas integer DEFAULT 0,
  kitchen_pantry boolean DEFAULT false,
  reception_area boolean DEFAULT false,
  storage_rooms integer DEFAULT 0,
  server_room boolean DEFAULT false,
  additional_notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE space_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own space requirements"
  ON space_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = space_requirements.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own space requirements"
  ON space_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = space_requirements.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own space requirements"
  ON space_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = space_requirements.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = space_requirements.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own space requirements"
  ON space_requirements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = space_requirements.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Layout solutions table
CREATE TABLE IF NOT EXISTS layout_solutions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_plan_id uuid REFERENCES floor_plans(id) ON DELETE CASCADE NOT NULL,
  space_requirement_id uuid REFERENCES space_requirements(id) ON DELETE CASCADE NOT NULL,
  solution_image_url text,
  feasibility_score numeric DEFAULT 0 CHECK (feasibility_score >= 0 AND feasibility_score <= 100),
  is_feasible boolean DEFAULT false,
  workstations_placed integer DEFAULT 0,
  meeting_rooms_placed jsonb DEFAULT '{}'::jsonb,
  amenities_placed jsonb DEFAULT '{}'::jsonb,
  utilization_rate numeric DEFAULT 0,
  constraints_met jsonb DEFAULT '{}'::jsonb,
  suggestions text DEFAULT '',
  generation_params jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE layout_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layout solutions"
  ON layout_solutions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE floor_plans.id = layout_solutions.floor_plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own layout solutions"
  ON layout_solutions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE floor_plans.id = layout_solutions.floor_plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own layout solutions"
  ON layout_solutions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE floor_plans.id = layout_solutions.floor_plan_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE floor_plans.id = layout_solutions.floor_plan_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own layout solutions"
  ON layout_solutions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE floor_plans.id = layout_solutions.floor_plan_id
      AND projects.user_id = auth.uid()
    )
  );

-- Layout versions table
CREATE TABLE IF NOT EXISTS layout_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  layout_solution_id uuid REFERENCES layout_solutions(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  solution_image_url text,
  changes_description text DEFAULT '',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE layout_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layout versions"
  ON layout_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM layout_solutions
      JOIN floor_plans ON floor_plans.id = layout_solutions.floor_plan_id
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE layout_solutions.id = layout_versions.layout_solution_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own layout versions"
  ON layout_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM layout_solutions
      JOIN floor_plans ON floor_plans.id = layout_solutions.floor_plan_id
      JOIN projects ON projects.id = floor_plans.project_id
      WHERE layout_solutions.id = layout_versions.layout_solution_id
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_project_id ON floor_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_space_requirements_project_id ON space_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_layout_solutions_floor_plan_id ON layout_solutions(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_layout_versions_solution_id ON layout_versions(layout_solution_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floor_plans_updated_at BEFORE UPDATE ON floor_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();