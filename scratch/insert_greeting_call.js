const fs = require('fs');

const path = 'mobile/lib/screens/home/home_screen.dart';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '            // 1. Hero Banner matching Image 1\r\n            _buildHeroBanner(rawProducts),',
  '            // 0. Greeting Header matching Image\r\n            _buildGreetingHeader(user),\r\n\r\n            // 1. Hero Banner matching Image 1\r\n            _buildHeroBanner(rawProducts),'
);

if (!content.includes('_buildGreetingHeader(user)')) {
  // Try with \n
  content = content.replace(
    '            // 1. Hero Banner matching Image 1\n            _buildHeroBanner(rawProducts),',
    '            // 0. Greeting Header matching Image\n            _buildGreetingHeader(user),\n\n            // 1. Hero Banner matching Image 1\n            _buildHeroBanner(rawProducts),'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Inserted _buildGreetingHeader(user) into _buildHomeFeed');
