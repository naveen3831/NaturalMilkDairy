Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\farm_fresh_milk_banner_1793181214519.jpg")

Write-Host "Image: $($img.Width)x$($img.Height)"

# Sample horizontal strip at y = 384 (middle)
for ($x = 50; $x -lt $img.Width; $x += 100) {
    $c = $img.GetPixel($x, 384)
    Write-Host "x=$($x): R=$($c.R) G=$($c.G) B=$($c.B)"
}

$img.Dispose()
