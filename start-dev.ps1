# ZENTARA Dev Start — รัน Frontend + Backend พร้อมกัน
# ต้องการ: Node.js, npm install ทั้งสองโปรเจคแล้ว

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\zentara-project'; npm run dev"

Write-Host "Starting ZENTARA..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
