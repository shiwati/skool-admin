-- AlterTable
ALTER TABLE "applicant" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateIndex
CREATE INDEX "applicant_deleted_at_idx" ON "applicant"("deleted_at");

-- AddForeignKey
ALTER TABLE "applicant" ADD CONSTRAINT "applicant_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
