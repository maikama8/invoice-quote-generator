import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { NIGERIA_VAT_BPS } from "../src/lib/constants";
import { addISODays, todayISO } from "../src/lib/dates";
import { computeTotals, lineAmountMinor, type Discount, type LineInput } from "../src/lib/money";
import { formatDocumentNumber } from "../src/lib/numbering";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

type SeedLine = LineInput & { description: string; productId: string | null };

const TERMS =
  "Payment is due on the date shown. Quote the document number on the transfer. Work pauses if a balance goes overdue.";

function money(lines: SeedLine[], discount: Discount) {
  const totals = computeTotals(lines, discount, NIGERIA_VAT_BPS);
  return {
    totals,
    discount,
    lines: lines.map((line, position) => ({
      position,
      productId: line.productId,
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitPriceMinor: BigInt(line.unitPriceMinor),
      taxable: line.taxable,
      amountMinor: BigInt(lineAmountMinor(line.quantityMilli, line.unitPriceMinor)),
    })),
  };
}

function discountData(discount: Discount) {
  if (discount.kind === "percent") {
    return { discountKind: "percent", discountBps: discount.basisPoints, discountMinor: BigInt(0) };
  }
  if (discount.kind === "amount") {
    return { discountKind: "amount", discountBps: 0, discountMinor: BigInt(discount.minor) };
  }
  return { discountKind: "none", discountBps: 0, discountMinor: BigInt(0) };
}

async function main() {
  const existing = await prisma.client.count();
  if (existing > 0) {
    console.log("Seed skipped: clients already exist.");
    return;
  }

  const today = todayISO("Africa/Lagos");
  const year = Number(today.slice(0, 4));
  const on = (days: number) => addISODays(today, days);

  await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      legalName: "Northline Studio Ltd",
      tradingName: "Northline Studio",
      email: "accounts@northline.studio",
      phone: "+234 1 700 4410",
      address: "12 Adeola Odeku Street\nVictoria Island, Lagos\nNigeria",
      website: "https://northline.studio",
      tin: "21883451-0001",
      defaultCurrency: "NGN",
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      invoicePrefix: "INV",
      quotePrefix: "QT",
      numberWidth: 4,
      paymentTermsDays: 14,
      footerNote: "Northline Studio designs brand, web, and print from Victoria Island, Lagos.",
      bankName: "GTBank",
      bankAccountName: "Northline Studio Ltd",
      bankAccountNumber: "0123456789",
      paymentProvider: "none",
    },
  });

  const adebayo = await prisma.client.create({
    data: {
      name: "Tunde Adebayo",
      company: "Adebayo & Sons Ltd",
      email: "procurement@adebayoandsons.ng",
      phone: "+234 803 000 1101",
      address: "14 Obafemi Awolowo Way",
      city: "Ikeja, Lagos",
      country: "Nigeria",
    },
  });
  const atlantic = await prisma.client.create({
    data: {
      name: "Finance office",
      company: "Atlantic Schools",
      email: "finance@atlanticschools.edu.ng",
      phone: "+234 1 460 2200",
      address: "8 Bishop Oluwole Street",
      city: "Victoria Island, Lagos",
      country: "Nigeria",
    },
  });
  const kano = await prisma.client.create({
    data: {
      name: "Hauwa Musa",
      company: "Kano Transit Co.",
      email: "ops@kanotransit.ng",
      phone: "+234 806 441 9088",
      address: "3 Bompai Road",
      city: "Kano",
      country: "Nigeria",
    },
  });
  const greenfield = await prisma.client.create({
    data: {
      name: "Seyi Adeyemi",
      company: "Greenfield Farms",
      email: "hello@greenfieldfarms.ng",
      phone: "+234 809 220 4411",
      address: "Km 8 Ibadan-Ife Road",
      city: "Ibadan",
      country: "Nigeria",
    },
  });
  const maya = await prisma.client.create({
    data: {
      name: "Maya Okonkwo",
      company: "",
      email: "maya@okonkwo.co",
      phone: "+234 701 555 0192",
      address: "22 Admiralty Way",
      city: "Lekki, Lagos",
      country: "Nigeria",
    },
  });

  const brand = await prisma.product.create({
    data: {
      sku: "BRAND-DAY",
      name: "Brand workshop",
      description: "One day in the studio, including a written direction.",
      unitPriceMinor: BigInt(45_000_000),
      currency: "NGN",
      unit: "day",
      taxable: true,
    },
  });
  const web = await prisma.product.create({
    data: {
      sku: "WEB-FIX",
      name: "Website design",
      description: "Fixed-scope marketing site, design and build.",
      unitPriceMinor: BigInt(120_000_000),
      currency: "NGN",
      unit: "project",
      taxable: true,
    },
  });
  const retain = await prisma.product.create({
    data: {
      sku: "RETAIN",
      name: "Monthly retainer",
      description: "Design and front-end time, one month.",
      unitPriceMinor: BigInt(35_000_000),
      currency: "NGN",
      unit: "month",
      taxable: true,
    },
  });
  const care = await prisma.product.create({
    data: {
      sku: "CARE",
      name: "Hosting and care",
      description: "Hosting, updates, and a monthly check.",
      unitPriceMinor: BigInt(4_500_000),
      currency: "NGN",
      unit: "month",
      taxable: true,
    },
  });
  const print = await prisma.product.create({
    data: {
      sku: "PRINT",
      name: "Print production",
      description: "Press check and production management.",
      unitPriceMinor: BigInt(8_500_000),
      currency: "NGN",
      unit: "job",
      taxable: true,
    },
  });
  const consult = await prisma.product.create({
    data: {
      sku: "CONSULT",
      name: "Consultation",
      description: "Working session, billed by the hour.",
      unitPriceMinor: BigInt(3_500_000),
      currency: "NGN",
      unit: "hour",
      taxable: true,
    },
  });
  const sprint = await prisma.product.create({
    data: {
      sku: "STRAT",
      name: "Strategy sprint",
      description: "Five-day sprint, priced in dollars.",
      unitPriceMinor: BigInt(250_000),
      currency: "USD",
      unit: "sprint",
      taxable: true,
    },
  });

  const quoteNumber = (sequence: number) => formatDocumentNumber("QT", year, sequence);
  const invoiceNumber = (sequence: number) => formatDocumentNumber("INV", year, sequence);

  const adebayoLines: SeedLine[] = [
    {
      description: "Brand workshop · day",
      productId: brand.id,
      quantityMilli: 1000,
      unitPriceMinor: 45_000_000,
      taxable: true,
    },
    {
      description: "Consultation · hour",
      productId: consult.id,
      quantityMilli: 2500,
      unitPriceMinor: 3_500_000,
      taxable: true,
    },
  ];
  const atlanticLines: SeedLine[] = [
    {
      description: "Website design · project",
      productId: web.id,
      quantityMilli: 1000,
      unitPriceMinor: 120_000_000,
      taxable: true,
    },
    {
      description: "Brand workshop · day",
      productId: brand.id,
      quantityMilli: 1000,
      unitPriceMinor: 45_000_000,
      taxable: true,
    },
  ];

  const q1 = money(adebayoLines, { kind: "none" });
  const quote1 = await prisma.quote.create({
    data: {
      number: quoteNumber(1),
      clientId: adebayo.id,
      status: "accepted",
      currency: "NGN",
      issueDate: on(-40),
      validUntil: on(-10),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Anniversary range: one workshop day and a follow-up session.",
      terms: TERMS,
      ...discountData(q1.discount),
      subtotalMinor: BigInt(q1.totals.subtotalMinor),
      discountTotalMinor: BigInt(q1.totals.discountMinor),
      taxMinor: BigInt(q1.totals.taxMinor),
      totalMinor: BigInt(q1.totals.totalMinor),
      lines: { create: q1.lines },
    },
  });

  const q2 = money(
    [
      {
        description: "Print production · job",
        productId: print.id,
        quantityMilli: 1000,
        unitPriceMinor: 8_500_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.quote.create({
    data: {
      number: quoteNumber(2),
      clientId: greenfield.id,
      status: "declined",
      currency: "NGN",
      issueDate: on(-50),
      validUntil: on(-20),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Catalogue print. Greenfield declined and later commissioned the job directly.",
      terms: TERMS,
      ...discountData(q2.discount),
      subtotalMinor: BigInt(q2.totals.subtotalMinor),
      discountTotalMinor: BigInt(q2.totals.discountMinor),
      taxMinor: BigInt(q2.totals.taxMinor),
      totalMinor: BigInt(q2.totals.totalMinor),
      lines: { create: q2.lines },
    },
  });

  const q3 = money(atlanticLines, { kind: "percent", basisPoints: 500 });
  const quote3 = await prisma.quote.create({
    data: {
      number: quoteNumber(3),
      clientId: atlantic.id,
      status: "accepted",
      currency: "NGN",
      issueDate: on(-12),
      validUntil: on(18),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Website and identity for the 2027 intake. Five percent courtesy discount.",
      terms: TERMS,
      ...discountData(q3.discount),
      subtotalMinor: BigInt(q3.totals.subtotalMinor),
      discountTotalMinor: BigInt(q3.totals.discountMinor),
      taxMinor: BigInt(q3.totals.taxMinor),
      totalMinor: BigInt(q3.totals.totalMinor),
      lines: { create: q3.lines },
    },
  });

  const q4 = money(
    [
      {
        description: "Monthly retainer · month",
        productId: retain.id,
        quantityMilli: 3000,
        unitPriceMinor: 35_000_000,
        taxable: true,
      },
    ],
    { kind: "percent", basisPoints: 1000 },
  );
  await prisma.quote.create({
    data: {
      number: quoteNumber(4),
      clientId: kano.id,
      status: "sent",
      currency: "NGN",
      issueDate: on(-2),
      validUntil: on(12),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Three-month retainer, with ten percent off for paying the quarter up front.",
      terms: TERMS,
      ...discountData(q4.discount),
      subtotalMinor: BigInt(q4.totals.subtotalMinor),
      discountTotalMinor: BigInt(q4.totals.discountMinor),
      taxMinor: BigInt(q4.totals.taxMinor),
      totalMinor: BigInt(q4.totals.totalMinor),
      lines: { create: q4.lines },
    },
  });

  const q5 = money(
    [
      {
        description: "Consultation · hour",
        productId: consult.id,
        quantityMilli: 6000,
        unitPriceMinor: 3_500_000,
        taxable: true,
      },
      {
        description: "Hosting and care · month",
        productId: care.id,
        quantityMilli: 1000,
        unitPriceMinor: 4_500_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.quote.create({
    data: {
      number: quoteNumber(5),
      clientId: atlantic.id,
      status: "draft",
      currency: "NGN",
      issueDate: today,
      validUntil: on(21),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Care plan and a short consulting block. Not sent yet.",
      terms: TERMS,
      ...discountData(q5.discount),
      subtotalMinor: BigInt(q5.totals.subtotalMinor),
      discountTotalMinor: BigInt(q5.totals.discountMinor),
      taxMinor: BigInt(q5.totals.taxMinor),
      totalMinor: BigInt(q5.totals.totalMinor),
      lines: { create: q5.lines },
    },
  });

  const q6 = money(
    [
      {
        description: "Strategy sprint · sprint",
        productId: sprint.id,
        quantityMilli: 1000,
        unitPriceMinor: 250_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.quote.create({
    data: {
      number: quoteNumber(6),
      clientId: maya.id,
      status: "sent",
      currency: "USD",
      issueDate: on(-3),
      validUntil: on(11),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Follow-up sprint, priced in dollars. VAT is still the Nigerian rate.",
      terms: TERMS,
      ...discountData(q6.discount),
      subtotalMinor: BigInt(q6.totals.subtotalMinor),
      discountTotalMinor: BigInt(q6.totals.discountMinor),
      taxMinor: BigInt(q6.totals.taxMinor),
      totalMinor: BigInt(q6.totals.totalMinor),
      lines: { create: q6.lines },
    },
  });

  const q7 = money(
    [
      {
        description: "Hosting and care · month",
        productId: care.id,
        quantityMilli: 6000,
        unitPriceMinor: 4_500_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.quote.create({
    data: {
      number: quoteNumber(7),
      clientId: kano.id,
      status: "sent",
      currency: "NGN",
      issueDate: on(-30),
      validUntil: on(-4),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Six months of care. The quote lapsed before Kano replied.",
      terms: TERMS,
      ...discountData(q7.discount),
      subtotalMinor: BigInt(q7.totals.subtotalMinor),
      discountTotalMinor: BigInt(q7.totals.discountMinor),
      taxMinor: BigInt(q7.totals.taxMinor),
      totalMinor: BigInt(q7.totals.totalMinor),
      lines: { create: q7.lines },
    },
  });

  await prisma.invoice.create({
    data: {
      number: invoiceNumber(1),
      clientId: adebayo.id,
      quoteId: quote1.id,
      status: "paid",
      currency: "NGN",
      issueDate: on(-40),
      dueDate: on(-26),
      paidAt: on(-20),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: quote1.notes,
      terms: TERMS,
      ...discountData(q1.discount),
      subtotalMinor: BigInt(q1.totals.subtotalMinor),
      discountTotalMinor: BigInt(q1.totals.discountMinor),
      taxMinor: BigInt(q1.totals.taxMinor),
      totalMinor: BigInt(q1.totals.totalMinor),
      lines: { create: q1.lines.map((line) => ({ ...line })) },
    },
  });
  await prisma.quote.update({ where: { id: quote1.id }, data: { status: "converted" } });

  const printJob = money(
    [
      {
        description: "Print production · job",
        productId: print.id,
        quantityMilli: 1000,
        unitPriceMinor: 8_500_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.invoice.create({
    data: {
      number: invoiceNumber(2),
      clientId: greenfield.id,
      status: "overdue",
      currency: "NGN",
      issueDate: on(-45),
      dueDate: on(-31),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Exhibition catalogue. Payment was due last month.",
      terms: TERMS,
      ...discountData(printJob.discount),
      subtotalMinor: BigInt(printJob.totals.subtotalMinor),
      discountTotalMinor: BigInt(printJob.totals.discountMinor),
      taxMinor: BigInt(printJob.totals.taxMinor),
      totalMinor: BigInt(printJob.totals.totalMinor),
      lines: { create: printJob.lines },
    },
  });

  await prisma.invoice.create({
    data: {
      number: invoiceNumber(3),
      clientId: atlantic.id,
      quoteId: quote3.id,
      status: "sent",
      currency: "NGN",
      issueDate: on(-6),
      dueDate: on(8),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Website and identity for the 2027 intake. Five percent courtesy discount.",
      terms: TERMS,
      ...discountData(q3.discount),
      subtotalMinor: BigInt(q3.totals.subtotalMinor),
      discountTotalMinor: BigInt(q3.totals.discountMinor),
      taxMinor: BigInt(q3.totals.taxMinor),
      totalMinor: BigInt(q3.totals.totalMinor),
      lines: { create: q3.lines.map((line) => ({ ...line })) },
    },
  });
  await prisma.quote.update({ where: { id: quote3.id }, data: { status: "converted" } });

  const kanoDraft = money(
    [
      {
        description: "Monthly retainer · month",
        productId: retain.id,
        quantityMilli: 1000,
        unitPriceMinor: 35_000_000,
        taxable: true,
      },
      {
        description: "Consultation · hour",
        productId: consult.id,
        quantityMilli: 4000,
        unitPriceMinor: 3_500_000,
        taxable: true,
      },
    ],
    { kind: "none" },
  );
  await prisma.invoice.create({
    data: {
      number: invoiceNumber(4),
      clientId: kano.id,
      status: "draft",
      currency: "NGN",
      issueDate: today,
      dueDate: on(14),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "November retainer and a site visit. Still a draft.",
      terms: TERMS,
      ...discountData(kanoDraft.discount),
      subtotalMinor: BigInt(kanoDraft.totals.subtotalMinor),
      discountTotalMinor: BigInt(kanoDraft.totals.discountMinor),
      taxMinor: BigInt(kanoDraft.totals.taxMinor),
      totalMinor: BigInt(kanoDraft.totals.totalMinor),
      lines: { create: kanoDraft.lines },
    },
  });

  await prisma.invoice.create({
    data: {
      number: invoiceNumber(5),
      clientId: maya.id,
      status: "paid",
      currency: "USD",
      issueDate: on(-18),
      dueDate: on(-4),
      paidAt: on(-5),
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      notes: "Strategy sprint delivered in October and paid in dollars.",
      terms: TERMS,
      ...discountData(q6.discount),
      subtotalMinor: BigInt(q6.totals.subtotalMinor),
      discountTotalMinor: BigInt(q6.totals.discountMinor),
      taxMinor: BigInt(q6.totals.taxMinor),
      totalMinor: BigInt(q6.totals.totalMinor),
      lines: { create: q6.lines.map((line) => ({ ...line })) },
    },
  });

  console.log(`Seeded Northline Studio on ${today}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
