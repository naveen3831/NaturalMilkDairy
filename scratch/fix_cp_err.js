const fs = require('fs');
const path = 'c:/Users/LENOVO/Desktop/Naturalmilkdairy/mobile/lib/screens/home/subscribe_checkout_screen.dart';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '_errorMessage = customerProvider.errorMessage ??',
  '_errorMessage = cp.errorMessage ??'
);

code = code.replace(
  'reason: customerProvider.errorMessage ??',
  'reason: cp.errorMessage ??'
);

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed undefined identifier references in subscribe_checkout_screen.dart');
