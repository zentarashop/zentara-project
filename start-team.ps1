# ZENTARA Team Dashboard — รัน Backend + Team Dashboard พร้อมกัน
# วิธีใช้: คลิกขวาไฟล์นี้ > Run with PowerShell

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npx serve zentara-team -l 4321"

Write-Host "Starting ZENTARA Team Dashboard..." -ForegroundColor Green
Write-Host "Backend:   http://localhost:5000" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:4321" -ForegroundColor Cyan
Write-Host "`nรอสัก 5-10 วินาที แล้วเปิด http://localhost:4321 ในเบราว์เซอร์" -ForegroundColor Yellow
