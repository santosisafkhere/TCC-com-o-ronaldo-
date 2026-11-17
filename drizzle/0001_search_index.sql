-- Full-text search index (replaces the SQLite FTS5 virtual table).
--
-- One row per searchable record, kept in sync by triggers on the source tables.
-- `app_search` is a text-search configuration that folds accents (so "vacinacao"
-- finds "vacinação") without stemming, matching the old `unicode61
-- remove_diacritics` tokenizer. Not declared in schema.ts on purpose: it is
-- maintained by the database and only read through raw SQL in search.ts.
-- Everything is created inside the app schema (`achei`), never in `public`.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA achei;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION achei.app_search (COPY = pg_catalog.simple);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION achei.app_search
	ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
	WITH achei.unaccent, pg_catalog.simple;
--> statement-breakpoint
CREATE TABLE achei.search_index (
	entity_type text NOT NULL,
	entity_id text NOT NULL,
	companion_id text NOT NULL REFERENCES achei.companions(id) ON DELETE CASCADE,
	event_date text,
	title text NOT NULL DEFAULT '',
	body text NOT NULL DEFAULT '',
	tsv tsvector GENERATED ALWAYS AS (
		setweight(to_tsvector('achei.app_search', title), 'A') || setweight(to_tsvector('achei.app_search', body), 'B')
	) STORED,
	PRIMARY KEY (entity_type, entity_id)
);
--> statement-breakpoint
CREATE INDEX search_index_tsv_idx ON achei.search_index USING gin (tsv);
--> statement-breakpoint
CREATE INDEX search_index_companion_idx ON achei.search_index (companion_id, event_date);
--> statement-breakpoint
CREATE FUNCTION achei.search_index_put(
	p_type text, p_id text, p_companion text, p_date text, p_title text, p_body text
) RETURNS void LANGUAGE sql SET search_path = achei, pg_catalog AS $$
	INSERT INTO search_index (entity_type, entity_id, companion_id, event_date, title, body)
	VALUES (p_type, p_id, p_companion, p_date, COALESCE(p_title, ''), COALESCE(p_body, ''))
	ON CONFLICT (entity_type, entity_id) DO UPDATE SET
		companion_id = EXCLUDED.companion_id,
		event_date = EXCLUDED.event_date,
		title = EXCLUDED.title,
		body = EXCLUDED.body;
$$;
--> statement-breakpoint
-- UTC calendar date of a timestamp, as YYYY-MM-DD (same as SQLite's
-- date(x, 'unixepoch')).
CREATE FUNCTION achei.search_utc_date(ts timestamptz) RETURNS text LANGUAGE sql IMMUTABLE AS $$
	SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD');
$$;
--> statement-breakpoint
CREATE FUNCTION achei.search_journal_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'journal' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('journal', NEW.id, NEW.companion_id, NEW.date, '', NEW.body);
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_journal AFTER INSERT OR UPDATE OR DELETE ON achei.journal_entries
	FOR EACH ROW EXECUTE FUNCTION achei.search_journal_sync();
--> statement-breakpoint
CREATE FUNCTION achei.search_health_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'health' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('health', NEW.id, NEW.companion_id, search_utc_date(NEW.occurred_at), NEW.title, NEW.notes);
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_health AFTER INSERT OR UPDATE OR DELETE ON achei.health_events
	FOR EACH ROW EXECUTE FUNCTION achei.search_health_sync();
--> statement-breakpoint
CREATE FUNCTION achei.search_reminder_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'reminder' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('reminder', NEW.id, NEW.companion_id, search_utc_date(NEW.due_at), NEW.title, NEW.description);
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_reminder AFTER INSERT OR UPDATE OR DELETE ON achei.reminders
	FOR EACH ROW EXECUTE FUNCTION achei.search_reminder_sync();
--> statement-breakpoint
CREATE FUNCTION achei.search_document_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'document' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('document', NEW.id, NEW.companion_id,
		COALESCE(NEW.document_date, search_utc_date(NEW.created_at)), NEW.title, '');
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_document AFTER INSERT OR UPDATE OR DELETE ON achei.documents
	FOR EACH ROW EXECUTE FUNCTION achei.search_document_sync();
--> statement-breakpoint
CREATE FUNCTION achei.search_daily_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'daily' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('daily', NEW.id, NEW.companion_id, search_utc_date(NEW.logged_at), '', NEW.notes);
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_daily AFTER INSERT OR UPDATE OR DELETE ON achei.daily_events
	FOR EACH ROW EXECUTE FUNCTION achei.search_daily_sync();
--> statement-breakpoint
CREATE FUNCTION achei.search_weight_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'weight' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('weight', NEW.id, NEW.companion_id, search_utc_date(NEW.recorded_at), '', NEW.notes);
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_weight AFTER INSERT OR UPDATE OR DELETE ON achei.weight_entries
	FOR EACH ROW EXECUTE FUNCTION achei.search_weight_sync();
--> statement-breakpoint
-- Media notes take their companion and date from the parent journal entry.
CREATE FUNCTION achei.search_media_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = achei, pg_catalog AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		DELETE FROM search_index WHERE entity_type = 'media' AND entity_id = OLD.id;
		RETURN OLD;
	END IF;
	PERFORM search_index_put('media', NEW.id, je.companion_id, je.date, '', NEW.notes)
	FROM journal_entries je WHERE je.id = NEW.entry_id;
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_media AFTER INSERT OR UPDATE OR DELETE ON achei.journal_photos
	FOR EACH ROW EXECUTE FUNCTION achei.search_media_sync();
