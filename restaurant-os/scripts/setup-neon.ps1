#Requires -Version 5.1
<#
.SYNOPSIS
  Configure .env from Neon, run migrations, and seed Menu OS database.
.USAGE
  1. Paste Neon connection string into .env.neon (single line)
  2. .\scripts\setup-neon.ps1
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$neonFile = Join-Path $Root ".env.neon"
if (-not (Test-Path $neonFile)) {
  Write-Error ".env.neon not found. Create it and paste your Neon connection string."
}

$neonUrl = (Get-Content $neonFile | Where-Object { $_ -match '^postgresql://' } | Select-Object -First 1).Trim()
if (-not $neonUrl) {
  Write-Error "No postgresql:// connection string found in .env.neon"
}

# Ensure sslmode for Neon
if ($neonUrl -notmatch 'sslmode=') {
  $sep = if ($neonUrl -match '\?') { '&' } else { '?' }
  $neonUrl = "$neonUrl${sep}sslmode=require"
}

$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

$envContent = @"
# Neon PostgreSQL (production)
DATABASE_URL="$neonUrl"
DIRECT_URL="$neonUrl"

# Storage (local for dev; set s3 on Vercel)
STORAGE_PROVIDER="local"

# NextAuth
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="$secret"

# Moyasar (restaurant keys entered in dashboard)
MOYASAR_PUBLISHABLE_KEY="pk_test_placeholder"
MOYASAR_SECRET_KEY="sk_test_placeholder"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3005"
SEED_ENV="production"
"@

Set-Content -Path (Join-Path $Root ".env") -Value $envContent -Encoding UTF8
Write-Host "Updated .env with Neon connection string"

$env:DATABASE_URL = $neonUrl
$env:DIRECT_URL = $neonUrl

Write-Host "Running prisma migrate deploy..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running seed..."
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Database ready."
