import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatDisplayDate, formatMinorCode, formatRate } from "@/lib/format";
import { formatQuantity } from "@/lib/money";
import { clientContact, clientTitle, type BusinessProfile, type CommercialDocument } from "@/lib/views";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1814",
    backgroundColor: "#ffffff",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  muted: {
    color: "#5e574c",
    marginTop: 2,
    lineHeight: 1.4,
  },
  kind: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#5e574c",
    textAlign: "right",
  },
  number: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    textAlign: "right",
    marginTop: 4,
  },
  rule: {
    marginTop: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1814",
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  blockTitle: {
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#5e574c",
    marginBottom: 4,
  },
  strong: {
    fontFamily: "Helvetica-Bold",
  },
  table: {
    marginTop: 22,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#16140f",
    color: "#f3efe6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e4dccb",
  },
  desc: { width: "40%" },
  qty: { width: "12%", textAlign: "right" },
  price: { width: "24%", textAlign: "right" },
  amount: { width: "24%", textAlign: "right" },
  totals: {
    marginTop: 12,
    marginLeft: "auto",
    width: 230,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#1a1814",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  notes: {
    marginTop: 28,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#e4dccb",
    paddingTop: 8,
    color: "#5e574c",
    fontSize: 8,
    lineHeight: 1.4,
  },
  logo: {
    width: 72,
    height: 36,
    objectFit: "contain",
    marginBottom: 6,
  },
  disclaimer: {
    marginTop: 8,
    color: "#8c2f2b",
  },
});

function linesOf(value: string) {
  return value.split("\n").filter((line) => line.trim().length > 0);
}

export function DocumentPdf({
  business,
  document,
  paymentUrl,
  paymentDisclaimer,
}: {
  business: BusinessProfile;
  document: CommercialDocument;
  paymentUrl?: string;
  paymentDisclaimer?: string;
}) {
  const discountLabel =
    document.discount.kind === "percent"
      ? `Discount (${formatRate(document.discount.basisPoints)})`
      : "Discount";
  const logoOk =
    document.kind &&
    (business.logoDataUrl.startsWith("data:image/png") ||
      business.logoDataUrl.startsWith("data:image/jpeg"));

  return (
    <Document title={`${document.kind === "invoice" ? "Invoice" : "Quote"} ${document.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View>
            {logoOk ? (
              // react-pdf Image has no alt prop. The trading name is the text beside it.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={business.logoDataUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.name}>{business.tradingName}</Text>
            <Text style={styles.muted}>{business.legalName}</Text>
            {linesOf(business.address).map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
            {business.email ? <Text style={styles.muted}>{business.email}</Text> : null}
            {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
            {business.tin ? <Text style={styles.muted}>TIN {business.tin}</Text> : null}
          </View>
          <View>
            <Text style={styles.kind}>{document.kind}</Text>
            <Text style={styles.number}>{document.number}</Text>
            <Text style={styles.muted}>{document.status}</Text>
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.meta}>
          <View>
            <Text style={styles.blockTitle}>Bill to</Text>
            <Text style={styles.strong}>{clientTitle(document.client)}</Text>
            {clientContact(document.client) ? (
              <Text style={styles.muted}>{clientContact(document.client)}</Text>
            ) : null}
            {document.client.address ? <Text style={styles.muted}>{document.client.address}</Text> : null}
            {document.client.city ? (
              <Text style={styles.muted}>
                {document.client.city}
                {document.client.country ? `, ${document.client.country}` : ""}
              </Text>
            ) : null}
            {document.client.email ? <Text style={styles.muted}>{document.client.email}</Text> : null}
          </View>
          <View>
            <Text style={styles.blockTitle}>Dates</Text>
            <Text>Issued {formatDisplayDate(document.issueDate)}</Text>
            <Text>
              {document.endLabel} {formatDisplayDate(document.endDate)}
            </Text>
            {document.paidAt ? <Text>Paid {formatDisplayDate(document.paidAt)}</Text> : null}
            <Text style={styles.muted}>Currency {document.currency}</Text>
          </View>
        </View>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.desc}>Description</Text>
            <Text style={styles.qty}>Qty</Text>
            <Text style={styles.price}>Price</Text>
            <Text style={styles.amount}>Amount</Text>
          </View>
          {document.lines.map((line) => (
            <View key={`${line.description}-${line.amountMinor}`} style={styles.row}>
              <Text style={styles.desc}>
                {line.description}
                {line.taxable ? "" : " (exempt)"}
              </Text>
              <Text style={styles.qty}>{formatQuantity(line.quantityMilli)}</Text>
              <Text style={styles.price}>{formatMinorCode(line.unitPriceMinor, document.currency)}</Text>
              <Text style={styles.amount}>{formatMinorCode(line.amountMinor, document.currency)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatMinorCode(document.totals.subtotalMinor, document.currency)}</Text>
          </View>
          {document.totals.discountMinor > 0 ? (
            <View style={styles.totalRow}>
              <Text>{discountLabel}</Text>
              <Text>{`− ${formatMinorCode(document.totals.discountMinor, document.currency)}`}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text>
              {document.taxName} ({formatRate(document.taxRateBps)})
            </Text>
            <Text>{formatMinorCode(document.totals.taxMinor, document.currency)}</Text>
          </View>
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>{formatMinorCode(document.totals.totalMinor, document.currency)}</Text>
          </View>
        </View>
        {document.notes ? (
          <View style={styles.notes}>
            <Text style={styles.blockTitle}>Notes</Text>
            <Text>{document.notes}</Text>
          </View>
        ) : null}
        {document.terms ? (
          <View style={styles.notes}>
            <Text style={styles.blockTitle}>Terms</Text>
            <Text>{document.terms}</Text>
          </View>
        ) : null}
        {business.bankName ? (
          <View style={styles.notes}>
            <Text style={styles.blockTitle}>Payment</Text>
            <Text>
              {business.bankName}
              {business.bankAccountName ? ` · ${business.bankAccountName}` : ""}
              {business.bankAccountNumber ? ` · ${business.bankAccountNumber}` : ""}
            </Text>
            {paymentUrl ? <Text style={{ marginTop: 4 }}>{paymentUrl}</Text> : null}
            {paymentDisclaimer ? <Text style={styles.disclaimer}>{paymentDisclaimer}</Text> : null}
          </View>
        ) : null}
        <Text style={styles.footer}>
          {business.footerNote || business.tradingName}
          {business.website ? ` · ${business.website}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export function renderCommercialPdf(input: {
  business: BusinessProfile;
  document: CommercialDocument;
  paymentUrl?: string;
  paymentDisclaimer?: string;
}): Promise<Buffer> {
  return renderToBuffer(<DocumentPdf {...input} />);
}
