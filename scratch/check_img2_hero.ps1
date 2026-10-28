Add-Type -AssemblyName System.Drawing

$img2 = [System.Drawing.Bitmap]::FromFile("C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\.user_uploaded\media_1793178941507_9e3180cc.png")
Write-Host "img2: $($img2.Width)x$($img2.Height)"

# Let's inspect where the card is in img2
for ($y = 40; $y -lt 65; $y += 2) {
    $c = $img2.GetPixel(30, $y)
    Write-Host "y=$($y): R=$($c.R) G=$($c.G) B=$($c.B)"
}
$img2.Dispose()
