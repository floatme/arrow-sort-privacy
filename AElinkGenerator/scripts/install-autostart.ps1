param(
  [Parameter(Mandatory = $true)][string]$TaskName,
  [Parameter(Mandatory = $true)][string]$StartBat
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $StartBat)) {
  throw "start-all.bat not found: $StartBat"
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$StartBat`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
# Delay so Wi-Fi / Chrome / Cloudflare are ready after sign-in
$trigger.Delay = "PT30S"

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Write-Host "Scheduled task registered: $TaskName"
Write-Host "Runs at logon (+30s) as $env:USERNAME"
