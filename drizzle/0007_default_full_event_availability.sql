INSERT INTO `guest_availability` (`group_id`, `comes_at`, `leaves_at`)
SELECT `guest_groups`.`id`, `events`.`starts_at`, `events`.`ends_at`
FROM `guest_groups`
INNER JOIN `events` ON `events`.`id` = `guest_groups`.`event_id`
WHERE NOT EXISTS (
  SELECT 1
  FROM `guest_availability`
  WHERE `guest_availability`.`group_id` = `guest_groups`.`id`
);
