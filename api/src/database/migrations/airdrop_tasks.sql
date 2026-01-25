-- Create airdrop_tasks table
CREATE TABLE IF NOT EXISTS airdrop_tasks (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL, -- TWITTER, TIKTOK, FACEBOOK, INSTAGRAM, etc.
  reward DECIMAL(18, 8) NOT NULL DEFAULT 0,
  cooldown_hours INT NOT NULL DEFAULT 24,
  share_text TEXT,
  share_url VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some example tasks
INSERT INTO airdrop_tasks 
  (id, title, description, platform, reward, cooldown_hours, share_text, share_url, active) 
VALUES
  (
    'task1', 
    'Share on X (Twitter)', 
    'Post about Siabet on X and earn tokens', 
    'TWITTER', 
    50, 
    24, 
    'I am winning with @siabet! Join me for the best betting experience! #siabet #crypto #betting', 
    'https://siabet.com', 
    TRUE
  ),
  (
    'task2', 
    'Create a TikTok', 
    'Make a TikTok video showing your experience with Siabet', 
    'TIKTOK', 
    100, 
    48, 
    'Check out my wins on Siabet! #siabet #betting #crypto #winning', 
    'https://siabet.com', 
    TRUE
  ),
  (
    'task3', 
    'Share on Facebook', 
    'Share your Siabet journey with friends on Facebook', 
    'FACEBOOK', 
    30, 
    24, 
    'I\'m betting smarter with Siabet! Join me and start winning today.', 
    'https://siabet.com', 
    TRUE
  ),
  (
    'task4', 
    'Post on Instagram', 
    'Post a story or feed post about Siabet', 
    'INSTAGRAM', 
    40, 
    24, 
    'Winning big with Siabet! #siabet #betting #crypto', 
    'https://siabet.com', 
    TRUE
  ); 