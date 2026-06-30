ALTER TABLE `companions` ADD `owner_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `companion_owner_idx` ON `companions` (`owner_id`);