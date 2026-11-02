param([Parameter(Mandatory=$true)][string]$Request)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -Raw -LiteralPath $Request | ConvertFrom-Json
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -or $identity.User.Value -ne $plan.sid) { throw 'Native workload must use its dedicated non-administrator account' }
try {
  # Security: no ambient runner token, SSH socket, proxy, special GitHub file or deployment credential crosses this boundary.
  $start = New-Object Diagnostics.ProcessStartInfo
  $start.FileName = $plan.node
  $start.WorkingDirectory = $plan.repo
  $start.UseShellExecute = $false
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.EnvironmentVariables.Clear()
  foreach ($property in $plan.environment.psobject.Properties) { $start.EnvironmentVariables[$property.Name] = [string]$property.Value }
  $start.EnvironmentVariables['NATIVE_FIXTURE_LOW_PRIVILEGE'] = 'verified'
  $start.Arguments = '"' + $plan.worker.Replace('"','\"') + '" "' + $Request.Replace('"','\"') + '"'
  $process = New-Object Diagnostics.Process
  $process.StartInfo = $start
  if (-not $process.Start()) { throw 'Native worker did not start' }
  $stdout = [IO.File]::Open($plan.stdout,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
  $stderr = [IO.File]::Open($plan.stderr,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
  try {
    $outCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errCopy = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $process.WaitForExit()
    [Threading.Tasks.Task]::WaitAll(@($outCopy,$errCopy))
    if ($process.ExitCode -ne 0 -and -not (Test-Path -LiteralPath $plan.result)) { throw "Native worker exited $($process.ExitCode) without a result" }
  } finally { $stdout.Dispose(); $stderr.Dispose(); $process.Dispose() }
} catch {
  @{ exitCode=1; error='ISOLATED_WORKER_FAILURE' } | ConvertTo-Json | Set-Content -LiteralPath $plan.result -Encoding UTF8
  throw
} finally {
  [IO.File]::WriteAllText($plan.completed,'complete')
}
