/**
 * htmlReportService.js
 * High-precision, publication-grade HTML report generator and native browser PDF printing service
 * for Natural Milk Dairy (Admin, Partner, Customer portals).
 * Includes day-by-day itemized delivery logs and payment audit records.
 */

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return 'Rs. ' + Math.round(num).toLocaleString('en-IN');
}

function formatDateWithDay(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'short',
    });
  } catch (_) {
    return dateStr;
  }
}

function getCssStyles() {
  return `
    @page { size: A4; margin: 12mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 12px;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }
    @media print {
      body { padding: 0; }
      .kpi-grid { display: flex !important; flex-wrap: nowrap !important; }
    }
    .brand-bar { height: 8px; background: #0d5c3a; }
    .brand-subbar { height: 3px; background: #f59e0b; margin-bottom: 14px; }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .dairy-title { font-size: 18px; font-weight: 900; color: #0d5c3a; letter-spacing: -0.3px; margin: 0; }
    .dairy-tagline { font-size: 9.5px; color: #475569; margin: 2px 0 0 0; }
    .dairy-contacts { font-size: 8.5px; color: #64748b; margin-top: 2px; }
    .date-meta { text-align: right; font-size: 8.5px; color: #64748b; }
    .title-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .report-title { font-size: 13px; font-weight: 800; color: #065f46; text-transform: uppercase; margin: 0; }
    .report-period { font-size: 9.5px; color: #047857; margin-top: 2px; }
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .kpi-card {
      flex: 1 1 120px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .kpi-label { font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .kpi-value { font-size: 14px; font-weight: 900; margin: 2px 0; }
    .kpi-sub { font-size: 8px; color: #64748b; }
    .section-heading { font-size: 11px; font-weight: 800; color: #0f172a; margin: 14px 0 6px 0; text-transform: uppercase; letter-spacing: 0.3px; }
    .table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .table-wrap table { margin-bottom: 0; min-width: 520px; }
    @media print { .table-wrap { overflow: visible; } .table-wrap table { min-width: 100%; } }
    th {
      background: #0d5c3a;
      color: #ffffff;
      font-weight: 800;
      font-size: 8px;
      text-transform: uppercase;
      padding: 6px 8px;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 8.5px;
      color: #334155;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge-due { color: #be123c; font-weight: 800; }
    .badge-adv { color: #059669; font-weight: 800; }
    .badge-clr { color: #64748b; }
    .badge-done { color: #059669; font-weight: 800; }
    .badge-pending { color: #d97706; font-weight: 800; }
    .badge-notdone { color: #be123c; font-weight: 800; }
    .footer-note {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: space-between;
      font-size: 7.5px;
      color: #94a3b8;
    }
  `;
}

/**
 * 1. Consolidated Report for ALL Customers
 * Includes Consolidated Customer Accounts + Day-by-Day Route Delivery Audit
 */
export function generateAllCustomersHtml({ customers = [], deliveries = [], payments = [], periodLabel = 'Current Period' }) {
  const now = new Date();
  const nowStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalAdvance = 0;
  let totalMilk = 0;
  let totalCurd = 0;

  const rowsHtml = customers.map((c) => {
    const cId = c.id || c._id || '';
    const custCode = c.customerId || '';
    const cMob = c.mobile || '';
    const name = c.name || 'Customer';
    const area = c.area || 'Hyderabad';
    const balance = Number(c.currentBalance) || 0;

    const keys = [cId, custCode, cMob].filter(Boolean).map(String);

    const cDeliveries = deliveries.filter((d) => {
      const dCustId = String(d.customerId || '');
      const dPhone = String(d.customerPhone || '');
      return keys.includes(dCustId) || (cMob && dPhone.includes(cMob.replace(/\D/g, '')));
    });

    const completed = cDeliveries.filter((d) => d.status === 'delivered');
    const billed = completed.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const milkL = completed.reduce((sum, d) => sum + (Number(d.actualMilk || d.plannedMilk) || 0), 0);
    const curdG = completed.reduce((sum, d) => sum + (Number(d.actualCurd || d.plannedCurd) || 0), 0);

    const cPayments = payments.filter((p) => {
      const pCustId = String(p.customerId || '');
      return keys.includes(pCustId);
    });
    const paid = cPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    totalBilled += billed;
    totalPaid += paid;
    totalMilk += milkL;
    totalCurd += curdG;
    if (balance > 0) totalOutstanding += balance;
    if (balance < 0) totalAdvance += Math.abs(balance);

    let balHtml = '<span class="badge-clr">Cleared (Rs. 0)</span>';
    if (balance > 0) {
      balHtml = `<span class="badge-due">Due ${formatCurrency(balance)}</span>`;
    } else if (balance < 0) {
      balHtml = `<span class="badge-adv">Adv ${formatCurrency(Math.abs(balance))}</span>`;
    }

    return `
      <tr>
        <td><strong>${name}</strong> ${custCode ? `<br><span style="color:#64748b;font-size:7.5px;">ID: ${custCode}</span>` : ''}</td>
        <td>${cMob ? `+91 ${cMob}` : '-'}<br><span style="color:#64748b;font-size:7.5px;">${area}</span></td>
        <td class="text-center">${completed.length}</td>
        <td class="text-center">${milkL.toFixed(1)} L${curdG > 0 ? `<br><span style="font-size:7px;color:#64748b;">${(curdG / 1000).toFixed(1)}kg curd</span>` : ''}</td>
        <td class="text-right"><strong>${formatCurrency(billed)}</strong></td>
        <td class="text-right"><span style="color:#059669;font-weight:700;">${formatCurrency(paid)}</span></td>
        <td class="text-right">${balHtml}</td>
      </tr>
    `;
  }).join('\n');

  // Group deliveries day by day
  const byDate = {};
  deliveries.forEach((d) => {
    const dt = d.deliveryDate || d.date || '';
    if (dt) {
      if (!byDate[dt]) byDate[dt] = [];
      byDate[dt].push(d);
    }
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const dailyRowsHtml = sortedDates.map((dt) => {
    const dayDels = byDate[dt];
    const completed = dayDels.filter((d) => d.status === 'delivered');
    const dayMilk = completed.reduce((sum, d) => sum + (Number(d.actualMilk || d.plannedMilk) || 0), 0);
    const dayCurd = completed.reduce((sum, d) => sum + (Number(d.actualCurd || d.plannedCurd) || 0), 0);
    const dayBilled = completed.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

    return `
      <tr>
        <td><strong>${formatDateWithDay(dt)}</strong></td>
        <td class="text-center">${completed.length} / ${dayDels.length} Drops</td>
        <td class="text-center"><strong>${dayMilk.toFixed(1)} L</strong></td>
        <td class="text-center">${dayCurd > 0 ? `${(dayCurd / 1000).toFixed(1)} kg` : '-'}</td>
        <td class="text-right"><strong>${formatCurrency(dayBilled)}</strong></td>
        <td class="text-center"><span class="badge-done">✓ ${completed.length === dayDels.length ? '100% Fulfilled' : `${completed.length} Completed`}</span></td>
      </tr>
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Natural Milk Dairy - All Customers Consolidated Statement</title>
      <style>${getCssStyles()}</style>
    </head>
    <body>
      <div class="brand-bar"></div>
      <div class="brand-subbar"></div>

      <div class="header-container">
        <div>
          <h1 class="dairy-title">NATURAL MILK DAIRY</h1>
          <div class="dairy-tagline">100% Pure Organic Farm Milk • Chilled to 4°C • Doorstep Daily Delivery</div>
          <div class="dairy-contacts">Helpline: +91 97018 78789 | Email: contact@naturalmilkdairy.com | Hyderabad, Telangana</div>
        </div>
        <div class="date-meta">
          <strong>Statement Date:</strong><br>${nowStr}<br>
          <span style="color:#059669;font-weight:700;">Confidential & Verified</span>
        </div>
      </div>

      <div class="title-box">
        <div class="report-title">CONSOLIDATED ALL-CUSTOMERS STATEMENT</div>
        <div class="report-period">Coverage: ${periodLabel} | Total Registered Customers: ${customers.length}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
          <div class="kpi-label">TOTAL BILLED SALES</div>
          <div class="kpi-value" style="color:#0d5c3a;">${formatCurrency(totalBilled)}</div>
          <div class="kpi-sub">${totalMilk.toFixed(1)} L Milk • ${(totalCurd / 1000).toFixed(1)} kg Curd</div>
        </div>
        <div class="kpi-card" style="border-color:#bae6fd;background:#f0f9ff;">
          <div class="kpi-label">PAYMENTS COLLECTED</div>
          <div class="kpi-value" style="color:#0369a1;">${formatCurrency(totalPaid)}</div>
          <div class="kpi-sub">${customers.length} Accounts Reconciled</div>
        </div>
        <div class="kpi-card" style="border-color:#fecaca;background:#fef2f2;">
          <div class="kpi-label">MARKET OUTSTANDING</div>
          <div class="kpi-value" style="color:#b91c1c;">${formatCurrency(totalOutstanding)}</div>
          <div class="kpi-sub">Total Pending Dues</div>
        </div>
        <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
          <div class="kpi-label">ADVANCE HELD</div>
          <div class="kpi-value" style="color:#047857;">${formatCurrency(totalAdvance)}</div>
          <div class="kpi-sub">Prepaid Subscriptions</div>
        </div>
      </div>

      <div class="section-heading">Itemized Customer Balances & Route Fulfillment</div>
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:25%;">Customer / Code</th>
            <th style="width:20%;">Phone / Territory</th>
            <th class="text-center" style="width:10%;">Deliveries</th>
            <th class="text-center" style="width:12%;">Volume</th>
            <th class="text-right" style="width:11%;">Total Billed</th>
            <th class="text-right" style="width:11%;">Paid</th>
            <th class="text-right" style="width:11%;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" class="text-center" style="padding:14px;color:#64748b;">No customer accounts found for this period.</td></tr>'}
        </tbody>
      </table>
      </div>

      <!-- Day by Day Delivery History -->
      <div class="section-heading">Day-by-Day Delivery Route Fulfillment History</div>
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:25%;">Delivery Date & Day</th>
            <th class="text-center" style="width:18%;">Drops Completed</th>
            <th class="text-center" style="width:15%;">Milk Volume</th>
            <th class="text-center" style="width:14%;">Curd Volume</th>
            <th class="text-right" style="width:14%;">Daily Sales</th>
            <th class="text-center" style="width:14%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRowsHtml || '<tr><td colspan="6" class="text-center" style="padding:10px;color:#64748b;">No delivery logs available for this period.</td></tr>'}
        </tbody>
      </table>
      </div>

      <div class="footer-note">
        <span>Natural Milk Dairy Enterprise Operations • Automated Daily Billing Report</span>
        <span>Generated in Realtime • Verified Authentic</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * 2. Itemized Statement for a SINGLE Customer
 * Includes Complete Day-by-Day Delivery Log + Payments Ledger
 */
export function generateSingleCustomerHtml({ customer = {}, deliveries = [], payments = [], periodLabel = 'Current Period' }) {
  const now = new Date();
  const nowStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const name = escapeHtml(customer.name || 'Customer');
  const custCode = escapeHtml(customer.customerId || customer.id || '');
  const mobile = escapeHtml(customer.mobile || '');
  const area = escapeHtml(customer.area || 'Hyderabad');
  const address = escapeHtml(customer.address || 'Doorstep Address');
  const balance = Number(customer.currentBalance) || 0;

  const completed = deliveries.filter((d) => d.status === 'delivered');
  const totalBilled = completed.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalMilk = completed.reduce((sum, d) => sum + (Number(d.actualMilk || d.plannedMilk) || 0), 0);
  const totalCurd = completed.reduce((sum, d) => sum + (Number(d.actualCurd || d.plannedCurd) || 0), 0);

  // Sort deliveries Day-by-Day (Newest first)
  const sortedDeliveries = [...deliveries].sort((a, b) => {
    const dateA = a.deliveryDate || a.date || '';
    const dateB = b.deliveryDate || b.date || '';
    return dateB.localeCompare(dateA);
  });

  const deliveryRows = sortedDeliveries.map((d) => {
    const rawDate = d.deliveryDate || d.date || '-';
    const date = formatDateWithDay(rawDate);
    const milk = Number(d.actualMilk || d.plannedMilk) || 0;
    const curd = Number(d.actualCurd || d.plannedCurd) || 0;
    const rate = Number(d.milkPrice) || 60;
    const amt = Number(d.totalAmount) || milk * rate;
    const partner = d.deliveryBoyName || 'Assigned Partner';
    const status = d.status || 'delivered';

    let statusBadge = '<span class="badge-pending">Pending</span>';
    if (status === 'delivered') statusBadge = '<span class="badge-done">✓ Delivered</span>';
    if (status === 'not_delivered') statusBadge = '<span class="badge-notdone">✗ Missed</span>';

    return `
      <tr>
        <td><strong>${date}</strong></td>
        <td><strong>${milk.toFixed(1)} L</strong></td>
        <td>${curd > 0 ? `${curd.toFixed(0)} g` : '-'}</td>
        <td>Rs. ${rate}/L</td>
        <td class="text-right"><strong>${formatCurrency(amt)}</strong></td>
        <td>${partner}</td>
        <td class="text-center">${statusBadge}</td>
      </tr>
    `;
  }).join('\n');

  // Sort payments Day-by-Day (Newest first)
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = a.paymentDate || a.createdAt || '';
    const dateB = b.paymentDate || b.createdAt || '';
    return String(dateB).localeCompare(String(dateA));
  });

  const paymentRows = sortedPayments.length === 0
    ? '<tr><td colspan="5" class="text-center" style="padding:10px;color:#64748b;">No payment entries recorded in this period.</td></tr>'
    : sortedPayments.map((p) => {
        const rawDate = p.paymentDate || p.createdAt || '';
        const date = formatDateWithDay(rawDate ? String(rawDate).split('T')[0] : '');
        const amt = Number(p.amount) || 0;
        const mode = String(p.paymentMethod || 'CASH').toUpperCase();
        const ref = p.referenceNumber || '';
        const by = p.collectedBy || 'Partner';

        return `
          <tr>
            <td><strong>${date}</strong></td>
            <td class="text-right"><strong style="color:#059669;">${formatCurrency(amt)}</strong></td>
            <td>${mode} ${ref ? `(${ref})` : ''}</td>
            <td>${by}</td>
            <td class="text-center"><span class="badge-done">✓ Credited</span></td>
          </tr>
        `;
      }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Natural Milk Dairy - Statement for ${name}</title>
      <style>${getCssStyles()}</style>
    </head>
    <body>
      <div class="brand-bar"></div>
      <div class="brand-subbar"></div>

      <div class="header-container">
        <div>
          <h1 class="dairy-title">NATURAL MILK DAIRY</h1>
          <div class="dairy-tagline">100% Pure Organic Farm Milk • Chilled to 4°C • Doorstep Daily Delivery</div>
          <div class="dairy-contacts">Helpline: +91 97018 78789 | Email: contact@naturalmilkdairy.com | Hyderabad, Telangana</div>
        </div>
        <div class="date-meta">
          <strong>Statement Date:</strong><br>${nowStr}<br>
          <span style="color:#059669;font-weight:700;">Account Statement</span>
        </div>
      </div>

      <div class="title-box">
        <div class="report-title">CUSTOMER STATEMENT & DELIVERIES LEDGER</div>
        <div class="report-period">Account: ${name} ${custCode ? `(${custCode})` : ''} | Period: ${periodLabel}</div>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;">
        <div>
          <div><strong>Customer Name:</strong> ${name}</div>
          <div style="color:#64748b;font-size:8.5px;margin-top:2px;"><strong>Address:</strong> ${address}, ${area}</div>
          <div style="color:#64748b;font-size:8.5px;margin-top:1px;"><strong>Mobile:</strong> ${mobile ? `+91 ${mobile}` : '-'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:8px;text-transform:uppercase;color:#64748b;font-weight:800;">CURRENT LEDGER BALANCE</div>
          <div style="font-size:16px;font-weight:900;margin-top:2px;color:${balance > 0 ? '#b91c1c' : (balance < 0 ? '#059669' : '#0f172a')}">
            ${balance > 0 ? `DUE ${formatCurrency(balance)}` : (balance < 0 ? `ADV ${formatCurrency(Math.abs(balance))}` : 'CLEARED (Rs. 0)')}
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
          <div class="kpi-label">TOTAL DELIVERIES</div>
          <div class="kpi-value" style="color:#0d5c3a;">${completed.length} Drops</div>
          <div class="kpi-sub">${totalMilk.toFixed(1)} L Milk ${totalCurd > 0 ? `• ${(totalCurd / 1000).toFixed(1)}kg Curd` : ''}</div>
        </div>
        <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
          <div class="kpi-label">PERIOD BILLED</div>
          <div class="kpi-value" style="color:#0d5c3a;">${formatCurrency(totalBilled)}</div>
          <div class="kpi-sub">Total Deliveries Charge</div>
        </div>
        <div class="kpi-card" style="border-color:#bae6fd;background:#f0f9ff;">
          <div class="kpi-label">PAYMENTS RECORDED</div>
          <div class="kpi-value" style="color:#0369a1;">${formatCurrency(totalPaid)}</div>
          <div class="kpi-sub">${payments.length} Payments Received</div>
        </div>
        <div class="kpi-card" style="border-color:#e2e8f0;background:#f8fafc;">
          <div class="kpi-label">NET BALANCE</div>
          <div class="kpi-value" style="color:${balance > 0 ? '#b91c1c' : (balance < 0 ? '#059669' : '#0f172a')}">${formatCurrency(balance)}</div>
          <div class="kpi-sub">${balance > 0 ? 'Payment Required' : (balance < 0 ? 'Prepaid Balance' : 'Fully Settled')}</div>
        </div>
      </div>

      <!-- Day by Day Delivery History -->
      <div class="section-heading">Day-by-Day Doorstep Delivery History (${sortedDeliveries.length} Records)</div>
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:24%;">Delivery Date & Day</th>
            <th style="width:13%;">Milk Qty</th>
            <th style="width:13%;">Curd Qty</th>
            <th style="width:13%;">Unit Rate</th>
            <th class="text-right" style="width:13%;">Day Total</th>
            <th style="width:14%;">Assigned Partner</th>
            <th class="text-center" style="width:10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryRows || '<tr><td colspan="7" class="text-center" style="padding:10px;color:#64748b;">No delivery records found for this period.</td></tr>'}
        </tbody>
      </table>
      </div>

      <div class="section-heading">Payments & Adjustments Received</div>
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:25%;">Payment Date & Day</th>
            <th class="text-right" style="width:20%;">Amount Paid</th>
            <th style="width:25%;">Payment Mode & Ref</th>
            <th style="width:18%;">Collected By</th>
            <th class="text-center" style="width:12%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRows}
        </tbody>
      </table>
      </div>

      <div class="footer-note">
        <span>Natural Milk Dairy Official Customer Statement • 100% Pure Organic Milk</span>
        <span>Generated in Realtime • Thank You For Being Our Customer!</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Native Browser PDF Print Trigger
 */
export function printHtmlDocument(html, title = 'Natural_Milk_Dairy_Report') {
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.document.title = title;
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn('printWindow.print error:', e);
        }
      }, 400);
      return true;
    }
  } catch (err) {
    console.warn('window.open blocked, using iframe fallback', err);
  }

  // Fallback: hidden iframe print
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('iframe print error:', e);
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 3000);
    }, 400);
    return true;
  } catch (fallbackErr) {
    console.error('Print iframe fallback failed:', fallbackErr);
    return false;
  }
}
