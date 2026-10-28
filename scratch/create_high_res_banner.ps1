Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\farm_fresh_milk_banner_1793181214519.jpg"
$baseImg = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = $baseImg.Width
$h = $baseImg.Height

$canvas = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($canvas)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Draw base background image
$g.DrawImage($baseImg, 0, 0, $w, $h)

function Get-RoundedPath($rect, $radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $r = New-Object System.Drawing.Rectangle($rect.X, $rect.Y, $d, $d)
    $path.AddArc($r, 180, 90)
    $r.X = $rect.Right - $d
    $path.AddArc($r, 270, 90)
    $r.Y = $rect.Bottom - $d
    $path.AddArc($r, 0, 90)
    $r.X = $rect.Left
    $path.AddArc($r, 90, 90)
    $path.CloseFigure()
    return $path
}

# 1. PILL: DOORSTEP DELIVERY PLANS
$pillRect = New-Object System.Drawing.Rectangle(85, 90, 370, 52)
$pillPath = Get-RoundedPath $pillRect 26
$pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
$pillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 188, 227, 206), 2)
$g.FillPath($pillBrush, $pillPath)
$g.DrawPath($pillPen, $pillPath)

$pillFont = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
$pillTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 13, 92, 58))
$pillFormat = New-Object System.Drawing.StringFormat
$pillFormat.Alignment = [System.Drawing.StringAlignment]::Center
$pillFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("DOORSTEP DELIVERY PLANS", $pillFont, $pillTextBrush, [System.Drawing.RectangleF]$pillRect, $pillFormat)

# 2. TITLE: Fresh Dairy Every Morning
$titleFont = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 12, 35, 64))
$g.DrawString("Fresh Dairy", $titleFont, $titleBrush, 85, 160)
$g.DrawString("Every Morning", $titleFont, $titleBrush, 85, 250)

# 3. SUBTITLE: Healthy milk, curd, paneer and more delivered to your doorstep before 6:30 AM.
$subFont = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 75, 85, 99))
$subRect = New-Object System.Drawing.RectangleF(85, 360, 520, 110)
$g.DrawString("Healthy milk, curd, paneer and more delivered to your doorstep before 6:30 AM.", $subFont, $subBrush, $subRect)

# 4. BUTTON WITH SHADOW: Explore Plans ->
$shadowRect = New-Object System.Drawing.Rectangle(85, 514, 290, 74)
$shadowPath = Get-RoundedPath $shadowRect 37
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 13, 92, 58))
$g.FillPath($shadowBrush, $shadowPath)

$btnRect = New-Object System.Drawing.Rectangle(85, 508, 290, 74)
$btnPath = Get-RoundedPath $btnRect 37
$btnBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 13, 92, 58))
$g.FillPath($btnBrush, $btnPath)

$btnFont = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Bold)
$btnTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$btnFormat = New-Object System.Drawing.StringFormat
$btnFormat.Alignment = [System.Drawing.StringAlignment]::Center
$btnFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("Explore Plans  →", $btnFont, $btnTextBrush, [System.Drawing.RectangleF]$btnRect, $btnFormat)

# Save ultra-high res image
$outMobile = "mobile/assets/images/sub_hero_banner.png"
$outClient = "client/public/sub_hero_banner.png"
$canvas.Save($outMobile, [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Save($outClient, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Ultra-High Quality Banner created at $w x $h!"

$g.Dispose()
$canvas.Dispose()
$baseImg.Dispose()
