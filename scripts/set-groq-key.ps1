# Enregistre la clé Groq dans .env sans l'afficher à l'écran.
# Usage (dans le dossier du projet) : powershell -ExecutionPolicy Bypass -File scripts\set-groq-key.ps1
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path (Split-Path $PSScriptRoot -Parent) ".env.example") $envFile }

$secure = Read-Host "Collez votre cle Groq (rien ne s'affiche, c'est normal) puis appuyez sur Entree" -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()

if ($key -notmatch '^gsk_[A-Za-z0-9]+$') {
  Write-Host "Ce n'est pas une cle Groq (elle doit commencer par gsk_). Rien n'a ete modifie." -ForegroundColor Red
  exit 1
}

$lines = [IO.File]::ReadAllLines($envFile)
if ($lines -match '^GROQ_API_KEY=') {
  $lines = $lines -replace '^GROQ_API_KEY=.*', "GROQ_API_KEY=$key"
} else {
  $lines += "GROQ_API_KEY=$key"
}
[IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding $false))
Write-Host "Cle enregistree dans .env ($($key.Length) caracteres). Le serveur redemarre tout seul." -ForegroundColor Green
