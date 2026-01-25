-- Table for storing user blockchain addresses
CREATE TABLE IF NOT EXISTS user_blockchain_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    chain VARCHAR(20) NOT NULL COMMENT 'blockchain name: stellar, tron, binance, etc.',
    address VARCHAR(255) NOT NULL COMMENT 'blockchain address',
    private_key TEXT COMMENT 'encrypted private key',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_chain (user_id, chain),
    INDEX idx_address (address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for recording sweep transactions
CREATE TABLE IF NOT EXISTS sweep_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    chain VARCHAR(20) NOT NULL COMMENT 'blockchain name: stellar, tron, binance, etc.',
    from_address VARCHAR(255) NOT NULL COMMENT 'source address',
    to_address VARCHAR(255) NOT NULL COMMENT 'destination address',
    amount DECIMAL(24, 8) NOT NULL COMMENT 'amount swept',
    token VARCHAR(10) NOT NULL COMMENT 'token symbol: USDC, USDT, etc.',
    transaction_hash VARCHAR(255) COMMENT 'blockchain transaction hash',
    status VARCHAR(20) DEFAULT 'COMPLETED' COMMENT 'transaction status: COMPLETED, FAILED, PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_chain (chain),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 