@echo off
echo ===================================================
echo   Treeniti Local Android Build Script (Windows)
echo ===================================================
echo.
echo IMPORTANT WARNING:
echo If this project is inside a OneDrive folder, the build WILL fail with:
echo "ninja: error: manifest 'build.ninja' still dirty"
echo.
echo Make sure your project folder is moved outside OneDrive (e.g. to C:\Treenit).
echo.

:menu
echo Choose what you want to build:
echo [1] APK (for testing on device/emulator)
echo [2] AAB (for uploading to Google Play Console)
echo [3] Clean and Exit
echo.
set /p choice="Enter your choice (1, 2 or 3): "

if "%choice%"=="1" goto apk
if "%choice%"=="2" goto aab
if "%choice%"=="3" goto clean_exit
echo Invalid choice. Try again.
goto menu

:apk
echo Cleaning Gradle caches...
cd android
call gradlew clean
echo.
echo Building Release APK...
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo.
    echo Gradle APK build failed!
    cd ..
    pause
    exit /b %errorlevel%
)
echo.
echo APK Build Successful!
echo Your APK is located at:
echo android\app\build\outputs\apk\release\app-release.apk
cd ..
pause
exit /b 0

:aab
echo Cleaning Gradle caches...
cd android
call gradlew clean
echo.
echo Building Release AAB (App Bundle)...
call gradlew bundleRelease
if %errorlevel% neq 0 (
    echo.
    echo Gradle AAB build failed!
    cd ..
    pause
    exit /b %errorlevel%
)
echo.
echo AAB Build Successful!
echo Your AAB is located at:
echo android\app\build\outputs\bundle\release\app-release.aab
cd ..
pause
exit /b 0

:clean_exit
echo Cleaning Gradle caches...
cd android
call gradlew clean
cd ..
echo Done.
pause
exit /b 0
