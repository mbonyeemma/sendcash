-- Create performed_tasks table to track user task completions
CREATE TABLE IF NOT EXISTS performed_tasks (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  task_id VARCHAR(50) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  url VARCHAR(512) NOT NULL,
  reward DECIMAL(18, 8) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES airdrop_tasks(id) ON DELETE RESTRICT,
  INDEX (user_id, task_id, status),
  INDEX (created_at)
);

-- Create a view to easily get user task history with task details
CREATE OR REPLACE VIEW user_task_history AS
SELECT 
  pt.id AS performed_task_id,
  pt.user_id,
  pt.task_id,
  at.title AS task_title,
  at.description AS task_description,
  pt.platform,
  pt.url,
  pt.reward,
  pt.status,
  pt.notes,
  pt.created_at,
  pt.verified_at,
  at.cooldown_hours
FROM 
  performed_tasks pt
JOIN 
  airdrop_tasks at ON pt.task_id = at.id
ORDER BY 
  pt.created_at DESC; 