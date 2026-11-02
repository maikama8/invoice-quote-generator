-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "tin" TEXT NOT NULL DEFAULT '',
    "logoDataUrl" TEXT NOT NULL DEFAULT '',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "taxName" TEXT NOT NULL DEFAULT 'VAT',
    "taxRateBps" INTEGER NOT NULL DEFAULT 750,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "quotePrefix" TEXT NOT NULL DEFAULT 'QT',
    "numberWidth" INTEGER NOT NULL DEFAULT 4,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "footerNote" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccountName" TEXT NOT NULL DEFAULT '',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '',
    "paymentProvider" TEXT NOT NULL DEFAULT 'none',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unitPriceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'item',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "validUntil" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "discountKind" TEXT NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "subtotalMinor" BIGINT NOT NULL,
    "discountTotalMinor" BIGINT NOT NULL,
    "taxMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "taxable" BOOLEAN NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "paidAt" TEXT,
    "taxName" TEXT NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "discountKind" TEXT NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "subtotalMinor" BIGINT NOT NULL,
    "discountTotalMinor" BIGINT NOT NULL,
    "taxMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "taxable" BOOLEAN NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_quoteId_key" ON "Invoice"("quoteId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
