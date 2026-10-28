Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\farm_fresh_milk_banner_1793181214519.jpg"
$baseImg = [System.Drawing.Bitmap]::FromFile($srcPath)

# Let's crop the bottle + glass + leaves
# Bottle & glass are roughly between x=750 and 1250, y=150 to 650
$cropRect = New-Object System.Drawing.Rectangle(780, 140, 520, 520)
$cropped = $baseImg.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Resize to high-res 300x300 thumbnail
$thumb = New-Object System.Drawing.Bitmap(300, 300, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($thumb)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($cropped, 0, 0, 300, 300)

$thumb.Save("mobile/assets/images/sub_active_thumb.png", [System.Drawing.Imaging.ImageFormat]::Png)
$thumb.Save("client/public/sub_active_thumb.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "High-Res sub_active_thumb created at 300x300!"

$g.Dispose()
$thumb.Dispose()
$cropped.Dispose()
$baseImg.Dispose()
