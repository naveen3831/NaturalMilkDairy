const fs = require('fs');

function checkDartFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let openBrace = 0, openParen = 0, openBracket = 0;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ignore comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    
    for (let char of line) {
      if (char === '{') openBrace++;
      else if (char === '}') openBrace--;
      else if (char === '(') openParen++;
      else if (char === ')') openParen--;
      else if (char === '[') openBracket++;
      else if (char === ']') openBracket--;
    }
    if (openBrace < 0 || openParen < 0 || openBracket < 0) {
      console.error(`Negative balance at ${filePath}:${i+1} -> braces:${openBrace}, parens:${openParen}, brackets:${openBracket}`);
      return false;
    }
  }
  console.log(`${filePath} -> braces:${openBrace}, parens:${openParen}, brackets:${openBracket}`);
  return openBrace === 0 && openParen === 0 && openBracket === 0;
}

console.log("home_screen.dart:", checkDartFile('mobile/lib/screens/home/home_screen.dart'));
console.log("subscription_details_screen.dart:", checkDartFile('mobile/lib/screens/home/subscription_details_screen.dart'));
console.log("product_card.dart:", checkDartFile('mobile/lib/screens/home/widgets/product_card.dart'));
console.log("product_details_screen.dart:", checkDartFile('mobile/lib/screens/home/product_details_screen.dart'));
