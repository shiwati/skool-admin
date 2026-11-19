-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('applied', 'accepted', 'rejected', 'attended', 'waitlisted');

-- CreateTable
CREATE TABLE "applicant" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_year" INTEGER,
    "school_name" TEXT,
    "hometown" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "parent_first_name" TEXT,
    "parent_last_name" TEXT,
    "parent_mothers_name" TEXT,
    "parent_address" TEXT,
    "parent_email" TEXT,
    "parent_phone" TEXT,
    "newsletter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "event_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "food_preference" TEXT,
    "heard_from_where" TEXT,
    "heard_from_whom" TEXT,
    "solved_problem" TEXT,
    "past_exp_in_prog" TEXT,
    "past_participation_other" TEXT,
    "past_participation_skool" BOOLEAN NOT NULL DEFAULT false,
    "past_participation_skool_desc" TEXT,
    "comment" TEXT,
    "company_awareness" BOOLEAN NOT NULL DEFAULT false,
    "status" "application_status" NOT NULL DEFAULT 'applied',

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "company_name" TEXT,
    "location" TEXT,
    "desc" TEXT,
    "sheet_url" TEXT,
    "age_range" TEXT,
    "instructor" TEXT,
    "mentors" TEXT[],
    "capacity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "record_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applicant_email_idx" ON "applicant"("email");

-- CreateIndex
CREATE INDEX "application_applicant_id_idx" ON "application"("applicant_id");

-- CreateIndex
CREATE INDEX "application_event_id_status_idx" ON "application"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "application_event_id_applicant_id_key" ON "application"("event_id", "applicant_id");

-- CreateIndex
CREATE INDEX "history_table_name_record_id_idx" ON "history"("table_name", "record_id");

-- AddForeignKey
ALTER TABLE "applicant" ADD CONSTRAINT "applicant_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
