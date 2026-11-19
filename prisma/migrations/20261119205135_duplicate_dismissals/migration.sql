-- CreateTable
CREATE TABLE "duplicate_dismissal" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "applicant_a_id" TEXT NOT NULL,
    "applicant_b_id" TEXT NOT NULL,

    CONSTRAINT "duplicate_dismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "duplicate_dismissal_applicant_b_id_idx" ON "duplicate_dismissal"("applicant_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_dismissal_applicant_a_id_applicant_b_id_key" ON "duplicate_dismissal"("applicant_a_id", "applicant_b_id");

-- AddForeignKey
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_applicant_a_id_fkey" FOREIGN KEY ("applicant_a_id") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_applicant_b_id_fkey" FOREIGN KEY ("applicant_b_id") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
