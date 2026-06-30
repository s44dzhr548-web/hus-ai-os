param(
  [string]$GitHubRepoUrl = ""
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Opening platform login pages..." -ForegroundColor Cyan
Start-Process "https://github.com/login"
Start-Process "https://github.com/new?name=hus-ai-os"
Start-Process "https://vercel.com/login"
Start-Process "https://supabase.com/dashboard"

if ($GitHubRepoUrl) {
  Push-Location $Root
  git remote remove origin 2>$null
  git remote add origin $GitHubRepoUrl
  Write-Host "Remote added. Pushing (browser OAuth may open)..." -ForegroundColor Yellow
  git push -u origin main
  Pop-Location
} else {
  Write-Host ""
  Write-Host "After creating GitHub repo, run:" -ForegroundColor Yellow
  Write-Host '  .\scripts\connect-platforms.ps1 -GitHubRepoUrl "https://github.com/USER/hus-ai-os.git"'
  Write-Host ""
  Write-Host "See docs/platform-connect.md for full steps."
}

Write-Host "Starting Vercel login (browser)..." -ForegroundColor Cyan
Push-Location "$Root\restaurant-os"
npx vercel login
Pop-Location
