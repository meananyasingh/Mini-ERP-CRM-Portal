const PDFDocument = require('pdfkit');

// Streams an invoice-style PDF for a challan directly to the HTTP response.
// `challan` must be loaded with its `items` association so line items and
// snapshot data are available (challan detail is always rendered from the
// stored snapshot, never from live product data — see CONTRACT.md rule 5).
function streamChallanPdf(challan, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${challan.challanNumber}.pdf"`);
  doc.pipe(res);

  const customer = challan.customerSnapshot || {};
  const items = challan.items || [];

  doc.fontSize(20).text('DELIVERY CHALLAN', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11);
  doc.text(`Challan No: ${challan.challanNumber}`);
  doc.text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`);
  doc.text(`Status: ${challan.status}`);
  doc.moveDown();

  doc.fontSize(13).text('Customer', { underline: true });
  doc.fontSize(11);
  doc.text(`Name: ${customer.name || '-'}`);
  if (customer.businessName) doc.text(`Business: ${customer.businessName}`);
  doc.text(`Mobile: ${customer.mobile || '-'}`);
  if (customer.address) doc.text(`Address: ${customer.address}`);
  doc.moveDown();

  const columns = { sku: 50, name: 150, qty: 330, price: 400, total: 475 };
  const drawRow = (y, sku, name, qty, price, total) => {
    doc.text(sku, columns.sku, y, { width: 95 });
    doc.text(name, columns.name, y, { width: 175 });
    doc.text(qty, columns.qty, y, { width: 60, align: 'right' });
    doc.text(price, columns.price, y, { width: 70, align: 'right' });
    doc.text(total, columns.total, y, { width: 70, align: 'right' });
  };

  doc.fontSize(13).text('Items', { underline: true });
  doc.moveDown(0.5);

  let y = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  drawRow(y, 'SKU', 'Product', 'Qty', 'Unit Price', 'Line Total');
  doc.font('Helvetica');
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 6;

  items.forEach((item) => {
    const snapshot = item.productSnapshot || {};
    drawRow(
      y,
      snapshot.sku || '-',
      snapshot.name || '-',
      String(item.quantity),
      Number(snapshot.unitPrice).toFixed(2),
      Number(item.lineTotal).toFixed(2)
    );
    y += 18;
  });

  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 10;

  const grandTotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text(`Total Quantity: ${challan.totalQuantity}`, columns.sku, y);
  doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, columns.price, y, { width: 145, align: 'right' });
  doc.font('Helvetica');

  doc.end();
}

module.exports = streamChallanPdf;
