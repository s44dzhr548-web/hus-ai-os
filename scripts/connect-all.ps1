param(
  [switch]$Push,
  [switch]$Deploy
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $Root ".env.husai-core"

if (-not (Test-Path $envFile)) {
  Write-Host "Missing .env.husai-core — copy from .env.husai-core.example" -ForegroundColor Red
  Write-Host "Get keys: Supabase Dashboard → husai-core → Settings → API" -ForegroundColor Yellow
  exit 1
}

Write-Host "==> Connecting husai-core..." -ForegroundColor Cyan
node "$Root\scripts\connect-husai-core.js"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Push) {
  $content = Get-Content $envFile -Raw
  if ($content -match 'GITHUB_REPO_URL=(.+)') {
    $repo = $Matches[1].Trim()
    Push-Location $Root
    git remote remove origin 2>$null
    git remote add origin $repo
    Write-Host "==> Pushing to GitHub (browser OAuth may open)..." -ForegroundColor Yellow
    git push -u origin main
    Pop-Location
  }
}

if ($Deploy) {
  Push-Location "$Root\restaurant-os"
  Write-Host "==> Deploying restaurant-os to Vercel..." -ForegroundColor Yellow
  npx vercel --prod --yes
  Pop-Location
}

Write-Host "==> Done" -ForegroundColor Green
