# ZENTARA Setup Script
# Run this in PowerShell after installing Node.js (https://nodejs.org)

Write-Host "=== ZENTARA SETUP ===" -ForegroundColor Green

# ── Frontend
Write-Host "`n[1/3] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\zentara-project"
npm install

# ── Backend
Write-Host "`n[2/3] Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
npm install

# ── Env files
Write-Host "`n[3/3] Setting up environment files..." -ForegroundColor Cyan

if (-not (Test-Path "$PSScriptRoot\backend\.env")) {
    Copy-Item "$PSScriptRoot\backend\.env.example" "$PSScriptRoot\backend\.env"
    Write-Host "  -> Created backend/.env (กรุณาแก้ SUPABASE_URL และ SUPABASE_SERVICE_KEY)" -ForegroundColor Yellow
}

if (-not (Test-Path "$PSScriptRoot\zentara-project\.env.local")) {
    Copy-Item "$PSScriptRoot\zentara-project\.env.example" "$PSScriptRoot\zentara-project\.env.local"
    Write-Host "  -> Created frontend/.env.local" -ForegroundColor Yellow
}

Write-Host "`n=== SETUP COMPLETE ===" -ForegroundColor Green
Write-Host "`nขั้นตอนต่อไป:"
Write-Host "1. สร้าง Supabase project ที่ https://supabase.com"
Write-Host "2. รัน backend/db/schema.sql ใน Supabase SQL Editor"
Write-Host "3. แก้ backend/.env ใส่ SUPABASE_URL และ SUPABASE_SERVICE_KEY"
Write-Host "4. รัน backend:   cd backend; npm run dev"
Write-Host "5. รัน frontend:  cd zentara-project; npm run dev"
Write-Host "6. เปิดเบราว์เซอร์: http://localhost:3000"
