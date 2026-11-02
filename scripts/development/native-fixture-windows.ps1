param([Parameter(Mandatory=$true)][ValidateSet('prepare','run','cleanup','security')][string]$Operation,[Parameter(Mandatory=$true)][string]$State,[string]$Request)
$ErrorActionPreference = 'Stop'
$s = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $s.runId -ne $env:GITHUB_RUN_ID -or $s.runAttempt -ne $env:GITHUB_RUN_ATTEMPT) { throw 'Native isolation is limited to its disposable CI job' }
$rootSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$systemSid = 'S-1-5-18'
$adminSid = 'S-1-5-32-544'

function Protect-Directory([string]$Path,[string]$Sid,[string]$Rights) {
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetAccessRuleProtection($true,$false)
  foreach ($owner in @($rootSid,$systemSid,$adminSid)) {
    $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($owner,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
  }
  if ($Sid) { $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($Sid,$Rights,'ContainerInherit,ObjectInherit','None','Allow'))) }
  Set-Acl -LiteralPath $Path -AclObject $acl
}
function Require-OwnedAccount {
  $user = Get-LocalUser -Name $s.user -ErrorAction Stop
  if ($user.SID.Value -ne $s.sid -or $user.Description -ne "native-fixture:$($s.id)") { throw 'Isolation account identity changed' }
  return $user
}
function Stop-OwnedProcesses {
  $null = Require-OwnedAccount
  foreach ($process in @(Get-CimInstance Win32_Process)) {
    $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid -ErrorAction SilentlyContinue
    if ($owner.Sid -eq $s.sid) {
      try {
        $live = [Diagnostics.Process]::GetProcessById($process.ProcessId)
        $null = $live.Handle
        if ($live.StartTime.ToUniversalTime() -eq $process.CreationDate.ToUniversalTime()) { $live.Kill() }
      } catch { } finally { if($live) { $live.Dispose(); $live=$null } }
    }
  }
  $deadline=(Get-Date).AddSeconds(10)
  do {
    $remaining=@(Get-CimInstance Win32_Process | Where-Object { (Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid -ErrorAction SilentlyContinue).Sid -eq $s.sid })
    if($remaining.Count -eq 0) { return }
    Start-Sleep -Milliseconds 200
  } while((Get-Date) -lt $deadline)
  throw 'Native fixture processes survived account cleanup'
}
function Enable-Defender {
  Set-MpPreference -DisableRealtimeMonitoring $false
  $deadline = (Get-Date).AddSeconds(30)
  do {
    if ((Get-MpComputerStatus).RealTimeProtectionEnabled) { return }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  throw 'Defender real-time protection is required'
}
function Prepare-Account {
  Enable-Defender
  if(@(Get-MpThreatDetection).Count -gt 0) { throw 'Disposable runner has Defender detections; quarantine and security review are required' }
  if ($s.user -notmatch '^nf[0-9a-f]{12}$') { throw 'Invalid isolation account name' }
  $bytes = New-Object byte[] 48
  $random = [Security.Cryptography.RandomNumberGenerator]::Create(); $random.GetBytes($bytes); $random.Dispose()
  $password = ConvertTo-SecureString ([Convert]::ToBase64String($bytes)) -AsPlainText -Force
  $user = New-LocalUser -Name $s.user -Password $password -Description "native-fixture:$($s.id)" -AccountNeverExpires
  Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $user
  $s | Add-Member -Force NoteProperty sid $user.SID.Value
  Protect-Directory $s.control '' ''
  $credential = New-Object Management.Automation.PSCredential("$env:COMPUTERNAME\$($s.user)",$password)
  $credential | Export-Clixml -LiteralPath (Join-Path $s.control 'account.credential.xml')
  # Security: the transport/runner profile is never readable by the new workload identity.
  $deny = New-Object Security.AccessControl.FileSystemAccessRule($s.sid,'ReadAndExecute','ContainerInherit,ObjectInherit','None','Deny')
  $acl = Get-Acl -LiteralPath $s.runnerHome; $acl.AddAccessRule($deny); Set-Acl -LiteralPath $s.runnerHome -AclObject $acl
  $tempAcl = Get-Acl -LiteralPath $s.runnerTemp; $tempAcl.AddAccessRule($deny); Set-Acl -LiteralPath $s.runnerTemp -AclObject $tempAcl
  $agentDirs = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(Agent|Runner)\.(Worker|Listener)\.exe$' -and $_.ExecutablePath } | ForEach-Object { $path=Split-Path -Parent $_.ExecutablePath; if((Split-Path -Leaf $path) -eq 'bin') { Split-Path -Parent $path } else { $path } } | Sort-Object -Unique)
  if($agentDirs.Count -eq 0) { throw 'Cannot identify the privileged runner installation' }
  foreach($path in $agentDirs) { $agentAcl=Get-Acl -LiteralPath $path; $agentAcl.AddAccessRule($deny); Set-Acl -LiteralPath $path -AclObject $agentAcl }
  # Security: source, modules and privileged orchestration stay immutable to the workload.
  Protect-Directory $s.repo $s.sid 'ReadAndExecute'
  Protect-Directory $s.work $s.sid 'Modify'
  foreach ($output in $s.outputs) { Protect-Directory $output $s.sid 'Modify' }
  # Security: only individual request/receipt files are shared from the otherwise private controller.
  $sddl = "D:(A;;CC;;;$($s.sid))"
  New-NetFirewallRule -Name $s.rule -DisplayName $s.rule -Direction Outbound -Action Block -Enabled True -Profile Any -LocalUser $sddl -RemoteAddress @('0.0.0.0-126.255.255.255','128.0.0.0-255.255.255.255','::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff') | Out-Null
  $s | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $State -Encoding UTF8
}
function Share-Request([string]$Path) {
  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true,$false)
  foreach ($owner in @($rootSid,$systemSid,$adminSid)) { $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($owner,'FullControl','Allow'))) }
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($s.sid,'ReadAndExecute','Allow')))
  Set-Acl -LiteralPath $Path -AclObject $acl
}
function Run-Request {
  $null = Require-OwnedAccount
  if (-not (Get-MpComputerStatus).RealTimeProtectionEnabled) { throw 'Defender protection was lost' }
  $requestPlan = Get-Content -Raw -LiteralPath $Request | ConvertFrom-Json
  foreach ($file in @($Request,$s.receipt,$s.bridge,$requestPlan.worker)) { if(Test-Path -LiteralPath $file) { Share-Request $file } }
  foreach ($argument in $requestPlan.command) {
    if ((Test-Path -LiteralPath $argument -PathType Leaf) -and $argument.StartsWith($s.control,[StringComparison]::OrdinalIgnoreCase)) { Share-Request $argument }
  }
  $credential = Import-Clixml -LiteralPath (Join-Path $s.control 'account.credential.xml')
  $name = "native-fixture-$($s.id)-$([Guid]::NewGuid().ToString('N'))"
  $arguments = "-NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File `"$($s.bridge)`" -Request `"$Request`""
  $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument $arguments -WorkingDirectory $s.repo
  $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 35) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $name -Action $action -Settings $settings -User $credential.UserName -Password $credential.GetNetworkCredential().Password -RunLevel Limited | Out-Null
  try {
    Start-ScheduledTask -TaskName $name
    $deadline = (Get-Date).AddMinutes(35); $outSeen=0; $errSeen=0
    do {
      foreach($pair in @(@($requestPlan.stdout,'out'),@($requestPlan.stderr,'err'))) {
        if(Test-Path -LiteralPath $pair[0]) {
          $text = [IO.File]::ReadAllText($pair[0])
          if($pair[1] -eq 'out' -and $text.Length -gt $outSeen) { [Console]::Out.Write($text.Substring($outSeen)); $outSeen=$text.Length }
          if($pair[1] -eq 'err' -and $text.Length -gt $errSeen) { [Console]::Error.Write($text.Substring($errSeen)); $errSeen=$text.Length }
        }
      }
      if(Test-Path -LiteralPath $requestPlan.completed) { return }
      $task = Get-ScheduledTask -TaskName $name
      if($task.State -ne 'Running' -and (Get-ScheduledTaskInfo -TaskName $name).LastRunTime -gt (Get-Date).AddMinutes(-35)) { throw 'Isolated task ended without a completion record' }
      Start-Sleep -Milliseconds 250
    } while((Get-Date) -lt $deadline)
    throw 'Isolated native workload exceeded its deadline'
  } finally { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue }
}

function Check-NativeSecurity {
  if (-not (Get-MpComputerStatus).RealTimeProtectionEnabled) { throw 'Defender real-time protection was lost' }
  foreach($path in @((Join-Path $s.workspace 'native/terminal-host/target/debug'),(Join-Path $s.workspace 'dist/native'),(Join-Path $s.repo '.artifacts/process-guardian'),(Join-Path $s.repo '.artifacts/terminal-host'),(Join-Path $s.repo '.artifacts/terminal-vt'))) {
    if(Test-Path -LiteralPath $path) {
      & "$env:ProgramFiles\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3 -File $path
      if($LASTEXITCODE -ne 0) { throw 'Defender scan failed or reported a threat' }
    }
  }
  $start = [DateTime]::Parse($s.startedAt).ToUniversalTime()
  $detections = @(Get-MpThreatDetection | Where-Object { $_.InitialDetectionTime.ToUniversalTime() -ge $start -or $_.LastThreatStatusChangeTime.ToUniversalTime() -ge $start })
  if($detections.Count -gt 0) { throw 'Defender detected a threat; keep quarantine and require security review' }
}
switch($Operation) {
  'security' { Check-NativeSecurity }
  'prepare' { Prepare-Account }
  'run' { Run-Request }
  'cleanup' {
    if (-not $s.sid) {
      $created = Get-LocalUser -Name $s.user -ErrorAction SilentlyContinue
      if($created -and $created.Description -eq "native-fixture:$($s.id)") { $s | Add-Member -Force NoteProperty sid $created.SID.Value }
    }
    if ($s.sid) { Stop-OwnedProcesses; Remove-NetFirewallRule -Name $s.rule -ErrorAction Stop; Remove-LocalUser -Name $s.user }
  }
}
