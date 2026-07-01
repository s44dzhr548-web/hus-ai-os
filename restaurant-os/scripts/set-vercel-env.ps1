#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$PROD_URL = "https://restaurant-os-nine.vercel.app"
$lines = Get-Content (Join-Path $Root "scripts\vercel-env-tmp.txt")
$dbUrl = $lines[0].Trim()
$directUrl = $lines[1].Trim()
$secret = $lines[2].Trim()

$vars = @{
  "DATABASE_URL" = $dbUrl
  "DIRECT_URL" = $directUrl
  "NEXTAUTH_SECRET" = $secret
  "NEXTAUTH_URL" = $PROD_URL
  "NEXT_PUBLIC_APP_URL" = $PROD_URL
  "STORAGE_PROVIDER" = "local"
}

foreach ($key in $vars.Keys) {
  Write-Host "Setting $key..."
  npx vercel env rm $key production --yes 2>$null
  $vars[$key] | npx vercel env add $key production 2>&1 | Out-Host
}

Write-Host "All env vars configured."
