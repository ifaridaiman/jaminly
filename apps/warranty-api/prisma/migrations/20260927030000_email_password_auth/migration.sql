-- CreateEnum
CREATE TYPE "EmailCodePurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'DELETE_ACCOUNT');

-- DropForeignKey
ALTER TABLE "DeletionCode" DROP CONSTRAINT "DeletionCode_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "googleSub" DROP NOT NULL;

-- DropTable
DROP TABLE "DeletionCode";

-- CreateTable
CREATE TABLE "EmailCode" (
    "userId" TEXT NOT NULL,
    "purpose" "EmailCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("userId","purpose")
);

-- Existing users all signed in with Google, which only accepts verified emails.
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

-- Emails are stored lower-cased from now on. If two accounts share an email the unique index
-- below fails; resolve those by hand before deploying (none expected before launch).
UPDATE "User" SET "email" = lower("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

