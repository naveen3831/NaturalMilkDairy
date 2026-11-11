import 'package:intl/intl.dart';

/// HtmlReportService
/// Generates clean, publication-grade executive statements and reports
/// with day-by-day itemized delivery history and payments for Android native printing and direct PDF rendering.
class HtmlReportService {
  static String formatCurrency(num amount) {
    final formatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: 'Rs. ',
      decimalDigits: 0,
    );
    return formatter.format(amount);
  }

  static String _cssStyles() {
    return '''
      @page { size: A4; margin: 12mm 15mm 15mm 15mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.4;
      }
      .brand-bar { height: 8px; background: #0d5c3a; }
      .brand-subbar { height: 3px; background: #f59e0b; margin-bottom: 14px; }
      .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
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
      .kpi-grid { display: flex; gap: 8px; margin-bottom: 16px; }
      .kpi-card {
        flex: 1;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .kpi-label { font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; }
      .kpi-value { font-size: 14px; font-weight: 900; margin: 2px 0; }
      .kpi-sub { font-size: 8px; color: #64748b; }
      .section-heading { font-size: 11px; font-weight: 800; color: #0f172a; margin: 14px 0 6px 0; text-transform: uppercase; letter-spacing: 0.3px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
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
        justify-content: space-between;
        font-size: 7.5px;
        color: #94a3b8;
      }
    ''';
  }

  /// 1. Generate HTML Statement for ALL Customers
  /// Includes Consolidated Customer Accounts Ledger + Day-by-Day Route Delivery Log
  static String generateAllCustomersHtml({
    required List<Map<String, dynamic>> customers,
    required List<Map<String, dynamic>> deliveries,
    required List<Map<String, dynamic>> payments,
    required String periodLabel,
  }) {
    final nowStr = DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now());

    num totalBilled = 0;
    num totalPaid = 0;
    num totalOutstanding = 0;
    num totalAdvance = 0;
    num totalMilk = 0;
    num totalCurd = 0;

    // Build row stats per customer
    final rowsHtml = customers.map((c) {
      final cId = c['id']?.toString() ?? c['_id']?.toString() ?? '';
      final custCode = c['customerId']?.toString() ?? '';
      final cMob = c['mobile']?.toString() ?? '';
      final name = c['name']?.toString() ?? 'Customer';
      final area = c['area']?.toString() ?? 'Hyd';
      final balance = num.tryParse(c['currentBalance']?.toString() ?? '0') ?? 0;

      final keys = [cId, custCode, cMob].where((k) => k.isNotEmpty).toList();

      final cDeliveries = deliveries.where((d) {
        final dCustId = d['customerId']?.toString() ?? '';
        final dPhone = d['customerPhone']?.toString() ?? '';
        return keys.contains(dCustId) || (cMob.isNotEmpty && dPhone.contains(cMob.replaceAll(RegExp(r'[^0-9]'), '')));
      }).toList();

      final completedDeliveries = cDeliveries.where((d) => d['status'] == 'delivered').toList();

      num billed = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['totalAmount']?.toString() ?? '0') ?? 0));
      num milkL = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['actualMilk']?.toString() ?? d['plannedMilk']?.toString() ?? '0') ?? 0));
      num curdG = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['actualCurd']?.toString() ?? d['plannedCurd']?.toString() ?? '0') ?? 0));

      final cPayments = payments.where((p) {
        final pCustId = p['customerId']?.toString() ?? '';
        return keys.contains(pCustId);
      }).toList();

      num paid = cPayments.fold(0, (s, p) => s + (num.tryParse(p['amount']?.toString() ?? '0') ?? 0));

      totalBilled += billed;
      totalPaid += paid;
      totalMilk += milkL;
      totalCurd += curdG;
      if (balance > 0) totalOutstanding += balance;
      if (balance < 0) totalAdvance += balance.abs();

      String balHtml;
      if (balance > 0) {
        balHtml = '<span class="badge-due">Due ${formatCurrency(balance)}</span>';
      } else if (balance < 0) {
        balHtml = '<span class="badge-adv">Adv ${formatCurrency(balance.abs())}</span>';
      } else {
        balHtml = '<span class="badge-clr">Cleared (Rs. 0)</span>';
      }

      return '''
        <tr>
          <td><strong>$name</strong> ${custCode.isNotEmpty ? '<br><span style="color:#64748b;font-size:7.5px;">ID: $custCode</span>' : ''}</td>
          <td>${cMob.isNotEmpty ? '+91 $cMob' : '-'}<br><span style="color:#64748b;font-size:7.5px;">$area</span></td>
          <td class="text-center">${completedDeliveries.length}</td>
          <td class="text-center">${milkL.toStringAsFixed(1)} L${curdG > 0 ? '<br><span style="font-size:7px;color:#64748b;">${(curdG / 1000).toStringAsFixed(1)}kg curd</span>' : ''}</td>
          <td class="text-right"><strong>${formatCurrency(billed)}</strong></td>
          <td class="text-right"><span style="color:#059669;font-weight:700;">${formatCurrency(paid)}</span></td>
          <td class="text-right">$balHtml</td>
        </tr>
      ''';
    }).join('\n');

    // Day-by-Day Deliveries History breakdown
    final Map<String, List<Map<String, dynamic>>> byDate = {};
    for (final d in deliveries) {
      final dt = d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '';
      if (dt.isNotEmpty) {
        byDate.putIfAbsent(dt, () => []).add(d);
      }
    }

    final sortedDates = byDate.keys.toList()..sort((a, b) => b.compareTo(a));
    final dailyFulfillmentRows = sortedDates.isEmpty
        ? '<tr><td colspan="6" class="text-center" style="padding:10px;color:#64748b;">No delivery logs available for this period.</td></tr>'
        : sortedDates.map((dt) {
            final dayDels = byDate[dt]!;
            final completed = dayDels.where((d) => d['status'] == 'delivered').toList();
            final dayMilk = completed.fold<num>(0, (s, d) => s + (num.tryParse(d['actualMilk']?.toString() ?? d['plannedMilk']?.toString() ?? '0') ?? 0));
            final dayCurd = completed.fold<num>(0, (s, d) => s + (num.tryParse(d['actualCurd']?.toString() ?? d['plannedCurd']?.toString() ?? '0') ?? 0));
            final dayBilled = completed.fold<num>(0, (s, d) => s + (num.tryParse(d['totalAmount']?.toString() ?? '0') ?? 0));

            String dateFormatted = dt;
            try {
              final parsed = DateTime.parse(dt);
              dateFormatted = DateFormat('dd MMM yyyy (EEE)').format(parsed);
            } catch (_) {}

            return '''
              <tr>
                <td><strong>$dateFormatted</strong></td>
                <td class="text-center">${completed.length} / ${dayDels.length} Drops</td>
                <td class="text-center"><strong>${dayMilk.toStringAsFixed(1)} L</strong></td>
                <td class="text-center">${dayCurd > 0 ? '${(dayCurd / 1000).toStringAsFixed(1)} kg' : '-'}</td>
                <td class="text-right"><strong>${formatCurrency(dayBilled)}</strong></td>
                <td class="text-center"><span class="badge-done">✓ ${completed.length == dayDels.length ? '100% Complete' : '${completed.length} Done'}</span></td>
              </tr>
            ''';
          }).join('\n');

    return '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Natural Milk Dairy - All Customers Consolidated Statement</title>
        <style>${_cssStyles()}</style>
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
            <strong>Statement Date:</strong><br>$nowStr<br>
            <span style="color:#059669;font-weight:700;">Confidential & Verified</span>
          </div>
        </div>

        <div class="title-box">
          <div class="report-title">CONSOLIDATED ALL-CUSTOMERS STATEMENT</div>
          <div class="report-period">Coverage: $periodLabel | Total Registered Customers: ${customers.length}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
            <div class="kpi-label">TOTAL BILLED SALES</div>
            <div class="kpi-value" style="color:#0d5c3a;">${formatCurrency(totalBilled)}</div>
            <div class="kpi-sub">${totalMilk.toStringAsFixed(1)} L Milk • ${(totalCurd / 1000).toStringAsFixed(1)} kg Curd</div>
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
            ${rowsHtml.isNotEmpty ? rowsHtml : '<tr><td colspan="7" class="text-center" style="padding:10px;color:#64748b;">No customer accounts found.</td></tr>'}
          </tbody>
        </table>

        <!-- Day by Day Delivery History Breakdown -->
        <div class="section-heading">Day-by-Day Delivery Route Fulfillment History</div>
        <table>
          <thead>
            <tr>
              <th style="width:24%;">Delivery Date & Day</th>
              <th class="text-center" style="width:18%;">Drops Completed</th>
              <th class="text-center" style="width:16%;">Milk Volume</th>
              <th class="text-center" style="width:14%;">Curd Volume</th>
              <th class="text-right" style="width:14%;">Daily Sales</th>
              <th class="text-center" style="width:14%;">Status</th>
            </tr>
          </thead>
          <tbody>
            $dailyFulfillmentRows
          </tbody>
        </table>

        <div class="footer-note">
          <span>Natural Milk Dairy Enterprise Operations • Automated Daily Billing Report</span>
          <span>Generated in Realtime • Verified Authentic</span>
        </div>
      </body>
      </html>
    ''';
  }

  /// 2. Generate HTML Statement for a SINGLE Customer
  /// Includes Complete Day-by-Day Delivery Log + Payments Ledger
  static String generateSingleCustomerHtml({
    required Map<String, dynamic> customer,
    required List<Map<String, dynamic>> deliveries,
    required List<Map<String, dynamic>> payments,
    required String periodLabel,
  }) {
    final nowStr = DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now());

    final name = customer['name']?.toString() ?? 'Customer';
    final custCode = customer['customerId']?.toString() ?? customer['id']?.toString() ?? '';
    final mobile = customer['mobile']?.toString() ?? '';
    final area = customer['area']?.toString() ?? 'Hyderabad';
    final address = customer['address']?.toString() ?? 'Doorstep Address';
    final balance = num.tryParse(customer['currentBalance']?.toString() ?? '0') ?? 0;

    final completedDeliveries = deliveries.where((d) => d['status'] == 'delivered').toList();
    num totalBilled = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['totalAmount']?.toString() ?? '0') ?? 0));
    num totalPaid = payments.fold(0, (s, p) => s + (num.tryParse(p['amount']?.toString() ?? '0') ?? 0));
    num totalMilk = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['actualMilk']?.toString() ?? d['plannedMilk']?.toString() ?? '0') ?? 0));
    num totalCurd = completedDeliveries.fold(0, (s, d) => s + (num.tryParse(d['actualCurd']?.toString() ?? d['plannedCurd']?.toString() ?? '0') ?? 0));

    // Sort deliveries Day-by-Day (Newest date first)
    final sortedDeliveries = List<Map<String, dynamic>>.from(deliveries);
    sortedDeliveries.sort((a, b) {
      final dateA = (a['deliveryDate'] ?? a['date'] ?? '').toString();
      final dateB = (b['deliveryDate'] ?? b['date'] ?? '').toString();
      return dateB.compareTo(dateA);
    });

    final deliveryRowsHtml = sortedDeliveries.isEmpty
        ? '<tr><td colspan="7" class="text-center" style="padding:12px;color:#64748b;">No doorstep delivery records found for this period.</td></tr>'
        : sortedDeliveries.map((d) {
            final rawDate = d['deliveryDate']?.toString() ?? d['date']?.toString() ?? '-';
            String formattedDate = rawDate;
            try {
              final parsed = DateTime.parse(rawDate);
              formattedDate = DateFormat('dd MMM yyyy (EEE)').format(parsed);
            } catch (_) {}

            final milk = num.tryParse(d['actualMilk']?.toString() ?? d['plannedMilk']?.toString() ?? '0') ?? 0;
            final curd = num.tryParse(d['actualCurd']?.toString() ?? d['plannedCurd']?.toString() ?? '0') ?? 0;
            final rate = num.tryParse(d['milkPrice']?.toString() ?? '60') ?? 60;
            final amount = num.tryParse(d['totalAmount']?.toString() ?? '0') ?? (milk * rate);
            final partner = d['deliveryBoyName']?.toString() ?? 'Assigned Partner';
            final status = d['status']?.toString() ?? 'delivered';

            String statusBadge = status == 'delivered'
                ? '<span class="badge-done">✓ Delivered</span>'
                : (status == 'not_delivered' ? '<span class="badge-notdone">✗ Missed</span>' : '<span class="badge-pending">Pending</span>');

            return '''
              <tr>
                <td><strong>$formattedDate</strong></td>
                <td><strong>${milk.toStringAsFixed(1)} L</strong></td>
                <td>${curd > 0 ? '${curd.toStringAsFixed(0)} g' : '-'}</td>
                <td>Rs. $rate/L</td>
                <td class="text-right"><strong>${formatCurrency(amount)}</strong></td>
                <td>$partner</td>
                <td class="text-center">$statusBadge</td>
              </tr>
            ''';
          }).join('\n');

    // Payments rows
    final sortedPayments = List<Map<String, dynamic>>.from(payments);
    sortedPayments.sort((a, b) {
      final dateA = (a['paymentDate'] ?? a['createdAt'] ?? '').toString();
      final dateB = (b['paymentDate'] ?? b['createdAt'] ?? '').toString();
      return dateB.compareTo(dateA);
    });

    final paymentRowsHtml = sortedPayments.isEmpty
        ? '<tr><td colspan="5" class="text-center" style="padding:10px;color:#64748b;">No payment entries recorded in this period.</td></tr>'
        : sortedPayments.map((p) {
            final raw = p['paymentDate']?.toString() ?? p['createdAt']?.toString() ?? '';
            String formattedDate = raw.split('T')[0];
            try {
              final parsed = DateTime.parse(raw);
              formattedDate = DateFormat('dd MMM yyyy (EEE)').format(parsed);
            } catch (_) {}

            final amt = num.tryParse(p['amount']?.toString() ?? '0') ?? 0;
            final mode = (p['paymentMethod']?.toString() ?? 'CASH').toUpperCase();
            final ref = p['referenceNumber']?.toString() ?? '';
            final by = p['collectedBy']?.toString() ?? 'Partner';

            return '''
              <tr>
                <td><strong>$formattedDate</strong></td>
                <td class="text-right"><strong style="color:#059669;">${formatCurrency(amt)}</strong></td>
                <td>$mode ${ref.isNotEmpty ? '($ref)' : ''}</td>
                <td>$by</td>
                <td class="text-center"><span class="badge-done">✓ Credited</span></td>
              </tr>
            ''';
          }).join('\n');

    return '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Natural Milk Dairy - Customer Statement ($name)</title>
        <style>${_cssStyles()}</style>
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
            <strong>Statement Date:</strong><br>$nowStr<br>
            <span style="color:#059669;font-weight:700;">Account Statement</span>
          </div>
        </div>

        <div class="title-box">
          <div class="report-title">CUSTOMER STATEMENT & DELIVERIES LEDGER</div>
          <div class="report-period">Account: $name ${custCode.isNotEmpty ? '($custCode)' : ''} | Period: $periodLabel</div>
        </div>

        <!-- Customer Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;">
          <div>
            <div><strong>Customer Name:</strong> $name</div>
            <div style="color:#64748b;font-size:8.5px;margin-top:2px;"><strong>Address:</strong> $address, $area</div>
            <div style="color:#64748b;font-size:8.5px;margin-top:1px;"><strong>Mobile:</strong> ${mobile.isNotEmpty ? '+91 $mobile' : '-'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:8px;text-transform:uppercase;color:#64748b;font-weight:800;">CURRENT LEDGER BALANCE</div>
            <div style="font-size:16px;font-weight:900;margin-top:2px;color:${balance > 0 ? '#b91c1c' : (balance < 0 ? '#059669' : '#0f172a')}">
              ${balance > 0 ? 'DUE ${formatCurrency(balance)}' : (balance < 0 ? 'ADV ${formatCurrency(balance.abs())}' : 'CLEARED (Rs. 0)')}
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-color:#bbf7d0;background:#f0fdf4;">
            <div class="kpi-label">TOTAL DELIVERIES</div>
            <div class="kpi-value" style="color:#0d5c3a;">${completedDeliveries.length} Drops</div>
            <div class="kpi-sub">${totalMilk.toStringAsFixed(1)} L Milk ${totalCurd > 0 ? '• ${(totalCurd / 1000).toStringAsFixed(1)}kg Curd' : ''}</div>
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
            $deliveryRowsHtml
          </tbody>
        </table>

        <div class="section-heading">Payments & Adjustments Received</div>
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
            $paymentRowsHtml
          </tbody>
        </table>

        <div class="footer-note">
          <span>Natural Milk Dairy Official Customer Statement • 100% Pure Organic Milk</span>
          <span>Generated in Realtime • Thank You For Being Our Customer!</span>
        </div>
      </body>
      </html>
    ''';
  }
}
