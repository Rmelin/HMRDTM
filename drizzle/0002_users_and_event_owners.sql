ALTER TABLE `admins` ADD `name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `admins` ADD `role` text DEFAULT 'admin' NOT NULL;
--> statement-breakpoint
CREATE TABLE `event_owners` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `event_owners` (`event_id`, `user_id`, `created_at`)
SELECT `events`.`id`, `admins`.`id`, unixepoch() * 1000
FROM `events` CROSS JOIN `admins`;
--> statement-breakpoint
CREATE INDEX `event_owners_user_id_idx` ON `event_owners` (`user_id`);
