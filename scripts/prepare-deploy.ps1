$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)
$artifact = Join-Path $PWD 'deploy'
if (Test-Path $artifact) { throw 'deploy already exists; use a clean checkout to avoid packaging stale files.' }

# Parse before packaging: leading whitespace before the declaration is invalid XML.
$configPath = Join-Path $PWD 'web.config'
$xml = [System.Xml.XmlDocument]::new()
$xml.Load($configPath)
if ($xml.configuration.'system.webServer'.handlers.add.path -ne 'run.cjs') {
  throw 'IIS handler does not match the startup file'
}
node scripts/prepare-deploy.mjs
if ($LASTEXITCODE -ne 0) { throw 'Production artifact preparation failed' }
