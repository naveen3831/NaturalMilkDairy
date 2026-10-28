Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LENOVO\.gemini\antigravity\brain\c1b964a4-b66e-47db-a530-0d93dc258c8d\farm_fresh_milk_banner_1793181214519.jpg"
$baseImg = [System.Drawing.Bitmap]::FromFile($srcPath)

for ($x = 450; $x -lt 850; $x += 50) {
    $c = $baseImg.GetPixel($x, 360)
    Write-Host "y=360, x=$($x): R=$($c.R) G=$($c.G) B=$($c.B)"
}

$baseImg.Dispose()
