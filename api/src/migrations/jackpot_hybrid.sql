-- Add jackpot functionality to existing sia_topic table
ALTER TABLE sia_topic ADD COLUMN is_jackpot ENUM('yes', 'no') DEFAULT 'no';
ALTER TABLE sia_topic ADD COLUMN jackpot_round_id INT NULL;

-- Simplified jackpot rounds table
CREATE TABLE IF NOT EXISTS jackpot_rounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entry_fee DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    total_prize DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    participants_count INT NOT NULL DEFAULT 0,
    status ENUM('active', 'closed', 'completed') DEFAULT 'active',
    end_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jackpot questions linked to topics (reusing topic system)
CREATE TABLE IF NOT EXISTS jackpot_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id VARCHAR(120) NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('numerical', 'multiple_choice') DEFAULT 'numerical',
    hint TEXT,
    min_value DECIMAL(10, 2) NULL,
    max_value DECIMAL(10, 2) NULL,
    order_position INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_topic (topic_id),
    INDEX idx_order (order_position),
    FOREIGN KEY (topic_id) REFERENCES sia_topic(topic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for referral stats (keeping this separate as it's useful)
CREATE TABLE IF NOT EXISTS user_referral_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    total_referrals INT DEFAULT 0,
    active_referrals INT DEFAULT 0,
    total_commission DECIMAL(15, 2) DEFAULT 0.00,
    this_month_commission DECIMAL(10, 2) DEFAULT 0.00,
    total_wins INT DEFAULT 0,
    global_rank INT NULL,
    accuracy_percentage DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_referral_code (referral_code),
    INDEX idx_user (user_id),
    INDEX idx_total_referrals (total_referrals),
    INDEX idx_global_rank (global_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual referrals tracking
CREATE TABLE IF NOT EXISTS user_referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_user_id VARCHAR(36) NOT NULL,
    referred_user_id VARCHAR(36) NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    commission_earned DECIMAL(10, 2) DEFAULT 0.00,
    referred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_referral (referrer_user_id, referred_user_id),
    INDEX idx_referrer (referrer_user_id),
    INDEX idx_referred (referred_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert demo jackpot round
INSERT INTO jackpot_rounds (title, description, entry_fee, end_time, status) VALUES 
('Weekend Sports Jackpot', 'Predict numerical outcomes for weekend sports matches', 25.00, DATE_ADD(NOW(), INTERVAL 2 DAY), 'active');

-- Get the round ID and create demo topic
SET @round_id = LAST_INSERT_ID();
SET @topic_id = CONCAT('jackpot_', @round_id, '_', UNIX_TIMESTAMP());

-- Insert demo jackpot topic (reusing existing topic system)
INSERT INTO sia_topic (topic_user_id, topic_id, approval_status, topic_title, topic_type_id, topic_question, topic_start_date, topic_end_date, topic_category_id, topic_status, stake_amount, is_jackpot, jackpot_round_id) 
VALUES ('SYSTEM', @topic_id, 'approved', 'Weekend Sports Jackpot', 1, 'Answer 5 numerical questions about weekend sports', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 1, 'active', 25.00, 'yes', @round_id);

-- Insert demo questions for the jackpot
INSERT INTO jackpot_questions (topic_id, question_text, question_type, hint, min_value, max_value, order_position) VALUES 
(@topic_id, 'How many goals will Arsenal score against Chelsea?', 'numerical', 'Arsenal has scored an average of 2.1 goals in their last 5 matches', 0, 10, 1),
(@topic_id, 'How many total points will Lakers score?', 'numerical', 'Lakers average 112 points per game this season', 80, 150, 2),
(@topic_id, 'How many sets will the tennis match go to?', 'numerical', 'Best of 5 sets match between top players', 3, 5, 3),
(@topic_id, 'How many touchdowns will the quarterback throw?', 'numerical', 'Star quarterback facing tough defense', 0, 6, 4),
(@topic_id, 'How many yellow cards in the soccer match?', 'numerical', 'Derby match with historically high card counts', 0, 8, 5); 