ALTER TABLE `oauth_client` RENAME TO `client`;--> statement-breakpoint
ALTER TABLE `oauth_client_callback` RENAME TO `client_callback`;--> statement-breakpoint
ALTER TABLE `oauth_client_scope` RENAME TO `client_scope`;--> statement-breakpoint
ALTER TABLE `oauth_client_secret` RENAME TO `client_secret`;--> statement-breakpoint
ALTER TABLE `oauth_scope` RENAME TO `scope`;--> statement-breakpoint
ALTER TABLE `oauth_token` RENAME TO `token`;--> statement-breakpoint
ALTER TABLE `oauth_token_scope` RENAME TO `token_scope`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_client_callback` (
	`client_id` text NOT NULL,
	`callback_url` text NOT NULL,
	PRIMARY KEY(`client_id`, `callback_url`),
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_callback`("client_id", "callback_url") SELECT "client_id", "callback_url" FROM `client_callback`;--> statement-breakpoint
DROP TABLE `client_callback`;--> statement-breakpoint
ALTER TABLE `__new_client_callback` RENAME TO `client_callback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_client_scope` (
	`client_id` text NOT NULL,
	`scope_id` integer NOT NULL,
	PRIMARY KEY(`client_id`, `scope_id`),
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scope_id`) REFERENCES `scope`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_scope`("client_id", "scope_id") SELECT "client_id", "scope_id" FROM `client_scope`;--> statement-breakpoint
DROP TABLE `client_scope`;--> statement-breakpoint
ALTER TABLE `__new_client_scope` RENAME TO `client_scope`;--> statement-breakpoint
CREATE TABLE `__new_client_secret` (
	`client_id` text NOT NULL,
	`secret` text NOT NULL,
	`description` text,
	`issued_by` text NOT NULL,
	`issued_at` integer NOT NULL,
	PRIMARY KEY(`client_id`, `secret`),
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_client_secret`("client_id", "secret", "description", "issued_by", "issued_at") SELECT "client_id", "secret", "description", "issued_by", "issued_at" FROM `client_secret`;--> statement-breakpoint
DROP TABLE `client_secret`;--> statement-breakpoint
ALTER TABLE `__new_client_secret` RENAME TO `client_secret`;--> statement-breakpoint
DROP INDEX IF EXISTS `oauth_scope_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `scope_name_unique` ON `scope` (`name`);--> statement-breakpoint
CREATE TABLE `__new_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`code_expires_at` integer NOT NULL,
	`code_used` integer NOT NULL,
	`redirect_uri` text NOT NULL,
	`access_token` text NOT NULL,
	`access_token_expires_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_token`("id", "client_id", "user_id", "code", "code_expires_at", "code_used", "redirect_uri", "access_token", "access_token_expires_at") SELECT "id", "client_id", "user_id", "code", "code_expires_at", "code_used", "redirect_uri", "access_token", "access_token_expires_at" FROM `token`;--> statement-breakpoint
DROP TABLE `token`;--> statement-breakpoint
ALTER TABLE `__new_token` RENAME TO `token`;--> statement-breakpoint
CREATE UNIQUE INDEX `token_code_unique` ON `token` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_access_token_unique` ON `token` (`access_token`);--> statement-breakpoint
CREATE TABLE `__new_token_scope` (
	`token_id` integer NOT NULL,
	`scope_id` integer NOT NULL,
	PRIMARY KEY(`token_id`, `scope_id`),
	FOREIGN KEY (`token_id`) REFERENCES `token`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scope_id`) REFERENCES `scope`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_token_scope`("token_id", "scope_id") SELECT "token_id", "scope_id" FROM `token_scope`;--> statement-breakpoint
DROP TABLE `token_scope`;--> statement-breakpoint
ALTER TABLE `__new_token_scope` RENAME TO `token_scope`;