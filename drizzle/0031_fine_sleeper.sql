ALTER TABLE `companions` ADD `public_token` text;--> statement-breakpoint
ALTER TABLE `companions` ADD `lost_at` integer;--> statement-breakpoint
ALTER TABLE `companions` ADD `lost_message` text;--> statement-breakpoint
CREATE UNIQUE INDEX `companion_public_token_idx` ON `companions` (`public_token`);