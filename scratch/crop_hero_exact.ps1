Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\.user_uploaded\media_1793175063073_7adb6fba.png")

$cropRect = New-Object System.Drawing.Rectangle(19, 61, 266, 146)
$cropped = $img.Clone($cropRect, $img.PixelFormat)

# Save to mobile/assets/images and client/public
$cropped.Save("mobile/assets/images/sub_hero_banner.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Save("client/public/sub_hero_banner.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Cropped hero card saved: $($cropped.Width)x$($cropped.Height)"

$cropped.Dispose()
$img.Dispose()
