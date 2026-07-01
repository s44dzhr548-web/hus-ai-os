#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy Menu OS to Vercel with Neon env vars.
.USAGE
  1. Paste Neon URL in .env.neon
  2. npx vercel login   (once)
  3. .\scripts\deploy-vercel.ps1
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

& "$Root\scripts\setup-neon.ps1"

$neonUrl = (Get-Content "$Root\.env.neon" | Where-Object { $_ -match '^postgresql://' } | Select-Object -First 1).Trim()
$secret = (Get-Content "$Root\.env" | Where-Object { $_ -match 'NEXTAUTH_SECRET=' } | ForEach-Object { $_ -replace 'NEXTAUTH_SECRET="([^"]+)".*','$1' })

Write-Host "Deploying to Vercel..."
npx vercel deploy --prod --yes `
  -e "DATABASE_URL=$neonUrl" `
  -e "DIRECT_URL=$neonUrl" `
  -e "NEXTAUTH_SECRET=$secret" `
  -e "STORAGE_PROVIDER=local" `
  -e "NEXT_PUBLIC_APP_URL=https://menu-os.vercel.app" `
  -e "NEXTAUTH_URL=https://menu-os.vercel.app"

Write-Host "Update NEXT_PUBLIC_APP_URL and NEXTAUTH_URL to your actual Vercel domain after deploy."
