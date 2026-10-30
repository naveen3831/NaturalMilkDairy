const fs = require('fs');
const path = 'c:/Users/LENOVO/Desktop/Naturalmilkdairy/mobile/lib/screens/home/subscribe_checkout_screen.dart';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /final dynamic customerProvider = context\.read<CustomerProvider>\(\);\s*final orderRes = await customerProvider\.createSubscriptionOrder\(/g,
  `final dynamic cp = context.read<CustomerProvider>();
      final dynamic orderRes = await cp.createSubscriptionOrder(`
);

code = code.replace(
  /final dynamic customerProvider = context\.read<CustomerProvider>\(\);\s*final paymentId = 'pay_rzp_\${DateTime\.now\(\)\.millisecondsSinceEpoch}';\s*final signature = 'sig_rzp_\${DateTime\.now\(\)\.millisecondsSinceEpoch}';\s*final ok = await customerProvider\.verifySubscriptionPayment\(/g,
  `final dynamic cp = context.read<CustomerProvider>();
                                      final paymentId = 'pay_rzp_\${DateTime.now().millisecondsSinceEpoch}';
                                      final signature = 'sig_rzp_\${DateTime.now().millisecondsSinceEpoch}';
                                      final dynamic okRes = await cp.verifySubscriptionPayment(`
);

code = code.replace(
  /if \(ok\) {\s*final calcEnd = DateTime\.now\(\)\.add\(const Duration\(days: 30\)\);/g,
  `final bool ok = okRes == true;
                                      if (ok) {
                                        final calcEnd = DateTime.now().add(const Duration(days: 30));`
);

code = code.replace(
  /final dynamic customerProvider = context\.read<CustomerProvider>\(\);\s*await customerProvider\.failSubscriptionPayment\(/g,
  `final dynamic cp = context.read<CustomerProvider>();
                                      await cp.failSubscriptionPayment(`
);

fs.writeFileSync(path, code, 'utf8');
console.log('Updated subscribe_checkout_screen.dart successfully');
