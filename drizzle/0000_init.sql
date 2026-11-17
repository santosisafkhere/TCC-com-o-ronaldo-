CREATE SCHEMA IF NOT EXISTS "achei";
--> statement-breakpoint
CREATE TABLE "achei"."api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achei"."app_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"require_2fa" text DEFAULT 'off' NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."caretaker_shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achei"."companion_caretakers" (
	"companion_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "companion_caretakers_companion_id_user_id_pk" PRIMARY KEY("companion_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "achei"."companion_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"grantee_user_id" text NOT NULL,
	"scope" text DEFAULT 'write' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "achei"."companions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"name" text NOT NULL,
	"species" text DEFAULT 'dog' NOT NULL,
	"breed" text,
	"dob" text,
	"sex" text,
	"weight_unit" text DEFAULT 'lbs' NOT NULL,
	"microchip" text,
	"avatar_path" text,
	"avatar_provider" text DEFAULT 'local' NOT NULL,
	"avatar_storage_key" text,
	"bio" text,
	"feeding_schedule" text,
	"walk_schedule" text,
	"medication_schedule" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"vet_name" text,
	"vet_phone" text,
	"vet_clinic" text,
	"notes_for_sitter" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"archive_note" text,
	"public_token" text,
	"lost_at" timestamp with time zone,
	"lost_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achei"."daily_events" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"type" text NOT NULL,
	"notes" text,
	"duration_minutes" integer,
	"logged_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text,
	"event_group_id" text
);
--> statement-breakpoint
CREATE TABLE "achei"."documents" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"health_event_id" text,
	"filename" text NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"storage_key" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"document_date" text,
	"original_name" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."health_events" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"vet_name" text,
	"vet_clinic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"date" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"mood" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."journal_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"filename" text NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"storage_key" text,
	"original_name" text,
	"media_type" text DEFAULT 'photo' NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'ready' NOT NULL,
	"original_key" text,
	"poster_key" text,
	"transcode_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."notification_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "achei"."password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achei"."reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_unit" text,
	"recurrence_interval" integer,
	"recurrence_anchor" text,
	"recurrence_anchor_value" integer,
	"series_id" text,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text
);
--> statement-breakpoint
CREATE TABLE "achei"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"oidc_id_token_hint" text
);
--> statement-breakpoint
CREATE TABLE "achei"."totp_backup_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achei"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text,
	"calendar_feed_token" text,
	"role" text DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"theme" text DEFAULT 'system' NOT NULL,
	"locale" text DEFAULT 'pt' NOT NULL,
	"email" text,
	"phone" text,
	"oidc_subject" text,
	"oidc_issuer" text,
	"reminder_undo_seconds" integer,
	"default_recurrence_unit" text,
	"notify_reminder_email" boolean DEFAULT false NOT NULL,
	"notify_shift_email" boolean DEFAULT false NOT NULL,
	"ntfy_topic" text,
	"avatar_path" text,
	"avatar_provider" text,
	"avatar_storage_key" text,
	"totp_secret" text,
	"totp_enabled_at" timestamp with time zone,
	"totp_last_step" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "achei"."weight_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"companion_id" text NOT NULL,
	"weight" double precision NOT NULL,
	"unit" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by" text
);
--> statement-breakpoint
ALTER TABLE "achei"."api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."caretaker_shifts" ADD CONSTRAINT "caretaker_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companion_caretakers" ADD CONSTRAINT "companion_caretakers_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companion_caretakers" ADD CONSTRAINT "companion_caretakers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companion_shares" ADD CONSTRAINT "companion_shares_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companion_shares" ADD CONSTRAINT "companion_shares_grantee_user_id_users_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companion_shares" ADD CONSTRAINT "companion_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."companions" ADD CONSTRAINT "companions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."daily_events" ADD CONSTRAINT "daily_events_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."daily_events" ADD CONSTRAINT "daily_events_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."documents" ADD CONSTRAINT "documents_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."documents" ADD CONSTRAINT "documents_health_event_id_health_events_id_fk" FOREIGN KEY ("health_event_id") REFERENCES "achei"."health_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."health_events" ADD CONSTRAINT "health_events_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."health_events" ADD CONSTRAINT "health_events_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."journal_entries" ADD CONSTRAINT "journal_entries_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."journal_entries" ADD CONSTRAINT "journal_entries_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."journal_entries" ADD CONSTRAINT "journal_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."journal_photos" ADD CONSTRAINT "journal_photos_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "achei"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."journal_photos" ADD CONSTRAINT "journal_photos_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."notification_outbox" ADD CONSTRAINT "notification_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."reminders" ADD CONSTRAINT "reminders_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."reminders" ADD CONSTRAINT "reminders_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."reminders" ADD CONSTRAINT "reminders_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."totp_backup_codes" ADD CONSTRAINT "totp_backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "achei"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."weight_entries" ADD CONSTRAINT "weight_entries_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "achei"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achei"."weight_entries" ADD CONSTRAINT "weight_entries_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "achei"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_user_idx" ON "achei"."api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shift_user_idx" ON "achei"."caretaker_shifts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companion_share_unique" ON "achei"."companion_shares" USING btree ("companion_id","grantee_user_id");--> statement-breakpoint
CREATE INDEX "companion_share_grantee_idx" ON "achei"."companion_shares" USING btree ("grantee_user_id");--> statement-breakpoint
CREATE INDEX "companion_active_idx" ON "achei"."companions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "companion_owner_idx" ON "achei"."companions" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companion_public_token_idx" ON "achei"."companions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "daily_companion_idx" ON "achei"."daily_events" USING btree ("companion_id");--> statement-breakpoint
CREATE INDEX "daily_logged_idx" ON "achei"."daily_events" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX "daily_event_group_idx" ON "achei"."daily_events" USING btree ("event_group_id");--> statement-breakpoint
CREATE INDEX "document_companion_idx" ON "achei"."documents" USING btree ("companion_id");--> statement-breakpoint
CREATE INDEX "document_health_event_idx" ON "achei"."documents" USING btree ("health_event_id");--> statement-breakpoint
CREATE INDEX "health_companion_idx" ON "achei"."health_events" USING btree ("companion_id");--> statement-breakpoint
CREATE INDEX "health_type_idx" ON "achei"."health_events" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_companion_date_idx" ON "achei"."journal_entries" USING btree ("companion_id","date");--> statement-breakpoint
CREATE INDEX "photo_entry_idx" ON "achei"."journal_photos" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "photo_status_idx" ON "achei"."journal_photos" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_idx" ON "achei"."notification_outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_status_idx" ON "achei"."notification_outbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "achei"."password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminder_companion_idx" ON "achei"."reminders" USING btree ("companion_id");--> statement-breakpoint
CREATE INDEX "reminder_due_idx" ON "achei"."reminders" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "reminder_series_due_idx" ON "achei"."reminders" USING btree ("series_id","due_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "achei"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_oidc_idx" ON "achei"."users" USING btree ("oidc_issuer","oidc_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "achei"."users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_calendar_feed_token_idx" ON "achei"."users" USING btree ("calendar_feed_token");--> statement-breakpoint
CREATE INDEX "weight_companion_idx" ON "achei"."weight_entries" USING btree ("companion_id");