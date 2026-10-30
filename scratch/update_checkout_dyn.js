const fs = require('fs');
const path = 'c:/Users/LENOVO/Desktop/Naturalmilkdairy/mobile/lib/screens/home/subscribe_checkout_screen.dart';
let code = fs.readFileSync(path, 'utf8');

// 1. In create order
code = code.replace(
  'final customerProvider = context.read<CustomerProvider>();\n      final orderRes = await customerProvider.createSubscriptionOrder(',
  'final dynamic customerProvider = context.read<CustomerProvider>();\n      final orderRes = await customerProvider.createSubscriptionOrder('
);

// 2. In verify payment
code = code.replace(
  'final customerProvider = context.read<CustomerProvider>();\n                                      final paymentId =',
  'final dynamic customerProvider = context.read<CustomerProvider>();\n                                      final paymentId ='
);

// 3. In fail payment
code = code.replace(
  'final customerProvider = context.read<CustomerProvider>();\n                                      await customerProvider.failSubscriptionPayment(',
  'final dynamic customerProvider = context.read<CustomerProvider>();\n                                      await customerProvider.failSubscriptionPayment('
);

fs.writeFileSync(path, code, 'utf8');
console.log('Successfully updated subscribe_checkout_screen.dart');
