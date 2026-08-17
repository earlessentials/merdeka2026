CREATE TABLE `riddle_prizes` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`claimed_by` text,
	`claimed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `riddle_prizes_code_unique` ON `riddle_prizes` (`code`);--> statement-breakpoint
CREATE TABLE `wheel_prizes` (
	`id` integer PRIMARY KEY NOT NULL,
	`prize_type` text NOT NULL,
	`code` text NOT NULL,
	`claimed_by` text,
	`claimed_at` text,
	`revealed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wheel_prizes_code_unique` ON `wheel_prizes` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_wheel_prizes_claimed_by` ON `wheel_prizes` (`claimed_by`);