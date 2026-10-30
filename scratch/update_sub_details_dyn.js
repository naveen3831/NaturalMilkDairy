const fs = require('fs');
const path = 'c:/Users/LENOVO/Desktop/Naturalmilkdairy/mobile/lib/screens/home/subscription_details_screen.dart';
let code = fs.readFileSync(path, 'utf8');

// 1. In _openRazorpayPaymentSheet:
code = code.replace(
  'final ok = await customerProvider.verifySubscriptionPayment(',
  'final dynamic cp = customerProvider;\n                                    final dynamic okRes = await cp.verifySubscriptionPayment('
);
code = code.replace(
  'if (ok) {',
  'final bool ok = okRes == true;\n                                    if (ok) {'
);
code = code.replace(
  'await customerProvider.failSubscriptionPayment(',
  'final dynamic cp = customerProvider;\n                                    await cp.failSubscriptionPayment('
);

// 2. In _UpgradePlanPageState:
code = code.replace(
  'final orderRes = await widget.customerProvider.createSubscriptionOrder(',
  'final dynamic cp = widget.customerProvider;\n    final dynamic orderRes = await cp.createSubscriptionOrder('
);

// 3. In _ExtendSubscriptionPageState:
code = code.replace(
  'final orderRes = await widget.customerProvider.createSubscriptionOrder(',
  'final dynamic cp = widget.customerProvider;\n    final dynamic orderRes = await cp.createSubscriptionOrder('
);

fs.writeFileSync(path, code, 'utf8');
console.log('Successfully updated subscription_details_screen.dart');
