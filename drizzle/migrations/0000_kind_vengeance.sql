CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_session_id_idx` ON `audit_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_event_type_idx` ON `audit_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `location_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` real NOT NULL,
	`recorded_at` integer NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `location_updates_session_id_idx` ON `location_updates` (`session_id`);--> statement-breakpoint
CREATE INDEX `location_updates_recorded_at_idx` ON `location_updates` (`recorded_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`participant_name` text NOT NULL,
	`purpose` text NOT NULL,
	`retention_days` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`consent_version` text,
	`consented_at` integer,
	`last_seen_at` integer,
	`latest_latitude` real,
	`latest_longitude` real,
	`latest_accuracy` real,
	`latest_user_agent` text,
	`expires_at` integer,
	`created_by` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_created_by_idx` ON `sessions` (`created_by`);--> statement-breakpoint
CREATE INDEX `sessions_last_seen_at_idx` ON `sessions` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);