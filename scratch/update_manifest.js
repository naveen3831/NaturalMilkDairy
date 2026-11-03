const fs = require('fs');
const p = 'mobile/android/app/src/main/AndroidManifest.xml';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('androidx.core.content.FileProvider')) {
  const provider = `        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>`;
  c = c.replace('    </application>', provider);
}
if (!c.includes('IMAGE_CAPTURE')) {
  const query = `        <intent>
            <action android:name="android.media.action.IMAGE_CAPTURE"/>
        </intent>
    </queries>`;
  c = c.replace('    </queries>', query);
}
fs.writeFileSync(p, c);
console.log('Updated AndroidManifest.xml successfully');
