ALTER TABLE `events` ADD `allow_partner` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `events` ADD `allow_children` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `events`
SET `allow_partner` = 1
WHERE EXISTS (
  SELECT 1 FROM `guest_groups`
  WHERE `guest_groups`.`event_id` = `events`.`id`
    AND `guest_groups`.`allow_partner` = 1
);
--> statement-breakpoint
UPDATE `events`
SET `allow_children` = 1
WHERE EXISTS (
  SELECT 1 FROM `guest_groups`
  WHERE `guest_groups`.`event_id` = `events`.`id`
    AND `guest_groups`.`allow_children` = 1
);
