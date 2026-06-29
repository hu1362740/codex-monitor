CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `projects` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `projects_ownerId_idx`(`ownerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `applications` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `appKey` VARCHAR(191) NOT NULL,
  `allowedDomains` JSON NOT NULL,
  `environment` VARCHAR(191) NOT NULL DEFAULT 'production',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `applications_appKey_key`(`appKey`),
  INDEX `applications_projectId_idx`(`projectId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `api_keys` (
  `id` VARCHAR(191) NOT NULL,
  `appKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `api_keys_appKey_key`(`appKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `events_raw` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `type` ENUM('error', 'performance', 'behavior', 'custom') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `traceId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `url` TEXT NOT NULL,
  `release` VARCHAR(191) NULL,
  `environment` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `events_raw_applicationId_type_occurredAt_idx`(`applicationId`, `type`, `occurredAt`),
  INDEX `events_raw_traceId_idx`(`traceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `error_events` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `rawEventId` VARCHAR(191) NULL,
  `fingerprint` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `stack` LONGTEXT NULL,
  `mappedStack` LONGTEXT NULL,
  `source` VARCHAR(191) NULL,
  `filename` TEXT NULL,
  `lineno` INTEGER NULL,
  `colno` INTEGER NULL,
  `url` TEXT NOT NULL,
  `release` VARCHAR(191) NULL,
  `environment` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `error_events_applicationId_occurredAt_idx`(`applicationId`, `occurredAt`),
  INDEX `error_events_applicationId_fingerprint_idx`(`applicationId`, `fingerprint`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `performance_events` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `rawEventId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `value` DOUBLE NULL,
  `duration` DOUBLE NULL,
  `status` INTEGER NULL,
  `url` TEXT NOT NULL,
  `metadata` JSON NULL,
  `release` VARCHAR(191) NULL,
  `environment` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `performance_events_applicationId_name_occurredAt_idx`(`applicationId`, `name`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `behavior_events` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `rawEventId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `target` TEXT NULL,
  `url` TEXT NOT NULL,
  `metadata` JSON NULL,
  `release` VARCHAR(191) NULL,
  `environment` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `behavior_events_applicationId_name_occurredAt_idx`(`applicationId`, `name`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `metric_aggregates` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `bucket` DATETIME(3) NOT NULL,
  `metric` VARCHAR(191) NOT NULL,
  `value` DOUBLE NOT NULL,
  `dimensions` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `metric_aggregates_applicationId_bucket_metric_key`(`applicationId`, `bucket`, `metric`),
  INDEX `metric_aggregates_applicationId_bucket_idx`(`applicationId`, `bucket`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `metric` ENUM('error_count', 'error_rate', 'api_failure_rate', 'lcp') NOT NULL,
  `operator` ENUM('gt', 'gte', 'lt', 'lte') NOT NULL,
  `threshold` DOUBLE NOT NULL,
  `durationMin` INTEGER NOT NULL DEFAULT 5,
  `channel` ENUM('webhook', 'email') NOT NULL,
  `target` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `alert_rules_applicationId_enabled_idx`(`applicationId`, `enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_records` (
  `id` VARCHAR(191) NOT NULL,
  `ruleId` VARCHAR(191) NOT NULL,
  `value` DOUBLE NOT NULL,
  `message` TEXT NOT NULL,
  `notified` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `alert_records_ruleId_createdAt_idx`(`ruleId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sourcemap_artifacts` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `release` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `filePath` VARCHAR(191) NOT NULL,
  `sourceRoot` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `sourcemap_artifacts_applicationId_release_idx`(`applicationId`, `release`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `projects` ADD CONSTRAINT `projects_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `applications` ADD CONSTRAINT `applications_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `events_raw` ADD CONSTRAINT `events_raw_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `error_events` ADD CONSTRAINT `error_events_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `performance_events` ADD CONSTRAINT `performance_events_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `behavior_events` ADD CONSTRAINT `behavior_events_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `metric_aggregates` ADD CONSTRAINT `metric_aggregates_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `alert_records` ADD CONSTRAINT `alert_records_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sourcemap_artifacts` ADD CONSTRAINT `sourcemap_artifacts_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
