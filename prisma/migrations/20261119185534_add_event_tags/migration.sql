-- AlterTable
ALTER TABLE "event" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
