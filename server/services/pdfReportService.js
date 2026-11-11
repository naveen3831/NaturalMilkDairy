const PDFDocument = require('pdfkit');

/**
 * Natural Milk Dairy - Professional PDF Report Service
 * Produces clean, publication-grade executive statements and reports for:
 * 1. Customers (Weekly / Monthly / Entire History)
 * 2. Delivery Partners (Route Deliveries & Cash Collection Statements)
 * 3. Dairy Administrators (Consolidated Business & Financial Reports)
 */

// Helper to format currency safely using "Rs. " for standard PDF fonts
const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Helper to format dates cleanly
const formatDateStr = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).slice(0, 10);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dateVal);
  }
};

// Draw common header banner
const drawHeader = (doc, title, subtitle, periodLabel) => {
  // Top green brand bar
  doc.rect(0, 0, doc.page.width, 10).fill('#0d5c3a');
  doc.rect(0, 10, doc.page.width, 3).fill('#f59e0b');

  doc.y = 28;

  // Dairy Title & Branding
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#0d5c3a').text('NATURAL MILK DAIRY', 40, doc.y);
  doc.fontSize(8.5).font('Helvetica').fillColor('#555555').text('100% Pure Organic Farm Milk • Chilled to 4°C • Doorstep Daily Delivery', 40, doc.y + 2);
  doc.fontSize(8).fillColor('#64748b').text('Helpline: +91 97018 78789  |  Email: contact@naturalmilkdairy.com  |  Hyderabad, Telangana', 40, doc.y + 2);

  // Date Generated on Top Right
  const generatedText = `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(generatedText, 350, 32, { align: 'right', width: 210 });

  // Divider line
  doc.y += 10;
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Report Title Box
  doc.y += 12;
  const bannerY = doc.y;
  doc.roundedRect(40, bannerY, doc.page.width - 80, 42, 6).fillAndStroke('#f0fdf4', '#bbf7d0');

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#065f46').text(title.toUpperCase(), 52, bannerY + 8);
  doc.fontSize(8.5).font('Helvetica').fillColor('#047857').text(`${subtitle}  |  Period: ${periodLabel}`, 52, bannerY + 25);

  doc.y = bannerY + 54;
};

// Draw footer on all pages
const addFooterAndPageNumbers = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - 30;

    doc.moveTo(40, bottomY - 6).lineTo(doc.page.width - 40, bottomY - 6).strokeColor('#e2e8f0').lineWidth(0.75).stroke();

    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      'Natural Milk Dairy Management Portal • Confidential Document',
      40,
      bottomY,
      { align: 'left', width: 300 }
    );

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text(
      `Page ${i + 1} of ${range.count}`,
      doc.page.width - 140,
      bottomY,
      { align: 'right', width: 100 }
    );
  }
};

/**
 * Generate Customer PDF Report
 */
const generateCustomerPdfReport = async ({ customer, deliveries = [], payments = [], periodLabel, res }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(res);

  drawHeader(
    doc,
    'Customer Statement & Delivery History',
    `Account Holder: ${customer.name} (${customer.customerId || 'ID'})`,
    periodLabel
  );

  // Customer Information Card
  const profileY = doc.y;
  doc.roundedRect(40, profileY, doc.page.width - 80, 56, 6).fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
  doc.text('CUSTOMER NAME', 52, profileY + 8);
  doc.text('CUSTOMER ID', 200, profileY + 8);
  doc.text('MOBILE PHONE', 330, profileY + 8);
  doc.text('DELIVERY AREA', 450, profileY + 8);

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(customer.name || '-', 52, profileY + 20, { width: 140, ellipsis: true });
  doc.text(customer.customerId || '-', 200, profileY + 20);
  doc.text(customer.mobile ? `+91 ${customer.mobile}` : '-', 330, profileY + 20);
  doc.text(customer.area || 'Hyderabad', 450, profileY + 20, { width: 100, ellipsis: true });

  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
  doc.text(`Address: ${customer.address || 'Doorstep Delivery Address'}`, 52, profileY + 38, { width: 490, ellipsis: true });

  doc.y = profileY + 66;

  // Calculate Aggregates
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((d) => d.status === 'delivered').length;
  const totalMilkLitres = deliveries.filter((d) => d.status === 'delivered').reduce((s, d) => s + (d.actualMilk || d.plannedMilk || 0), 0);
  const totalCurdKg = deliveries.filter((d) => d.status === 'delivered').reduce((s, d) => s + (d.actualCurd || d.plannedCurd || 0), 0) / 1000;
  const totalBilled = deliveries.filter((d) => d.status === 'delivered').reduce((s, d) => s + (d.totalAmount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const currentBalance = customer.currentBalance || 0;

  // KPI Summary Grid (4 blocks)
  const kpiY = doc.y;
  const cardW = (doc.page.width - 80 - 15) / 4;
  const cardH = 46;

  const kpis = [
    { label: 'DELIVERIES COMPLETED', val: `${completedDeliveries} / ${totalDeliveries}`, sub: `${totalMilkLitres.toFixed(1)}L Milk • ${totalCurdKg.toFixed(1)}kg Curd`, color: '#0d5c3a', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'TOTAL BILLED', val: formatMoney(totalBilled), sub: `${completedDeliveries} deliveries`, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
    { label: 'PAYMENTS RECORDED', val: formatMoney(totalPaid), sub: `${payments.length} transactions`, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    {
      label: currentBalance > 0 ? 'PENDING OUTSTANDING' : 'ADVANCE BALANCE',
      val: formatMoney(Math.abs(currentBalance)),
      sub: currentBalance > 0 ? 'Payment Due' : (currentBalance < 0 ? 'Prepaid Credit' : 'All Cleared'),
      color: currentBalance > 0 ? '#b91c1c' : '#047857',
      bg: currentBalance > 0 ? '#fef2f2' : '#ecfdf5',
      border: currentBalance > 0 ? '#fecaca' : '#a7f3d0',
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 5);
    doc.roundedRect(x, kpiY, cardW, cardH, 5).fillAndStroke(kpi.bg, kpi.border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label, x + 7, kpiY + 6, { width: cardW - 14 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(kpi.color).text(kpi.val, x + 7, kpiY + 18, { width: cardW - 14 });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(kpi.sub, x + 7, kpiY + 33, { width: cardW - 14 });
  });

  doc.y = kpiY + cardH + 16;

  // Deliveries Table
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Itemized Deliveries Log', 40, doc.y);
  doc.y += 6;

  const colWidths = [70, 75, 75, 75, 75, 75, 70]; // 515 total
  const colX = [40, 110, 185, 260, 335, 410, 485];

  const drawDeliveryTableHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0f172a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DATE', colX[0] + 5, y + 6);
    doc.text('MILK QTY', colX[1], y + 6);
    doc.text('CURD QTY', colX[2], y + 6);
    doc.text('RATE', colX[3], y + 6);
    doc.text('AMOUNT', colX[4], y + 6);
    doc.text('METHOD', colX[5], y + 6);
    doc.text('STATUS', colX[6], y + 6);
    doc.y = y + 20;
  };

  drawDeliveryTableHeader();

  if (deliveries.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No deliveries recorded during this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    deliveries.forEach((d, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawDeliveryTableHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f8fafc');

      const milkStr = `${d.actualMilk !== undefined ? d.actualMilk : (d.plannedMilk || 0)} L`;
      const curdVal = d.actualCurd !== undefined ? d.actualCurd : (d.plannedCurd || 0);
      const curdStr = curdVal > 0 ? `${curdVal} g` : '-';
      const statusStr = (d.status || 'delivered').toUpperCase();
      const methodStr = (d.paymentMethod || 'credit').toUpperCase();

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.text(d.deliveryDate || '-', colX[0] + 5, rowY + 5);
      doc.text(milkStr, colX[1], rowY + 5);
      doc.text(curdStr, colX[2], rowY + 5);
      doc.text(`Rs. ${d.milkPrice || 60}/L`, colX[3], rowY + 5);
      doc.font('Helvetica-Bold').text(formatMoney(d.totalAmount || 0), colX[4], rowY + 5);
      doc.font('Helvetica').text(methodStr, colX[5], rowY + 5);

      if (d.status === 'delivered') {
        doc.fillColor('#059669').font('Helvetica-Bold').text('✓ DELIVERED', colX[6], rowY + 5);
      } else {
        doc.fillColor('#d97706').font('Helvetica-Bold').text(statusStr, colX[6], rowY + 5);
      }

      doc.y = rowY + 18;
    });
  }

  doc.y += 14;

  // Payments / Transactions Table
  if (doc.y > 680) {
    doc.addPage();
  }

  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Payments & Credit Settlements', 40, doc.y);
  doc.y += 6;

  const pColWidths = [85, 90, 140, 100, 100];
  const pColX = [40, 125, 215, 355, 455];

  const drawPaymentTableHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0d5c3a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DATE', pColX[0] + 5, y + 6);
    doc.text('AMOUNT PAID', pColX[1], y + 6);
    doc.text('PAYMENT MODE / REF', pColX[2], y + 6);
    doc.text('COLLECTED BY', pColX[3], y + 6);
    doc.text('STATUS', pColX[4], y + 6);
    doc.y = y + 20;
  };

  drawPaymentTableHeader();

  if (payments.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No payment entries recorded during this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    payments.forEach((p, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawPaymentTableHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f0fdf4');

      const modeRef = `${(p.paymentMethod || 'CASH').toUpperCase()}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`;
      const collector = p.collectedBy || 'Admin';

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.text(formatDateStr(p.paymentDate || p.createdAt), pColX[0] + 5, rowY + 5);
      doc.font('Helvetica-Bold').fillColor('#059669').text(formatMoney(p.amount || 0), pColX[1], rowY + 5);
      doc.font('Helvetica').fillColor('#334155').text(modeRef, pColX[2], rowY + 5, { width: 135, ellipsis: true });
      doc.text(collector, pColX[3], rowY + 5);
      doc.fillColor('#047857').font('Helvetica-Bold').text('✓ CREDITED', pColX[4], rowY + 5);

      doc.y = rowY + 18;
    });
  }

  // Final Balance Box
  doc.y += 16;
  if (doc.y > 720) doc.addPage();

  const balanceBoxY = doc.y;
  doc.roundedRect(40, balanceBoxY, doc.page.width - 80, 48, 6).fillAndStroke(
    currentBalance > 0 ? '#fff1f2' : '#ecfdf5',
    currentBalance > 0 ? '#fecdd3' : '#a7f3d0'
  );

  doc.fontSize(10).font('Helvetica-Bold').fillColor(currentBalance > 0 ? '#9f1239' : '#065f46')
    .text(currentBalance > 0 ? 'CURRENT LEDGER BALANCE: OUTSTANDING DUE' : 'CURRENT LEDGER BALANCE: ACCOUNT IN ADVANCE', 52, balanceBoxY + 10);

  doc.fontSize(14).font('Helvetica-Bold').fillColor(currentBalance > 0 ? '#be123c' : '#059669')
    .text(formatMoney(Math.abs(currentBalance)), 52, balanceBoxY + 26);

  doc.fontSize(8).font('Helvetica').fillColor('#64748b')
    .text(
      currentBalance > 0
        ? 'Please clear outstanding balance via UPI or cash to your daily delivery partner.'
        : 'Your account has prepaid advance credit applied to upcoming daily deliveries.',
      220,
      balanceBoxY + 28,
      { width: 310 }
    );

  addFooterAndPageNumbers(doc);
  doc.end();
};

/**
 * Generate Delivery Partner PDF Report
 */
const generatePartnerPdfReport = async ({ partner, deliveries = [], collections = [], handovers = [], periodLabel, res }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(res);

  drawHeader(
    doc,
    'Delivery Partner Route & Collections Report',
    `Partner: ${partner.name} (${partner.assignedArea || 'All Routes'})`,
    periodLabel
  );

  // Partner Profile Box
  const profileY = doc.y;
  doc.roundedRect(40, profileY, doc.page.width - 80, 52, 6).fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
  doc.text('PARTNER NAME', 52, profileY + 8);
  doc.text('PHONE NUMBER', 200, profileY + 8);
  doc.text('ASSIGNED ROUTE / AREA', 330, profileY + 8);
  doc.text('ONLINE SHIFT', 460, profileY + 8);

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(partner.name || 'Delivery Partner', 52, profileY + 20, { width: 140, ellipsis: true });
  doc.text(partner.mobile ? `+91 ${partner.mobile}` : '-', 200, profileY + 20);
  doc.text(partner.assignedArea || 'Madhapur Route', 330, profileY + 20, { width: 120, ellipsis: true });
  doc.fillColor(partner.isOnline ? '#059669' : '#64748b').text(partner.isOnline ? 'Online Active' : 'Off-Duty', 460, profileY + 20);

  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
  doc.text(`Vehicles & Route ID: ${partner.vehicleNumber || 'Standard Dairy Crate'}  |  Assigned Partner Code: ${partner.boyId || partner.mobile || '-'}`, 52, profileY + 36);

  doc.y = profileY + 62;

  // Partner Aggregates
  const totalStops = deliveries.length;
  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
  const missedCount = deliveries.filter((d) => d.status === 'not_delivered').length;
  const pendingCount = deliveries.filter((d) => d.status === 'pending').length;

  const totalMilkDelivered = deliveries.filter((d) => d.status === 'delivered').reduce((s, d) => s + (d.actualMilk || d.plannedMilk || 0), 0);
  const totalCurdDeliveredKg = deliveries.filter((d) => d.status === 'delivered').reduce((s, d) => s + (d.actualCurd || d.plannedCurd || 0), 0) / 1000;

  const cashCollected = collections.filter((c) => (c.paymentMethod || '').toLowerCase() === 'cash').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const upiCollected = collections.filter((c) => (c.paymentMethod || '').toLowerCase() === 'upi').reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalCollected = cashCollected + upiCollected;

  const handedOverCash = handovers.filter((h) => h.status === 'approved').reduce((s, h) => s + (Number(h.amount) || 0), 0);
  const pendingHandoverCash = handovers.filter((h) => h.status === 'pending').reduce((s, h) => s + (Number(h.amount) || 0), 0);
  const netCashInHand = Math.max(0, cashCollected - handedOverCash);

  // KPI Grid
  const kpiY = doc.y;
  const cardW = (doc.page.width - 80 - 15) / 4;
  const cardH = 46;

  const kpis = [
    { label: 'ROUTE STOPS COMPLETED', val: `${deliveredCount} / ${totalStops}`, sub: `${missedCount} missed • ${pendingCount} pending`, color: '#0d5c3a', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'MILK & CURD DISPATCHED', val: `${totalMilkDelivered.toFixed(1)}L Milk`, sub: `${totalCurdDeliveredKg.toFixed(1)}kg Thick Curd`, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
    { label: 'CASH COLLECTED', val: formatMoney(cashCollected), sub: `UPI: ${formatMoney(upiCollected)}`, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'CASH HANDED OVER', val: formatMoney(handedOverCash), sub: `Remaining in Hand: ${formatMoney(netCashInHand)}`, color: '#047857', bg: '#f0fdf4', border: '#bbf7d0' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 5);
    doc.roundedRect(x, kpiY, cardW, cardH, 5).fillAndStroke(kpi.bg, kpi.border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label, x + 7, kpiY + 6, { width: cardW - 14 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(kpi.color).text(kpi.val, x + 7, kpiY + 18, { width: cardW - 14 });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(kpi.sub, x + 7, kpiY + 33, { width: cardW - 14 });
  });

  doc.y = kpiY + cardH + 16;

  // Deliveries Table
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Route Stops & Delivery Completion Log', 40, doc.y);
  doc.y += 6;

  const colX = [40, 105, 230, 295, 350, 420, 485];

  const drawPartnerTableHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0f172a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DATE', colX[0] + 5, y + 6);
    doc.text('CUSTOMER NAME', colX[1], y + 6);
    doc.text('AREA / FLAT', colX[2], y + 6);
    doc.text('QTY', colX[3], y + 6);
    doc.text('AMOUNT', colX[4], y + 6);
    doc.text('PAYMENT', colX[5], y + 6);
    doc.text('STATUS', colX[6], y + 6);
    doc.y = y + 20;
  };

  drawPartnerTableHeader();

  if (deliveries.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No route delivery stops found for this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    deliveries.forEach((d, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawPartnerTableHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f8fafc');

      const milk = d.actualMilk !== undefined ? d.actualMilk : (d.plannedMilk || 0);
      const curd = d.actualCurd !== undefined ? d.actualCurd : (d.plannedCurd || 0);
      const qtyStr = `${milk}L${curd > 0 ? `+${curd}g` : ''}`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.text(d.deliveryDate || '-', colX[0] + 5, rowY + 5);
      doc.font('Helvetica-Bold').text(d.customerName || 'Customer', colX[1], rowY + 5, { width: 120, ellipsis: true });
      doc.font('Helvetica').text(d.customerAddress || d.customerArea || '-', colX[2], rowY + 5, { width: 60, ellipsis: true });
      doc.text(qtyStr, colX[3], rowY + 5);
      doc.text(formatMoney(d.totalAmount || 0), colX[4], rowY + 5);
      doc.text((d.paymentMethod || 'credit').toUpperCase(), colX[5], rowY + 5);

      if (d.status === 'delivered') {
        doc.fillColor('#059669').font('Helvetica-Bold').text('✓ DONE', colX[6], rowY + 5);
      } else if (d.status === 'not_delivered') {
        doc.fillColor('#be123c').font('Helvetica-Bold').text('✗ MISSED', colX[6], rowY + 5);
      } else {
        doc.fillColor('#d97706').font('Helvetica-Bold').text('PENDING', colX[6], rowY + 5);
      }

      doc.y = rowY + 18;
    });
  }

  doc.y += 14;

  // Cash Handover Log Table
  if (doc.y > 690) doc.addPage();

  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Cash Collections & Admin Handover Log', 40, doc.y);
  doc.y += 6;

  const hColX = [40, 130, 230, 350, 460];
  const drawHandoverHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0d5c3a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DATE & TIME', hColX[0] + 5, y + 6);
    doc.text('HANDOVER AMOUNT', hColX[1], y + 6);
    doc.text('VERIFIED BY ADMIN', hColX[2], y + 6);
    doc.text('NOTES / REFERENCE', hColX[3], y + 6);
    doc.text('STATUS', hColX[4], y + 6);
    doc.y = y + 20;
  };

  drawHandoverHeader();

  if (handovers.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No physical cash handovers recorded for this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    handovers.forEach((h, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawHandoverHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f0fdf4');

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.text(formatDateStr(h.createdAt || h.date), hColX[0] + 5, rowY + 5);
      doc.font('Helvetica-Bold').fillColor('#059669').text(formatMoney(h.amount || 0), hColX[1], rowY + 5);
      doc.font('Helvetica').fillColor('#334155').text(h.approvedBy || 'Owner / Admin', hColX[2], rowY + 5);
      doc.text(h.notes || h.reference || 'Routine Handover', hColX[3], rowY + 5, { width: 105, ellipsis: true });

      if (h.status === 'approved') {
        doc.fillColor('#059669').font('Helvetica-Bold').text('✓ SETTLED', hColX[4], rowY + 5);
      } else {
        doc.fillColor('#d97706').font('Helvetica-Bold').text('PENDING', hColX[4], rowY + 5);
      }

      doc.y = rowY + 18;
    });
  }

  addFooterAndPageNumbers(doc);
  doc.end();
};

/**
 * Generate Admin Executive Business & Operations PDF Report
 */
const generateAdminPdfReport = async ({ summary, partnerPerformance = [], dailyTrends = [], recentPayments = [], periodLabel, res }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(res);

  drawHeader(
    doc,
    'Executive Operations & Financial Report',
    'Natural Milk Dairy Enterprise Operations',
    periodLabel
  );

  // Business KPI Grid (Row 1)
  const kpiY1 = doc.y;
  const cardW = (doc.page.width - 80 - 15) / 4;
  const cardH = 46;

  const kpisRow1 = [
    { label: 'TOTAL SALES / BILLED', val: formatMoney(summary.todaySales || summary.totalSales || 0), sub: `${summary.completed || summary.completedDeliveries || 0} deliveries done`, color: '#0d5c3a', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'PAYMENTS COLLECTED', val: formatMoney(summary.paymentsCollected || summary.totalPayments || 0), sub: `${summary.activeCustomers || 0} active subscribers`, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
    { label: 'MARKET OUTSTANDING', val: formatMoney(summary.totalOutstanding || 0), sub: 'Pending customer dues', color: '#be123c', bg: '#fef2f2', border: '#fecaca' },
    { label: 'ADVANCE BALANCES HELD', val: formatMoney(summary.totalAdvance || 0), sub: 'Prepaid customer credit', color: '#047857', bg: '#f0fdf4', border: '#bbf7d0' },
  ];

  kpisRow1.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 5);
    doc.roundedRect(x, kpiY1, cardW, cardH, 5).fillAndStroke(kpi.bg, kpi.border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label, x + 7, kpiY1 + 6, { width: cardW - 14 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(kpi.color).text(kpi.val, x + 7, kpiY1 + 18, { width: cardW - 14 });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(kpi.sub, x + 7, kpiY1 + 33, { width: cardW - 14 });
  });

  // Business KPI Grid (Row 2 - Volume & Fulfillment)
  const kpiY2 = kpiY1 + cardH + 6;
  const kpisRow2 = [
    { label: 'TOTAL MILK DISPATCHED', val: `${summary.todayMilkLitres || summary.totalMilkLitres || 0} L`, sub: 'Pure A2 & Farm Cow Milk', color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'TOTAL CURD DELIVERED', val: `${summary.todayCurdKg || summary.totalCurdKg || 0} kg`, sub: 'Traditional Pot Dahi', color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'CUSTOMER BASE', val: `${summary.totalCustomers || 0} Total`, sub: `${summary.activeCustomers || 0} Active Subscribers`, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'DELIVERY SUCCESS RATE', val: `${summary.fulfillmentRate || 98.5}%`, sub: `${summary.notDelivered || 0} missed deliveries`, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ];

  kpisRow2.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 5);
    doc.roundedRect(x, kpiY2, cardW, cardH, 5).fillAndStroke(kpi.bg, kpi.border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label, x + 7, kpiY2 + 6, { width: cardW - 14 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(kpi.color).text(kpi.val, x + 7, kpiY2 + 18, { width: cardW - 14 });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(kpi.sub, x + 7, kpiY2 + 33, { width: cardW - 14 });
  });

  doc.y = kpiY2 + cardH + 16;

  // Partner Performance Table
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Delivery Partner Fleet Operations', 40, doc.y);
  doc.y += 6;

  const partColX = [40, 140, 230, 310, 380, 450];
  const drawFleetHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0f172a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('PARTNER NAME', partColX[0] + 5, y + 6);
    doc.text('TERRITORY / ROUTE', partColX[1], y + 6);
    doc.text('STOPS (DONE/TOTAL)', partColX[2], y + 6);
    doc.text('MILK (L)', partColX[3], y + 6);
    doc.text('CASH COLL.', partColX[4], y + 6);
    doc.text('HANDOVER STATUS', partColX[5], y + 6);
    doc.y = y + 20;
  };

  drawFleetHeader();

  if (partnerPerformance.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No delivery partner records found for this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    partnerPerformance.forEach((p, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawFleetHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f8fafc');

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.font('Helvetica-Bold').text(p.name || 'Partner', partColX[0] + 5, rowY + 5, { width: 95, ellipsis: true });
      doc.font('Helvetica').text(p.area || 'All Areas', partColX[1], rowY + 5, { width: 85, ellipsis: true });
      doc.text(`${p.completed || 0} / ${p.total || 0}`, partColX[2], rowY + 5);
      doc.text(`${(p.milkLitres || 0).toFixed(1)} L`, partColX[3], rowY + 5);
      doc.font('Helvetica-Bold').text(formatMoney(p.cashCollected || 0), partColX[4], rowY + 5);

      const netHandover = (p.cashCollected || 0) - (p.handedOver || 0);
      if (netHandover <= 0) {
        doc.fillColor('#059669').text('✓ CLEARED', partColX[5], rowY + 5);
      } else {
        doc.fillColor('#d97706').text(`Due ${formatMoney(netHandover)}`, partColX[5], rowY + 5);
      }

      doc.y = rowY + 18;
    });
  }

  doc.y += 14;

  // Daily Trends / Ledger Table
  if (doc.y > 680) doc.addPage();

  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Daily Delivery & Revenue Trajectory', 40, doc.y);
  doc.y += 6;

  const trendColX = [40, 120, 200, 280, 370, 460];
  const drawTrendHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0d5c3a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DATE', trendColX[0] + 5, y + 6);
    doc.text('DELIVERIES', trendColX[1], y + 6);
    doc.text('MILK VOLUME', trendColX[2], y + 6);
    doc.text('CURD VOLUME', trendColX[3], y + 6);
    doc.text('SALES (BILLED)', trendColX[4], y + 6);
    doc.text('COLLECTED', trendColX[5], y + 6);
    doc.y = y + 20;
  };

  drawTrendHeader();

  if (dailyTrends.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No daily sales records available for this period.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    dailyTrends.forEach((t, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawTrendHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f0fdf4');

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
      doc.text(t.date || '-', trendColX[0] + 5, rowY + 5);
      doc.text(`${t.completed || 0} done`, trendColX[1], rowY + 5);
      doc.text(`${(t.milkLitres || 0).toFixed(1)} L`, trendColX[2], rowY + 5);
      doc.text(`${((t.curdKg || 0)).toFixed(1)} kg`, trendColX[3], rowY + 5);
      doc.font('Helvetica-Bold').text(formatMoney(t.sales || 0), trendColX[4], rowY + 5);
      doc.font('Helvetica-Bold').fillColor('#059669').text(formatMoney(t.collected || 0), trendColX[5], rowY + 5);

      doc.y = rowY + 18;
    });
  }

  addFooterAndPageNumbers(doc);
  doc.end();
};

/**
 * Generate All Customers Consolidated PDF Report
 */
const generateAllCustomersPdfReport = async ({ customersData = [], summary = {}, periodLabel, res }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(res);

  drawHeader(
    doc,
    'Consolidated Customers Ledger & Deliveries Report',
    `All Active & Registered Customers (${customersData.length} Accounts)`,
    periodLabel
  );

  // KPI Grid
  const kpiY = doc.y;
  const cardW = (doc.page.width - 80 - 15) / 4;
  const cardH = 46;

  const kpis = [
    { label: 'TOTAL BILLED SALES', val: formatMoney(summary.totalBilled || 0), sub: `${summary.totalDeliveries || 0} deliveries done`, color: '#0d5c3a', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'PAYMENTS RECORDED', val: formatMoney(summary.totalPaid || 0), sub: `${summary.activeCount || customersData.length} active customers`, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
    { label: 'OUTSTANDING DUES', val: formatMoney(summary.totalOutstanding || 0), sub: 'Pending recovery', color: '#be123c', bg: '#fef2f2', border: '#fecaca' },
    { label: 'ADVANCE BALANCES', val: formatMoney(summary.totalAdvance || 0), sub: 'Prepaid customer credit', color: '#047857', bg: '#f0fdf4', border: '#bbf7d0' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 5);
    doc.roundedRect(x, kpiY, cardW, cardH, 5).fillAndStroke(kpi.bg, kpi.border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label, x + 7, kpiY + 6, { width: cardW - 14 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(kpi.color).text(kpi.val, x + 7, kpiY + 18, { width: cardW - 14 });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(kpi.sub, x + 7, kpiY + 33, { width: cardW - 14 });
  });

  doc.y = kpiY + cardH + 16;

  // Customers Table
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text('Itemized Customer Accounts Breakdown', 40, doc.y);
  doc.y += 6;

  const colX = [40, 140, 230, 280, 340, 400, 465];
  const drawTableHeader = () => {
    const y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0d5c3a');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('CUSTOMER / ID', colX[0] + 5, y + 6);
    doc.text('MOBILE / AREA', colX[1], y + 6);
    doc.text('DELIVERIES', colX[2], y + 6);
    doc.text('MILK (L)', colX[3], y + 6);
    doc.text('BILLED', colX[4], y + 6);
    doc.text('PAID', colX[5], y + 6);
    doc.text('LEDGER BALANCE', colX[6], y + 6);
    doc.y = y + 20;
  };

  drawTableHeader();

  if (customersData.length === 0) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text('No customer account records found.', 50, doc.y + 10);
    doc.y += 26;
  } else {
    customersData.forEach((c, idx) => {
      if (doc.y > 740) {
        doc.addPage();
        drawTableHeader();
      }

      const rowY = doc.y;
      const isEven = idx % 2 === 0;
      doc.rect(40, rowY, doc.page.width - 80, 18).fill(isEven ? '#ffffff' : '#f8fafc');

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(c.name || 'Customer', colX[0] + 5, rowY + 5, { width: 90, ellipsis: true });

      doc.fillColor('#334155').font('Helvetica');
      doc.text(`${c.mobile ? String(c.mobile).slice(-10) : '-'} • ${c.area || 'Hyd'}`, colX[1], rowY + 5, { width: 85, ellipsis: true });
      doc.text(`${c.deliveriesCount || 0} done`, colX[2], rowY + 5);
      doc.text(`${(c.milkLitres || 0).toFixed(1)} L`, colX[3], rowY + 5);
      doc.font('Helvetica-Bold').text(formatMoney(c.totalBilled || 0), colX[4], rowY + 5);
      doc.font('Helvetica-Bold').fillColor('#059669').text(formatMoney(c.totalPaid || 0), colX[5], rowY + 5);

      const bal = c.currentBalance || 0;
      if (bal > 0) {
        doc.fillColor('#be123c').font('Helvetica-Bold').text(`Due ${formatMoney(bal)}`, colX[6], rowY + 5);
      } else if (bal < 0) {
        doc.fillColor('#059669').font('Helvetica-Bold').text(`Adv ${formatMoney(Math.abs(bal))}`, colX[6], rowY + 5);
      } else {
        doc.fillColor('#64748b').font('Helvetica').text('Cleared', colX[6], rowY + 5);
      }

      doc.y = rowY + 18;
    });
  }

  addFooterAndPageNumbers(doc);
  doc.end();
};

module.exports = {
  generateCustomerPdfReport,
  generatePartnerPdfReport,
  generateAdminPdfReport,
  generateAllCustomersPdfReport,
};
