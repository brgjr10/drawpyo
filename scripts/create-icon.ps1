Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(13, 17, 23))
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(88, 166, 255))
$g.FillRectangle($brush, 50, 50, 156, 156)
$g.Dispose()
$icon = [System.Drawing.Icon]::FromHandle(([System.Drawing.Bitmap]$bmp).GetHicon())
$fs = [System.IO.File]::Create("assets\icon.ico")
$icon.Save($fs)
$fs.Close()
$bmp.Dispose()
Write-Host "icon.ico created"
