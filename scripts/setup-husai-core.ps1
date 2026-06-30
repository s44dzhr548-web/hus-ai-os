param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$AnonKey,
  [Parameter(Mandatory = $true)]
  [string]$ServiceRoleKey,
  [string]$ProjectRef = "",
  [string]$DatabasePassword = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not $ProjectRef -and $SupabaseUrl -match "https://([^.]+)\.supabase\.co") {
  $ProjectRef = $Matches[1]
}

function Write-EnvFile($AppPath, $ExtraLines = @()) {
  $lines = @(
    "NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$AnonKey"
    "SUPABASE_SERVICE_ROLE_KEY=$ServiceRoleKey"
  ) + $ExtraLines
  $content = ($lines -join "`n") + "`n"
  Set-Content -Path (Join-Path $AppPath ".env.local") -Value $content -NoNewline
  Write-Host "  Wrote $AppPath/.env.local" -ForegroundColor Green
}

Write-Host "==> Configuring husai-core env files" -ForegroundColor Cyan

Write-EnvFile (Join-Path $Root "restaurant-os") @(
  "NEXT_PUBLIC_APP_URL=http://localhost:3000"
)
Write-EnvFile (Join-Path $Root "trading-ai") @(
  "NEXT_PUBLIC_APP_URL=http://localhost:3001"
  "ALPACA_API_KEY="
  "ALPACA_API_SECRET="
)

Write-Host "==> Linking Supabase project: $ProjectRef" -ForegroundColor Cyan
Push-Location $Root
if ($ProjectRef) {
  npx supabase link --project-ref $ProjectRef 2>$null
}
if ($DatabasePassword) {
  $dbUrl = "postgresql://postgres.$ProjectRef`:$DatabasePassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
  Write-Host "==> Pushing migrations..." -ForegroundColor Yellow
  npx supabase db push --db-url $dbUrl
} else {
  Write-Host "==> Pushing migrations (linked project)..." -ForegroundColor Yellow
  npx supabase db push
}
Pop-Location

Write-Host "==> husai-core setup complete" -ForegroundColor Green
