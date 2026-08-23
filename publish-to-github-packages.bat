@echo off
chcp 65001 >nul
echo Mapping network drive...
if exist Z:\ (
    echo Drive Z: already exists, using it directly...
    cd /d Z:
) else (
    subst Z: "\\zimaserver\ZimaOS-HD\AppData\Projects\drawpyo"
    cd /d Z:
)
echo Publishing to GitHub Packages...
npm publish --registry=https://npm.pkg.github.com
set PUBLISH_RESULT=%ERRORLEVEL%
if %PUBLISH_RESULT% EQU 0 (
    echo.
    echo SUCCESS: Package published to GitHub Packages!
    echo View at: https://github.com/brgjr10/drawpyo/packages
) else (
    echo.
    echo FAILED: npm publish exited with code %PUBLISH_RESULT%
)
pause
