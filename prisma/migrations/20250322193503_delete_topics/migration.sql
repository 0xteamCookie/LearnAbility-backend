/*
  Warnings:

  - You are about to drop the column `topicId` on the `DataSource` table. All the data in the column will be lost.
  - You are about to drop the column `topicId` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_topicId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_topicId_fkey";

-- DropForeignKey
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Topic" DROP CONSTRAINT "Topic_userId_fkey";

-- AlterTable
ALTER TABLE "DataSource" DROP COLUMN "topicId";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "topicId";

-- DropTable
DROP TABLE "Topic";
