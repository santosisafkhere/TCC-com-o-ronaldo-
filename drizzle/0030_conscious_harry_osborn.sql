CREATE TABLE `companion_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`companion_id` text NOT NULL,
	`grantee_user_id` text NOT NULL,
	`scope` text DEFAULT 'write' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`companion_id`) REFERENCES `companions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grantee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companion_share_unique` ON `companion_shares` (`companion_id`,`grantee_user_id`);--> statement-breakpoint
CREATE INDEX `companion_share_grantee_idx` ON `companion_shares` (`grantee_user_id`);