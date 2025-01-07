CREATE TABLE `oauth_connection` (
	`user_id` text NOT NULL,
	`provider_id` integer NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text,
	`name` text,
	`profile_image_url` text,
	PRIMARY KEY(`user_id`, `provider_id`),
	FOREIGN KEY (`provider_id`) REFERENCES `oauth_provider`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `oauth_provider` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
