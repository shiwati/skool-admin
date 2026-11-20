-- Rename the event's sheet URL columns (data is kept) and add the mentor feedback sheet.
ALTER TABLE "event" RENAME COLUMN "sheet_url" TO "application_sheet_url";
ALTER TABLE "event" RENAME COLUMN "feedback_sheet_url" TO "participant_feedback_sheet_url";
ALTER TABLE "event" ADD COLUMN "mentor_feedback_sheet_url" TEXT;

-- Keep existing change history readable under the new field names.
UPDATE "history" SET "field_name" = 'applicationSheetUrl'
WHERE "table_name" = 'event' AND "field_name" = 'sheetUrl';
UPDATE "history" SET "field_name" = 'participantFeedbackSheetUrl'
WHERE "table_name" = 'event' AND "field_name" = 'feedbackSheetUrl';

-- CreateEnum
CREATE TYPE "feedback_role" AS ENUM ('participant', 'mentor');

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "role" "feedback_role" NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "answers" JSONB NOT NULL,
    "overall_score" DOUBLE PRECISION,
    "recommend" TEXT,
    "search_text" TEXT NOT NULL DEFAULT '',
    "source_key" TEXT NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_event_id_role_idx" ON "feedback"("event_id", "role");

-- CreateIndex
CREATE INDEX "feedback_submitted_at_idx" ON "feedback"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_event_id_role_source_key_key" ON "feedback"("event_id", "role", "source_key");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
