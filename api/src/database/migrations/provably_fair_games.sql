-- Provably Fair Games Tables

-- Games table to store game initialization
CREATE TABLE IF NOT EXISTS sia_games (
    game_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    game_type ENUM('coin', 'dice', 'crash') NOT NULL,
    server_seed_hash VARCHAR(255) NOT NULL,
    server_seed VARCHAR(255) NULL,
    client_seed VARCHAR(255) NOT NULL,
    nonce INT DEFAULT 0,
    result JSON NULL,
    payout DECIMAL(10,2) DEFAULT 0,
    status ENUM('initialized', 'completed', 'cancelled') DEFAULT 'initialized',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    played_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Game history table to store completed games
CREATE TABLE IF NOT EXISTS sia_game_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    game_type ENUM('coin', 'dice', 'crash') NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL,
    payout DECIMAL(10,2) NOT NULL,
    result JSON NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_game_type (game_type),
    INDEX idx_played_at (played_at)
); 