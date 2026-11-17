import { relations } from 'drizzle-orm';
import {
	integer,
	pgSchema,
	text,
	uniqueIndex,
	index,
	doublePrecision,
	primaryKey,
	boolean,
	timestamp,
	jsonb
} from 'drizzle-orm/pg-core';

// Every table lives in a dedicated Postgres schema instead of `public`, so the
// app can share a database (e.g. one Supabase project) with other systems
// without name clashes, and so Supabase's auto-generated Data API — which only
// exposes `public` by default — never serves these tables.
export const DB_SCHEMA = 'achei';
export const appSchema = pgSchema(DB_SCHEMA);
const pgTable = appSchema.table;

// users

export const users = pgTable(
	'users',
	{
		id: text('id').primaryKey(),
		username: text('username').notNull().unique(),
		displayName: text('display_name').notNull(),
		passwordHash: text('password_hash'),
		calendarFeedToken: text('calendar_feed_token'),
		role: text('role', { enum: ['admin', 'member', 'caretaker'] })
			.notNull()
			.default('member'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
		theme: text('theme', { enum: ['light', 'dark', 'system'] })
			.notNull()
			.default('system'),
		locale: text('locale', { enum: ['en', 'it', 'de', 'es', 'fr', 'pt'] })
			.notNull()
			.default('pt'),
		email: text('email'),
		phone: text('phone'),
		oidcSubject: text('oidc_subject'),
		oidcIssuer: text('oidc_issuer'),
		reminderUndoSeconds: integer('reminder_undo_seconds'),
		defaultRecurrenceUnit: text('default_recurrence_unit', {
			enum: ['day', 'week', 'month', 'year']
		}),
		notifyReminderEmail: boolean('notify_reminder_email').notNull().default(false),
		notifyShiftEmail: boolean('notify_shift_email').notNull().default(false),
		// ntfy topic name on the site-configured server (env NTFY_URL). A
		// non-empty topic is the opt-in for push notifications; the user
		// receives both categories (reminders, shift alerts) within their
		// role's visibility scope. Null = no pushes.
		ntfyTopic: text('ntfy_topic'),
		// Profile photo — mirrors the companion avatar columns.
		avatarPath: text('avatar_path'),
		avatarProvider: text('avatar_provider'),
		avatarStorageKey: text('avatar_storage_key'),
		// --- 2FA (TOTP) ---
		totpSecret: text('totp_secret'),
		totpEnabledAt: timestamp('totp_enabled_at', { withTimezone: true, mode: 'date' }),
		totpLastStep: integer('totp_last_step')
	},
	(t) => [
		uniqueIndex('users_oidc_idx').on(t.oidcIssuer, t.oidcSubject),
		uniqueIndex('users_email_idx').on(t.email),
		uniqueIndex('users_calendar_feed_token_idx').on(t.calendarFeedToken)
	]
);

export const totpBackupCodes = pgTable('totp_backup_codes', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	codeHash: text('code_hash').notNull(),
	usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const appSettings = pgTable('app_settings', {
	id: text('id').primaryKey().default('singleton'),
	require2fa: text('require_2fa', { enum: ['off', 'admins', 'everyone'] })
		.notNull()
		.default('off'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
	updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' })
});

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		oidcIdTokenHint: text('oidc_id_token_hint')
	},
	(t) => [index('session_user_idx').on(t.userId)]
);

export const passwordResetTokens = pgTable(
	'password_reset_tokens',
	{
		// sha256 hex of the raw token — same storage pattern as sessions.id, so a
		// DB leak never exposes a usable token.
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(t) => [index('password_reset_user_idx').on(t.userId)]
);

// Notification outbox (issue #12). Detection (the scheduler's producers) and
// delivery (the drain) are decoupled through this table so a crash, restart,
// or SMTP outage never silently drops a notification. The unique dedupe key
// makes producers idempotent across overlapping scans and restarts.
export type OutboxPayload =
	| { kind: 'reminderDue'; reminderId: string; dueAtEpoch: number }
	| { kind: 'shiftStart'; shiftId: string; boundaryEpoch: number }
	| { kind: 'shiftEnd'; shiftId: string; boundaryEpoch: number };

export const notificationOutbox = pgTable(
	'notification_outbox',
	{
		id: text('id').primaryKey(),
		// reminder: 'reminder:{reminderId}:{dueAtEpochSeconds}:{userId}:{channel}'
		// shift:    'shift:{shiftId}:{start|end}:{boundaryEpochSeconds}:{userId}:{channel}'
		// One row per occurrence per recipient per channel.
		dedupeKey: text('dedupe_key').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		channel: text('channel', { enum: ['email', 'ntfy', 'apprise'] }).notNull(),
		// Rendering happens at send time in the recipient's locale; the payload
		// carries ids only.
		payload: jsonb('payload').$type<OutboxPayload>().notNull(),
		// queued -> claimed -> sent | skipped | failed; claimed rows orphaned by a
		// crash are reset to queued at boot. skipped = conditions no longer hold
		// (reminder completed, user opted out, shift already started) — not an error.
		status: text('status', { enum: ['queued', 'claimed', 'sent', 'skipped', 'failed'] })
			.notNull()
			.default('queued'),
		attempts: integer('attempts').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		// When the current claim was taken. Recovery only re-queues claims older
		// than a few minutes, so overlapping scheduler runs (cron mode, several
		// serverless instances) never steal each other's in-flight rows.
		claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
		sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' })
	},
	(t) => [uniqueIndex('outbox_dedupe_idx').on(t.dedupeKey), index('outbox_status_idx').on(t.status)]
);

// Fixed-window attempt counters for brute-force throttling (login, 2FA,
// password reset, OIDC callback). Kept in the database rather than in memory
// so the limit holds across serverless instances and restarts.
export const rateLimits = pgTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull(),
	resetAt: timestamp('reset_at', { withTimezone: true, mode: 'date' }).notNull()
});

// companions

export const companions = pgTable(
	'companions',
	{
		id: text('id').primaryKey(),
		// Owner of the pet and its full history. The owner always retains control:
		// shared parties (e.g. clinics, sitters) get scoped write access via
		// `companion_caretakers` but never ownership. Nullable only to keep the
		// migration of pre-ownership installs clean; new pets always set it.
		ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		species: text('species', { enum: ['dog'] })
			.notNull()
			.default('dog'),
		breed: text('breed'),
		dob: text('dob'),
		sex: text('sex', { enum: ['male', 'female', 'unknown'] }),
		weightUnit: text('weight_unit', { enum: ['kg', 'lbs'] })
			.notNull()
			.default('lbs'),
		microchip: text('microchip'),
		avatarPath: text('avatar_path'),
		avatarProvider: text('avatar_provider', { enum: ['local', 's3', 'immich'] })
			.notNull()
			.default('local'),
		avatarStorageKey: text('avatar_storage_key'),
		bio: text('bio'),
		feedingSchedule: text('feeding_schedule'),
		walkSchedule: text('walk_schedule'),
		medicationSchedule: text('medication_schedule'),
		emergencyContactName: text('emergency_contact_name'),
		emergencyContactPhone: text('emergency_contact_phone'),
		vetName: text('vet_name'),
		vetPhone: text('vet_phone'),
		vetClinic: text('vet_clinic'),
		notesForSitter: text('notes_for_sitter'),
		isActive: boolean('is_active').notNull().default(true),
		archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
		archiveNote: text('archive_note'),
		// Public profile ("found my pet" page reached by the QR tag). A non-null
		// token is the owner's opt-in: /p/{token} then shows the pet's name, photo
		// and a contact phone to anyone holding the link. Null = no public page.
		// Disabling clears it, so a re-enable issues a fresh link and old tags die.
		publicToken: text('public_token'),
		// Set while the pet is reported lost; the public page turns into a
		// "missing" poster. Null = not lost.
		lostAt: timestamp('lost_at', { withTimezone: true, mode: 'date' }),
		lostMessage: text('lost_message'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(t) => [
		index('companion_active_idx').on(t.isActive),
		index('companion_owner_idx').on(t.ownerId),
		uniqueIndex('companion_public_token_idx').on(t.publicToken)
	]
);

// journal

export const journalEntries = pgTable(
	'journal_entries',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		body: text('body').notNull().default(''),
		mood: text('mood', { enum: ['great', 'good', 'meh', 'off', 'sick'] }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' }),
		updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		uniquePerDay: uniqueIndex('journal_companion_date_idx').on(t.companionId, t.date)
	})
);

export const journalPhotos = pgTable(
	'journal_photos',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id')
			.notNull()
			.references(() => journalEntries.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(),
		provider: text('provider', { enum: ['local', 's3', 'immich'] })
			.notNull()
			.default('local'),
		storageKey: text('storage_key'),
		originalName: text('original_name'),
		mediaType: text('media_type', { enum: ['photo', 'video'] })
			.notNull()
			.default('photo'),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		notes: text('notes'),
		// Transcode lifecycle. 'ready' = playable as stored (the default for
		// every pre-existing row and for any media that isn't queued for
		// transcoding). 'processing' = enqueued, awaiting the worker. 'claimed'
		// = a worker has atomically taken the job (crash-recovery marker).
		// 'failed' = transcode gave up; UI falls back to a download link. Only
		// VIDEO_TRANSCODE=true ever produces non-'ready' values.
		status: text('status', { enum: ['ready', 'processing', 'claimed', 'failed'] })
			.notNull()
			.default('ready'),
		// Storage key of the kept source video (VIDEO_KEEP_ORIGINAL=true). Never
		// served to clients; retained for re-encode/backup only.
		originalKey: text('original_key'),
		// Storage key of the generated poster/thumbnail JPEG.
		posterKey: text('poster_key'),
		// Times the worker has attempted this job. Bounds retries so a poison
		// input can't be requeued forever on every boot.
		transcodeAttempts: integer('transcode_attempts').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		entryIdx: index('photo_entry_idx').on(t.entryId),
		// The worker scans for queued jobs by status; index it.
		statusIdx: index('photo_status_idx').on(t.status)
	})
);

// health log

export const healthEvents = pgTable(
	'health_events',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: ['vet_visit', 'vaccination', 'medication', 'procedure', 'other']
		}).notNull(),
		title: text('title').notNull(),
		notes: text('notes'),
		occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
		vetName: text('vet_name'),
		vetClinic: text('vet_clinic'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		companionIdx: index('health_companion_idx').on(t.companionId),
		typeIdx: index('health_type_idx').on(t.type)
	})
);

// companion documents (issue #95)

export const documents = pgTable(
	'documents',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		// Optional link to a health event of the SAME companion. App code
		// validates the companion match on every write (SQLite can't express
		// the composite constraint cleanly).
		healthEventId: text('health_event_id').references(() => healthEvents.id, {
			onDelete: 'set null'
		}),
		// `{documentId}.{ext}` — server-generated, never derived from the
		// uploaded filename. Used in /api/documents URLs.
		filename: text('filename').notNull(),
		provider: text('provider', { enum: ['local', 's3', 'paperless'] })
			.notNull()
			.default('local'),
		storageKey: text('storage_key').notNull(),
		title: text('title').notNull(),
		category: text('category', {
			enum: ['receipt', 'invoice', 'medical', 'insurance', 'ownership', 'other']
		})
			.notNull()
			.default('other'),
		// User-set document date (receipt date), not upload date. YYYY-MM-DD.
		documentDate: text('document_date'),
		originalName: text('original_name'),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		companionIdx: index('document_companion_idx').on(t.companionId),
		healthEventIdx: index('document_health_event_idx').on(t.healthEventId)
	})
);

export const weightEntries = pgTable(
	'weight_entries',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		weight: doublePrecision('weight').notNull(),
		unit: text('unit', { enum: ['kg', 'lbs'] }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		companionIdx: index('weight_companion_idx').on(t.companionId)
	})
);

// daily log

export const dailyEvents = pgTable(
	'daily_events',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: ['walk', 'meal', 'bathroom', 'treat', 'play', 'grooming', 'other']
		}).notNull(),
		notes: text('notes'),
		durationMinutes: integer('duration_minutes'),
		loggedAt: timestamp('logged_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' }),
		eventGroupId: text('event_group_id')
	},
	(t) => ({
		companionIdx: index('daily_companion_idx').on(t.companionId),
		loggedIdx: index('daily_logged_idx').on(t.loggedAt),
		groupIdx: index('daily_event_group_idx').on(t.eventGroupId)
	})
);

// reminders

export const reminders = pgTable(
	'reminders',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		type: text('type', {
			enum: ['vet', 'medication', 'vaccination', 'grooming', 'other']
		}).notNull(),
		dueAt: timestamp('due_at', { withTimezone: true, mode: 'date' }).notNull(),
		isRecurring: boolean('is_recurring').notNull().default(false),
		recurrenceUnit: text('recurrence_unit', { enum: ['day', 'week', 'month', 'year'] }),
		recurrenceInterval: integer('recurrence_interval'),
		recurrenceAnchor: text('recurrence_anchor', {
			enum: ['interval', 'day_of_week', 'day_of_month', 'day_of_year']
		}),
		recurrenceAnchorValue: integer('recurrence_anchor_value'),
		seriesId: text('series_id'),
		completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
		completedBy: text('completed_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		loggedBy: text('logged_by').references(() => users.id, { onDelete: 'set null' })
	},
	(t) => ({
		companionIdx: index('reminder_companion_idx').on(t.companionId),
		dueIdx: index('reminder_due_idx').on(t.dueAt),
		seriesDueIdx: index('reminder_series_due_idx').on(t.seriesId, t.dueAt)
	})
);

// companion <-> caretaker assignments

export const companionCaretakers = pgTable(
	'companion_caretakers',
	{
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
	},
	(t) => ({
		pk: primaryKey({ columns: [t.companionId, t.userId] })
	})
);

// companion shares — owner-initiated, scoped, revocable, optionally expiring
// access grants. Distinct from companion_caretakers (the sitter/shift system):
// this is how an owner hands a clinic/vet write access to a pet's record while
// always retaining ownership. Revoke = delete the row. A 'read' share can view;
// a 'write' share can also add records (but never delete the owner's data nor
// manage the pet — that stays with the owner/admin).
export const companionShares = pgTable(
	'companion_shares',
	{
		id: text('id').primaryKey(),
		companionId: text('companion_id')
			.notNull()
			.references(() => companions.id, { onDelete: 'cascade' }),
		// The user the pet is shared with (e.g. a clinic account).
		granteeUserId: text('grantee_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		scope: text('scope', { enum: ['read', 'write'] })
			.notNull()
			.default('write'),
		// Who created the share (the owner). Kept for the audit trail; nulled if
		// that user is removed.
		createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		// Null = never expires. Access is denied once this is in the past.
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' })
	},
	(t) => [
		uniqueIndex('companion_share_unique').on(t.companionId, t.granteeUserId),
		index('companion_share_grantee_idx').on(t.granteeUserId)
	]
);

// caretaker shifts

export const caretakerShifts = pgTable(
	'caretaker_shifts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		startAt: timestamp('start_at', { withTimezone: true, mode: 'date' }).notNull(),
		endAt: timestamp('end_at', { withTimezone: true, mode: 'date' }).notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(t) => ({
		userIdx: index('shift_user_idx').on(t.userId)
	})
);

// API keys for REST API access

export const apiKeys = pgTable(
	'api_keys',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		keyHash: text('key_hash').notNull(),
		keyPrefix: text('key_prefix').notNull(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(t) => [index('api_key_user_idx').on(t.userId)]
);

export type ApiKey = typeof apiKeys.$inferSelect;

// type exports

export type User = typeof users.$inferSelect;
export type TotpBackupCode = typeof totpBackupCodes.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NotificationOutboxRow = typeof notificationOutbox.$inferSelect;
export type Companion = typeof companions.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalPhoto = typeof journalPhotos.$inferSelect;
export type HealthEvent = typeof healthEvents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type DailyEvent = typeof dailyEvents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type CompanionCaretaker = typeof companionCaretakers.$inferSelect;
export type CompanionShare = typeof companionShares.$inferSelect;
export type CaretakerShift = typeof caretakerShifts.$inferSelect;

// relations

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
	user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] })
}));

export const notificationOutboxRelations = relations(notificationOutbox, ({ one }) => ({
	user: one(users, { fields: [notificationOutbox.userId], references: [users.id] })
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	user: one(users, { fields: [apiKeys.userId], references: [users.id] })
}));

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	passwordResetTokens: many(passwordResetTokens),
	notificationOutbox: many(notificationOutbox),
	totpBackupCodes: many(totpBackupCodes),
	apiKeys: many(apiKeys),
	companionCaretakers: many(companionCaretakers),
	shifts: many(caretakerShifts),
	loggedJournalEntries: many(journalEntries, { relationName: 'journalLogger' }),
	updatedJournalEntries: many(journalEntries, { relationName: 'journalUpdater' }),
	loggedJournalPhotos: many(journalPhotos),
	loggedDailyEvents: many(dailyEvents),
	loggedHealthEvents: many(healthEvents),
	loggedWeightEntries: many(weightEntries),
	loggedReminders: many(reminders, { relationName: 'reminderLogger' }),
	completedReminders: many(reminders, { relationName: 'reminderCompleter' })
}));

export const totpBackupCodesRelations = relations(totpBackupCodes, ({ one }) => ({
	user: one(users, { fields: [totpBackupCodes.userId], references: [users.id] })
}));

export const companionCaretakersRelations = relations(companionCaretakers, ({ one }) => ({
	companion: one(companions, {
		fields: [companionCaretakers.companionId],
		references: [companions.id]
	}),
	user: one(users, { fields: [companionCaretakers.userId], references: [users.id] })
}));

export const caretakerShiftsRelations = relations(caretakerShifts, ({ one }) => ({
	user: one(users, { fields: [caretakerShifts.userId], references: [users.id] })
}));

export const companionSharesRelations = relations(companionShares, ({ one }) => ({
	companion: one(companions, {
		fields: [companionShares.companionId],
		references: [companions.id]
	}),
	grantee: one(users, {
		fields: [companionShares.granteeUserId],
		references: [users.id],
		relationName: 'shareGrantee'
	}),
	creator: one(users, {
		fields: [companionShares.createdBy],
		references: [users.id],
		relationName: 'shareCreator'
	})
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
	logger: one(users, {
		fields: [journalEntries.loggedBy],
		references: [users.id],
		relationName: 'journalLogger'
	}),
	updater: one(users, {
		fields: [journalEntries.updatedBy],
		references: [users.id],
		relationName: 'journalUpdater'
	}),
	photos: many(journalPhotos)
}));

export const journalPhotosRelations = relations(journalPhotos, ({ one }) => ({
	entry: one(journalEntries, {
		fields: [journalPhotos.entryId],
		references: [journalEntries.id]
	}),
	logger: one(users, { fields: [journalPhotos.loggedBy], references: [users.id] })
}));

export const dailyEventsRelations = relations(dailyEvents, ({ one }) => ({
	logger: one(users, { fields: [dailyEvents.loggedBy], references: [users.id] })
}));

export const healthEventsRelations = relations(healthEvents, ({ one, many }) => ({
	logger: one(users, { fields: [healthEvents.loggedBy], references: [users.id] }),
	documents: many(documents)
}));

export const documentsRelations = relations(documents, ({ one }) => ({
	companion: one(companions, { fields: [documents.companionId], references: [companions.id] }),
	healthEvent: one(healthEvents, {
		fields: [documents.healthEventId],
		references: [healthEvents.id]
	}),
	uploader: one(users, { fields: [documents.uploadedBy], references: [users.id] })
}));

export const weightEntriesRelations = relations(weightEntries, ({ one }) => ({
	logger: one(users, { fields: [weightEntries.loggedBy], references: [users.id] })
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
	logger: one(users, {
		fields: [reminders.loggedBy],
		references: [users.id],
		relationName: 'reminderLogger'
	}),
	completer: one(users, {
		fields: [reminders.completedBy],
		references: [users.id],
		relationName: 'reminderCompleter'
	})
}));
