UPDATE `guest_groups`
SET `event_status` = 'invited'
WHERE `event_status` = 'maybe'
  AND `last_seen_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `people`
    INNER JOIN `guest_responses` ON `guest_responses`.`person_id` = `people`.`id`
    WHERE `people`.`group_id` = `guest_groups`.`id`
  );
