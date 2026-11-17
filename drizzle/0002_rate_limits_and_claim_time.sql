CREATE TABLE "achei"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achei"."notification_outbox" ADD COLUMN "claimed_at" timestamp with time zone;