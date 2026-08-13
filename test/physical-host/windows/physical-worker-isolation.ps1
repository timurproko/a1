Set-StrictMode -Version Latest

function Assert-AddOnePhysicalWorkerIsolation {
  param(
    [string]$AttestationPath,
    [Parameter(Mandatory = $true)][string]$RepositoryRoot
  )

  if ([string]::IsNullOrWhiteSpace($AttestationPath)) {
    $AttestationPath = $env:ADDONE_PHYSICAL_ISOLATION_ATTESTATION
  }
  if ([string]::IsNullOrWhiteSpace($AttestationPath)) {
    throw "physical-host isolation is unproven: ADDONE_PHYSICAL_ISOLATION_ATTESTATION is not set"
  }

  $resolvedAttestation = [IO.Path]::GetFullPath($AttestationPath)
  $resolvedRepository = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  if ($resolvedAttestation.StartsWith("$resolvedRepository$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "physical-host isolation is unproven: attestation must be provisioned outside the repository"
  }
  if (-not (Test-Path -LiteralPath $resolvedAttestation -PathType Leaf)) {
    throw "physical-host isolation is unproven: attestation file does not exist"
  }

  try {
    $attestation = Get-Content -LiteralPath $resolvedAttestation -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    throw "physical-host isolation is unproven: attestation is not valid JSON"
  }

  if ($attestation.schema -ne "addone-physical-worker-isolation-v1") { throw "physical-host isolation is unproven: unsupported attestation schema" }
  if ($attestation.platform -ne "windows") { throw "physical-host isolation is unproven: worker platform is not windows" }
  if ($attestation.workerRole -ne "physical-host-test") { throw "physical-host isolation is unproven: worker role is not physical-host-test" }
  if ($attestation.dedicatedDisposableWorker -ne $true) { throw "physical-host isolation is unproven: worker is not dedicated and disposable" }
  if ($attestation.exclusiveInteractiveDesktop -ne $true) { throw "physical-host isolation is unproven: desktop is not exclusive" }
  if ($attestation.userApplicationsAllowed -ne $false) { throw "physical-host isolation is unproven: user applications are allowed" }
  if ([string]::IsNullOrWhiteSpace($attestation.workerId)) { throw "physical-host isolation is unproven: worker identity is missing" }
  if ([string]::IsNullOrWhiteSpace($attestation.allocationId)) { throw "physical-host isolation is unproven: allocation identity is missing" }
  if ($attestation.machineName -ne $env:COMPUTERNAME) { throw "physical-host isolation is unproven: machine identity does not match" }

  $allocationId = $env:ADDONE_PHYSICAL_WORKER_ALLOCATION_ID
  if ([string]::IsNullOrWhiteSpace($allocationId) -or $attestation.allocationId -ne $allocationId) {
    throw "physical-host isolation is unproven: worker allocation identity does not match"
  }

  $current = Get-Process -Id $PID
  if ([int]$attestation.sessionId -ne $current.SessionId -or $current.SessionId -le 0) {
    throw "physical-host isolation is unproven: interactive session identity does not match"
  }
  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if ($attestation.userSid -ne $currentSid) { throw "physical-host isolation is unproven: worker user identity does not match" }

  try {
    $issuedAt = [DateTimeOffset]::Parse($attestation.issuedAt).ToUniversalTime()
    $expiresAt = [DateTimeOffset]::Parse($attestation.expiresAt).ToUniversalTime()
  } catch {
    throw "physical-host isolation is unproven: attestation validity interval is invalid"
  }
  $now = [DateTimeOffset]::UtcNow
  if ($issuedAt -gt $now.AddMinutes(1) -or $expiresAt -le $now -or $expiresAt -le $issuedAt -or ($expiresAt - $issuedAt).TotalHours -gt 24) {
    throw "physical-host isolation is unproven: attestation is expired or exceeds the 24-hour allocation limit"
  }

  $visibleProcesses = @(Get-Process | Where-Object {
    $_.SessionId -eq $current.SessionId -and $_.Id -ne $PID -and $_.MainWindowHandle -ne [IntPtr]::Zero
  } | ForEach-Object {
    [ordered]@{ pid = $_.Id; startTimeUtc = $_.StartTime.ToUniversalTime().ToString("o"); name = $_.ProcessName }
  })
  if ($visibleProcesses.Count -gt 0) {
    throw "physical-host isolation is unproven: pre-existing visible applications exist on the test desktop"
  }

  return [ordered]@{
    attestationPath = $resolvedAttestation
    attestationSha256 = (Get-FileHash -LiteralPath $resolvedAttestation -Algorithm SHA256).Hash.ToLowerInvariant()
    workerId = $attestation.workerId
    allocationId = $attestation.allocationId
    machineName = $attestation.machineName
    sessionId = $current.SessionId
    userSid = $currentSid
    issuedAt = $issuedAt.ToString("o")
    expiresAt = $expiresAt.ToString("o")
    preExistingVisibleProcesses = $visibleProcesses
  }
}

function Get-AddOneProcessStartIdentity {
  param([Parameter(Mandatory = $true)][int]$ProcessId)
  $process = Get-Process -Id $ProcessId -ErrorAction Stop
  return $process.StartTime.ToUniversalTime().ToString("o")
}

function Test-AddOneProcessStartIdentity {
  param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [Parameter(Mandatory = $true)][string]$StartTimeUtc
  )
  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) { return $false }
  return $process.StartTime.ToUniversalTime().ToString("o") -eq $StartTimeUtc
}
