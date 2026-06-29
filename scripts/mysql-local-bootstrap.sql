-- Run this script in MySQL Workbench with an administrator account.
-- It creates the local development database and the credentials used by .env.example.

CREATE DATABASE IF NOT EXISTS `codex_monitor`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'monitor'@'localhost' IDENTIFIED BY 'monitor_pass';
ALTER USER 'monitor'@'localhost' IDENTIFIED BY 'monitor_pass';

GRANT ALL PRIVILEGES ON `codex_monitor`.* TO 'monitor'@'localhost';
FLUSH PRIVILEGES;
