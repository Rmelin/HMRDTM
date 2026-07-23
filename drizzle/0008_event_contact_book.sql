ALTER TABLE `event_owners` ADD `contact_phone` text;
--> statement-breakpoint
ALTER TABLE `event_owners` ADD `share_email` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_owners` ADD `share_phone` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `contact_email` text;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `contact_phone` text;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `share_email` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `share_phone` integer DEFAULT 0 NOT NULL;
