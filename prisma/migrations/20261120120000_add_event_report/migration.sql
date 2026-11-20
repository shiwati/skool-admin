-- CreateTable
CREATE TABLE "event_report" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "event_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "event_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_report_document" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "event_id" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "doc_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "event_report_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_report_event_id_key" ON "event_report"("event_id");

-- CreateIndex
CREATE INDEX "event_report_document_event_id_created_at_idx" ON "event_report_document"("event_id", "created_at");

-- AddForeignKey
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_report_document" ADD CONSTRAINT "event_report_document_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_report_document" ADD CONSTRAINT "event_report_document_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
