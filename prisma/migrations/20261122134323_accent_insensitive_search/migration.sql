-- Accent- and case-insensitive search (change: accent-insensitive-search).
-- Folded copies of the searched columns, kept up to date by BEFORE INSERT OR
-- UPDATE triggers, so every write path (import, edit, merge, anonymization,
-- seed, manual SQL) stays searchable. The app never writes these columns; it
-- folds the typed text with the same lower(unaccent(...)) expression.
-- Backward compatible: only adds an extension, columns, functions and
-- triggers; code that does not know the columns keeps working.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- AlterTable
ALTER TABLE "applicant" ADD COLUMN     "hometown_search" TEXT,
ADD COLUMN     "search_text" TEXT;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "company_search" TEXT,
ADD COLUMN     "instructor_search" TEXT,
ADD COLUMN     "location_search" TEXT,
ADD COLUMN     "name_search" TEXT;

-- Name and e-mail joined by a newline: a search word (never whitespace)
-- cannot match across two fields.
CREATE FUNCTION "applicant_search_columns"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_text" := lower(public.unaccent(
    concat_ws(E'\n', NEW."first_name", NEW."last_name", NEW."email")
  ));
  NEW."hometown_search" := lower(public.unaccent(NEW."hometown"));
  RETURN NEW;
END;
$$;

CREATE TRIGGER "applicant_search_columns"
BEFORE INSERT OR UPDATE ON "applicant"
FOR EACH ROW EXECUTE FUNCTION "applicant_search_columns"();

CREATE FUNCTION "event_search_columns"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."name_search" := lower(public.unaccent(NEW."name"));
  NEW."location_search" := lower(public.unaccent(NEW."location"));
  NEW."company_search" := lower(public.unaccent(NEW."company_name"));
  NEW."instructor_search" := lower(public.unaccent(NEW."instructor"));
  RETURN NEW;
END;
$$;

CREATE TRIGGER "event_search_columns"
BEFORE INSERT OR UPDATE ON "event"
FOR EACH ROW EXECUTE FUNCTION "event_search_columns"();

-- Feedback keeps its single column; the trigger folds it in place.
CREATE FUNCTION "feedback_search_text"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_text" := lower(public.unaccent(NEW."search_text"));
  RETURN NEW;
END;
$$;

CREATE TRIGGER "feedback_search_text"
BEFORE INSERT OR UPDATE ON "feedback"
FOR EACH ROW EXECUTE FUNCTION "feedback_search_text"();

-- Backfill existing rows with the same expressions.
UPDATE "applicant" SET
  "search_text" = lower(public.unaccent(
    concat_ws(E'\n', "first_name", "last_name", "email")
  )),
  "hometown_search" = lower(public.unaccent("hometown"));

UPDATE "event" SET
  "name_search" = lower(public.unaccent("name")),
  "location_search" = lower(public.unaccent("location")),
  "company_search" = lower(public.unaccent("company_name")),
  "instructor_search" = lower(public.unaccent("instructor"));

UPDATE "feedback" SET "search_text" = lower(public.unaccent("search_text"));
