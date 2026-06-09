# ============================================================
# ZENTARA - Supabase Backup Script
# Run this anytime to backup all tables to local JSON files
# Usage: .\backup.ps1
# ============================================================

$SUPABASE_URL    = "https://wqfoubfjzzpzkraiyqbb.supabase.co"
$SERVICE_KEY     = $env:SUPABASE_SERVICE_KEY  # set in .env or replace directly

if (-not $SERVICE_KEY) {
    # Try to load from backend .env
    $envFile = Join-Path $PSScriptRoot "..\backend\.env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^SUPABASE_SERVICE_KEY=(.+)$") {
                $SERVICE_KEY = $Matches[1].Trim('"').Trim("'")
            }
        }
    }
}

if (-not $SERVICE_KEY) {
    Write-Host "ERROR: SUPABASE_SERVICE_KEY not found. Set env variable or check backend/.env" -ForegroundColor Red
    exit 1
}

$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
}

$date      = Get-Date -Format "yyyy-MM-dd"
$outDir    = Join-Path $PSScriptRoot $date
New-Item -ItemType Directory -Force $outDir | Out-Null

$tables = @("profiles", "products", "product_sizes", "orders", "order_items", "discount_codes", "reviews")

$summary = @{ backup_date = $date; tables = @{} }

foreach ($table in $tables) {
    Write-Host "Backing up: $table ..." -NoNewline
    try {
        $url  = "$SUPABASE_URL/rest/v1/$table`?select=*&order=id"
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        $json = $resp | ConvertTo-Json -Depth 10
        $file = Join-Path $outDir "$table.json"
        [System.IO.File]::WriteAllText($file, $json, [System.Text.Encoding]::UTF8)
        $count = if ($resp -is [array]) { $resp.Count } else { 1 }
        Write-Host " $count rows" -ForegroundColor Green
        $summary.tables[$table] = @{ rows = $count; file = "$table.json" }
    } catch {
        Write-Host " FAILED: $_" -ForegroundColor Red
        $summary.tables[$table] = @{ rows = 0; error = $_.ToString() }
    }
}

# Write summary
$infoFile = Join-Path $outDir "backup_info.json"
$summary | ConvertTo-Json -Depth 5 | Out-File -FilePath $infoFile -Encoding utf8

Write-Host ""
Write-Host "Backup complete -> $outDir" -ForegroundColor Cyan
Write-Host "Files: $(($tables | ForEach-Object { "$_.json" }) -join ', '), backup_info.json"
