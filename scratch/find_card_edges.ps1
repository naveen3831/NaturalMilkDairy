Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\.user_uploaded\media_1793175063073_7adb6fba.png")

Write-Host "Image size: $($img.Width) x $($img.Height)"

for ($y = 54; $y -lt 74; $y += 2) {
    $c = $img.GetPixel(40, $y)
    Write-Host "y=$($y): R=$($c.R) G=$($c.G) B=$($c.B)"
}

for ($y = 200; $y -lt 218; $y += 2) {
    $c = $img.GetPixel(40, $y)
    Write-Host "bottom y=$($y): R=$($c.R) G=$($c.G) B=$($c.B)"
}

for ($x = 12; $x -lt 26; $x += 2) {
    $c = $img.GetPixel($x, 100)
    Write-Host "left x=$($x): R=$($c.R) G=$($c.G) B=$($c.B)"
}

for ($x = 276; $x -lt 296; $x += 2) {
    $c = $img.GetPixel($x, 100)
    Write-Host "right x=$($x): R=$($c.R) G=$($c.G) B=$($c.B)"
}

$img.Dispose()
