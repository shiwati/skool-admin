-- DropIndex
DROP INDEX "application_event_id_applicant_id_key";

-- AlterTable
ALTER TABLE "applicant" ADD COLUMN     "duplicate_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duplicate_key" TEXT;

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "source_key" TEXT;

-- CreateIndex
CREATE INDEX "applicant_duplicate_key_idx" ON "applicant"("duplicate_key");

-- CreateIndex
CREATE INDEX "application_event_id_applicant_id_idx" ON "application"("event_id", "applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_event_id_source_key_key" ON "application"("event_id", "source_key");

