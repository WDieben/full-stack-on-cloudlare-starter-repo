PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_destination_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`account_id` text NOT NULL,
	`destination_url` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_destination_evaluations`("id", "link_id", "account_id", "destination_url", "status", "reason", "created_at") SELECT "id", "link_id", "account_id", "destination_url", "status", "reason", "created_at" FROM `destination_evaluations`;--> statement-breakpoint
DROP TABLE `destination_evaluations`;--> statement-breakpoint
ALTER TABLE `__new_destination_evaluations` RENAME TO `destination_evaluations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_destination_evaluations_account_time` ON `destination_evaluations` (`account_id`,`created_at`);