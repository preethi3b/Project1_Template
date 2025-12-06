import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDF = async (rows, sumAmount) => {
  const doc = new jsPDF("p", "pt");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ----------- Sanitizers -----------
  const cleanText = (val) => {
    if (!val) return "-";
    return String(val)
      .replace(/[^\dA-Za-z\s.-]/g, "")
      .trim();
  };

  const cleanNumber = (val) => {
    if (!val) return 0;

    return Number(
      String(val)
        .replace(/[^\d.-]/g, "") // remove weird chars like & N a etc.
        .replace(/\.{2,}/g, ".") // fix double dots
        .replace(/-{2,}/g, "-") // fix double minus
    );
  };

  const formatMoney = (val) => {
    const num = cleanNumber(val);

    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const rowsClean = rows.map((r) => [
    cleanText(r.invoiceNo),
    cleanText(r.customerName),
    cleanText(r.mobileNumber),
    formatMoney(r.amount),
    formatMoney(r.discount),
    formatMoney(r.total),
    new Date(r.cre_date).toLocaleDateString(),
  ]);

  // ----------- HEADER BOX -----------
  doc.setFillColor(98, 89, 240);
  doc.rect(0, 0, pageWidth, 110, "F");

  // Logo
  const logo = "/logo.png"; // keep logo in public/
  doc.addImage(logo, "PNG", 40, 20, 80, 60);

  // Company details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#ffffff");
  doc.text("Muthu Mobiles Pvt Ltd", pageWidth - 40, 40, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("GSTIN: 33ABCDE1234F1Z5", pageWidth - 40, 58, { align: "right" });
  doc.text("Branch: Thanjavur, Tamil Nadu - 613001", pageWidth - 40, 72, {
    align: "right",
  });

  // Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#000");
  doc.text("Invoice Summary Report", 40, 150);

  // Generated Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 170);

  // ----------- MAIN TABLE -----------
  autoTable(doc, {
    startY: 190,
    head: [["Invoice No", "Customer", "Mobile", "Amount", "Discount", "Received", "Date"]],
    body: rowsClean,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
    },
    headStyles: {
      fillColor: [98, 89, 240],
      textColor: "#fff",
      halign: "center",
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      // ----------- WATERMARK -----------
      doc.setTextColor(230);
      doc.setFontSize(50);
      doc.text("MUTHU MOBILES", pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 30,
      });
      doc.setTextColor("#000");

      // ----------- PAGE FOOTER -----------
      doc.setFontSize(10);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 20, { align: "center" });
    },
  });

  // ----------- TOTAL ROW (Colored) -----------
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    body: [
      [
        "",
        "",
        "",
        "",
        { content: "GRAND TOTAL:", styles: { fontStyle: "bold", halign: "right" } },
        { content: formatMoney(sumAmount), styles: { fontStyle: "bold", textColor: "#ffffff", fillColor: "#625DF0" } },
        "",
      ],
    ],
    theme: "plain",
    margin: { left: 40, right: 40 },
    styles: { fontSize: 14, font: "helvetica" },
  });

  // SAVE
  doc.save("Invoice_Report.pdf");
};
