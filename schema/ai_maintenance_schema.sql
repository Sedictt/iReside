-- Add AI analysis columns to maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS ai_category TEXT,
ADD COLUMN IF NOT EXISTS ai_severity TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT,
ADD COLUMN IF NOT EXISTS ai_estimated_cost TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;

-- Create an index for faster filtering by AI category
CREATE INDEX IF NOT EXISTS idx_maintenance_ai_category ON maintenance_requests(ai_category);
