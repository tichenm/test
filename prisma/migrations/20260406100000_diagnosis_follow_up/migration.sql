ALTER TABLE "DiagnosisRecord"
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN "ownerName" TEXT,
ADD COLUMN "reviewNote" TEXT;
