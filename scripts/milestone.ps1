param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "==> HUSAI-OS Milestone: $Message" -ForegroundColor Cyan

# Build Restaurant OS
Write-Host "==> Building Restaurant OS..." -ForegroundColor Yellow
Push-Location "$Root\restaurant-os"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-key-for-ci-build"
npm run lint
npm run build
Pop-Location

# Meta repo git
Push-Location $Root
if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add -A
$status = git status --porcelain
if ($status) {
  git commit -m $Message
  Write-Host "==> Committed: $Message" -ForegroundColor Green
} else {
  Write-Host "==> Nothing to commit" -ForegroundColor Gray
}

# Restaurant OS nested repo
if (Test-Path "$Root\restaurant-os\.git") {
  Push-Location "$Root\restaurant-os"
  git add -A
  $rosStatus = git status --porcelain
  if ($rosStatus) {
    git commit -m $Message
    Write-Host "==> Restaurant OS committed" -ForegroundColor Green
  }
  Pop-Location
}

# Push if remotes exist
Push-Location $Root
$remote = git remote 2>$null
if ($remote) {
  git push -u origin main 2>$null
  if ($LASTEXITCODE -eq 0) { Write-Host "==> Meta repo pushed" -ForegroundColor Green }
}

if (Test-Path "$Root\restaurant-os\.git") {
  Push-Location "$Root\restaurant-os"
  $rosRemote = git remote 2>$null
  if ($rosRemote) {
    git push -u origin main 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "==> Restaurant OS pushed" -ForegroundColor Green }
  }
  Pop-Location
}

Write-Host "==> Milestone complete" -ForegroundColor Cyan
