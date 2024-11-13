PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`code_expires_at` integer NOT NULL,
	`code_used` integer NOT NULL,
	`redirect_uri` text,
	`access_token` text NOT NULL,
	`access_token_expires_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_token`("id", "client_id", "user_id", "code", "code_expires_at", "code_used", "redirect_uri", "access_token", "access_token_expires_at") SELECT "id", "client_id", "user_id", "code", "code_expires_at", "code_used", "redirect_uri", "access_token", "access_token_expires_at" FROM `token`;--> statement-breakpoint
DROP TABLE `token`;--> statement-breakpoint
ALTER TABLE `__new_token` RENAME TO `token`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `token_code_unique` ON `token` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_access_token_unique` ON `token` (`access_token`);