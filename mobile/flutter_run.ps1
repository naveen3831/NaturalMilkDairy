# flutter_run.ps1 - Clean flutter run helper
# Kills stale Gradle processes and clears lock files before building

Write-Host "Clearing stale Gradle locks..." -ForegroundColor Cyan

# Kill all Java/Gradle processes
taskkill /F /IM java.exe /T 2>$null
taskkill /F /IM gradle.exe /T 2>$null
Start-Sleep -Seconds 1

# Remove project-level lock file
$lockFile = "$PSScriptRoot\android\.gradle\noVersion\buildLogic.lock"
if (Test-Path $lockFile) {
    Remove-Item -Force $lockFile
    Write-Host "  Removed project lock file" -ForegroundColor Green
}

# Remove all lock files in global Gradle cache
Get-ChildItem "$env:USERPROFILE\.gradle" -Recurse -Filter "*.lock" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "  Cleared global Gradle lock files" -ForegroundColor Green

if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

Write-Host "Starting flutter run..." -ForegroundColor Cyan
flutter run --android-skip-build-dependency-validation @args
