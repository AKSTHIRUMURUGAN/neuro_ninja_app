Add-Type -AssemblyName System.Drawing

$logoPath = "C:\Users\acer\Desktop\neuro_ninja\assets\images\logo.png"
if (-not (Test-Path $logoPath)) {
    $logoPath = "C:\Users\acer\Desktop\neuro_ninja\logo.png"
}

Write-Host "Using logo from: $logoPath"

# 1. Copy directly to assets/images standard targets
Copy-Item -Path $logoPath -Destination "assets\images\icon.png" -Force
Copy-Item -Path $logoPath -Destination "assets\images\android-icon-foreground.png" -Force
Copy-Item -Path $logoPath -Destination "assets\images\splash-icon.png" -Force
Copy-Item -Path $logoPath -Destination "assets\images\favicon.png" -Force
Write-Host "Copied to assets/images standard targets."

# Helper function to resize and save
function Resize-And-Save($srcImg, $targetPath, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    $g.Dispose()

    $dir = Split-Path -Parent $targetPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved: $targetPath ($w x $h)"
}

$src = [System.Drawing.Image]::FromFile($logoPath)

# Splash screen drawables
Resize-And-Save $src "android\app\src\main\res\drawable-mdpi\splashscreen_logo.png" 150 150
Resize-And-Save $src "android\app\src\main\res\drawable-hdpi\splashscreen_logo.png" 225 225
Resize-And-Save $src "android\app\src\main\res\drawable-xhdpi\splashscreen_logo.png" 300 300
Resize-And-Save $src "android\app\src\main\res\drawable-xxhdpi\splashscreen_logo.png" 450 450
Resize-And-Save $src "android\app\src\main\res\drawable-xxxhdpi\splashscreen_logo.png" 600 600

# Mipmap densities
$densities = @(
    @{ Name="mipmap-mdpi"; Size=48; Fg=108 },
    @{ Name="mipmap-hdpi"; Size=72; Fg=162 },
    @{ Name="mipmap-xhdpi"; Size=96; Fg=216 },
    @{ Name="mipmap-xxhdpi"; Size=144; Fg=324 },
    @{ Name="mipmap-xxxhdpi"; Size=192; Fg=432 }
)

foreach ($d in $densities) {
    $folder = "android\app\src\main\res\" + $d.Name
    Resize-And-Save $src ($folder + "\ic_launcher.png") $d.Size $d.Size
    Resize-And-Save $src ($folder + "\ic_launcher_round.png") $d.Size $d.Size
    Resize-And-Save $src ($folder + "\ic_launcher_foreground.png") $d.Fg $d.Fg
    
    # Remove old webp if present to avoid duplicate resource conflict
    if (Test-Path ($folder + "\ic_launcher.webp")) { Remove-Item ($folder + "\ic_launcher.webp") -Force }
    if (Test-Path ($folder + "\ic_launcher_round.webp")) { Remove-Item ($folder + "\ic_launcher_round.webp") -Force }
    if (Test-Path ($folder + "\ic_launcher_foreground.webp")) { Remove-Item ($folder + "\ic_launcher_foreground.webp") -Force }
}

$src.Dispose()
Write-Host "All branding assets generated successfully!"

