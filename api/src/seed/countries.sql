-- Create countries table (matches kitipay dump)
CREATE TABLE IF NOT EXISTS `countries` (
  `country_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `has_payouts` enum('no','yes') NOT NULL DEFAULT 'no',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed Kenya and Uganda (run once; ignore duplicate key errors if re-run)
INSERT IGNORE INTO `countries` (`country_id`, `name`, `has_payouts`, `status`) VALUES
(254, 'KENYA', 'no', 'active'),
(256, 'UGANDA', 'no', 'active');
