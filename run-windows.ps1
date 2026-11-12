$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  Write-Host 'Node.js 20 or newer is required. Install it from https://nodejs.org, reopen PowerShell, and run this script again.' -ForegroundColor Yellow
  exit 1
}
$major = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($major -lt 20) { throw 'Node.js 20 or newer is required.' }
if (-not (Test-Path 'node_modules/electron')) {
  Write-Host 'Installing the desktop app dependencies on this device…' -ForegroundColor Cyan
  npm install
}
npm start
