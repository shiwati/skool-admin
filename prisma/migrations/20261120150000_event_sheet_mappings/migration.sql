-- AlterTable
ALTER TABLE "event" ADD COLUMN     "application_sheet_mapping" JSONB,
ADD COLUMN     "mentor_feedback_sheet_mapping" JSONB,
ADD COLUMN     "participant_feedback_sheet_mapping" JSONB;
