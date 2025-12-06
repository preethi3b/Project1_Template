import * as XLSX from "xlsx";

export const generateXLSX = (rows, sumAmount) => {
  const worksheetData = rows.map((r) => ({
    "Invoice No": r.invoiceNo,
    Name: r.customerName,
    Mobile: r.mobileNumber,
    Amount: r.amount,
    Discount: r.discount,
    Received: r.total,
    Date: r.cre_date,
  }));

  worksheetData.push({
    "Invoice No": "",
    Name: "",
    Mobile: "",
    Amount: "Total: " + sumAmount,
    Discount: "",
    Received: "",
    Date: "",
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  XLSX.writeFile(workbook, "Invoice_Report.xlsx");
};
