ALTER TABLE `events` ADD `created_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `event_status` text DEFAULT 'maybe' NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `created_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `last_seen_at` integer;
--> statement-breakpoint
ALTER TABLE `change_log` ADD `meal_id` text REFERENCES `meals`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `change_log` ADD `guest_group_id` text REFERENCES `guest_groups`(`id`) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `change_log` ADD `is_after_cutoff` integer DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE INDEX `change_log_meal_id_idx` ON `change_log` (`meal_id`);
--> statement-breakpoint
CREATE INDEX `guest_groups_event_id_idx` ON `guest_groups` (`event_id`);
--> statement-breakpoint
CREATE INDEX `meals_event_id_idx` ON `meals` (`event_id`);
