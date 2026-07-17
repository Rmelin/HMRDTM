ALTER TABLE `guest_groups` ADD `allow_partner` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `guest_groups` ADD `allow_children` integer DEFAULT 0 NOT NULL;
