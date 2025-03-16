/*
  Warnings:

  - You are about to drop the column `subject` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the `Material` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaterialTag` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `name` on table `DataSource` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "DataSourceStatus" ADD VALUE 'READY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DataSourceType" ADD VALUE 'PDF';
ALTER TYPE "DataSourceType" ADD VALUE 'IMAGE';
ALTER TYPE "DataSourceType" ADD VALUE 'VIDEO';
ALTER TYPE "DataSourceType" ADD VALUE 'AUDIO';
ALTER TYPE "DataSourceType" ADD VALUE 'YOUTUBE';

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_topicId_fkey";

-- DropForeignKey
ALTER TABLE "Material" DROP CONSTRAINT "Material_userId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialTag" DROP CONSTRAINT "MaterialTag_materialId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialTag" DROP CONSTRAINT "MaterialTag_tagId_fkey";

-- AlterTable
ALTER TABLE "DataSource" DROP COLUMN "subject",
DROP COLUMN "tags",
DROP COLUMN "topic",
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "Material";

-- DropTable
DROP TABLE "MaterialTag";

-- CreateTable
CREATE TABLE "DataSourceTag" (
    "dataSourceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "DataSourceTag_pkey" PRIMARY KEY ("dataSourceId","tagId")
);

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSourceTag" ADD CONSTRAINT "DataSourceTag_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSourceTag" ADD CONSTRAINT "DataSourceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
