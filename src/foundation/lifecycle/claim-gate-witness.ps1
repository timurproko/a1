param([string]$Mode, [string]$Name, [int]$Target, [string]$Directory)
$ErrorActionPreference = 'Stop'
if ($Mode -eq 'volume') {
  $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($Directory)))
  if ($drive.DriveType -ne [IO.DriveType]::Fixed -or $drive.DriveFormat -ne 'NTFS') { throw 'gate recovery requires a local fixed NTFS volume' }
  'supported'
  exit
}
if ($Mode -eq 'launch') {
  Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-File',('"'+$PSCommandPath+'"'),'observe',('"'+$Name+'"'),$Target,('"'+$Directory+'"'))
  exit
}
trap { if ($Directory) { [IO.File]::AppendAllText((Join-Path $Directory 'observer.log'),($_ | Out-String)) }; exit 1 }
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class GateWitness {
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateJobObject(IntPtr a, string n);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr OpenJobObject(uint a, bool inherit, string n);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint a, bool inherit, uint pid);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr j, int c, IntPtr b, uint l, out uint r);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool DuplicateHandle(IntPtr from, IntPtr value, IntPtr to, out IntPtr copy, uint access, bool inherit, uint flags);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool IsProcessInJob(IntPtr p, IntPtr j, out bool member);
 [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr p, int c, IntPtr b, uint l, out uint r);
 public static IntPtr[] RetainJobs(IntPtr process) {
  int size=1048576; var b=Marshal.AllocHGlobal(size); var held=new System.Collections.Generic.List<IntPtr>();
  try { uint n; if(NtQueryInformationProcess(process,51,b,(uint)size,out n)!=0)throw new Exception("process handle snapshot unavailable"); long count=Marshal.ReadIntPtr(b).ToInt64(); int stride=IntPtr.Size*3+16; if(count<0 || count>(size-IntPtr.Size*2)/stride)throw new Exception("handle snapshot overflow");
   for(int i=0;i<count;i++) { var source=Marshal.ReadIntPtr(b,IntPtr.Size*2+i*stride); IntPtr copy; if(!DuplicateHandle(process,source,GetCurrentProcess(),out copy,0,false,2))continue; bool keep=false; try { bool member; if(IsProcessInJob(process,copy,out member) && member) { Members(copy); held.Add(copy);keep=true; } } finally {if(!keep)CloseHandle(copy);} }
   if(held.Count==0)throw new Exception("Node job references unavailable");return held.ToArray();
  } catch {foreach(var h in held)CloseHandle(h);throw;} finally {Marshal.FreeHGlobal(b);}
 }
 [DllImport("ntdll.dll")] static extern int NtQuerySystemInformation(int c, IntPtr b, uint l, out uint r);
 public static string Boot() { var b=Marshal.AllocHGlobal(64); try { uint n; if(NtQuerySystemInformation(90,b,64,out n)!=0) throw new Exception("boot identity unavailable"); var v=new byte[16]; Marshal.Copy(b,v,0,16); var guid=new Guid(v); if(guid==Guid.Empty)throw new Exception("empty boot identity"); return guid.ToString(); } finally { Marshal.FreeHGlobal(b); } }
 public static long[] Members(IntPtr job) { var b=Marshal.AllocHGlobal(65536); try { uint n; if(!QueryInformationJobObject(job,3,b,65536,out n))throw new Win32Exception(); int assigned=Marshal.ReadInt32(b), count=Marshal.ReadInt32(b,4); if(count<0 || count!=assigned || count>4096)throw new Exception("job membership overflow"); var result=new long[count]; for(int i=0;i<count;i++)result[i]=Marshal.ReadIntPtr(b,8+i*IntPtr.Size).ToInt64();return result; } finally {Marshal.FreeHGlobal(b);} }
 public static void Check(bool success) { if(!success)throw new Win32Exception(); }
}
'@
$boot = [GateWitness]::Boot()
if ($Mode -eq 'inspect') {
  $job = [GateWitness]::OpenJobObject(4, $false, $Name)
  if ($job -eq [IntPtr]::Zero) {
    if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -ne 2) { throw 'job cannot be inspected' }
    @{boot=$boot; members=@(); present=$false} | ConvertTo-Json -Compress
  } else {
    try { @{boot=$boot; members=@([GateWitness]::Members($job)); present=$true} | ConvertTo-Json -Compress }
    finally { [void][GateWitness]::CloseHandle($job) }
  }
  exit
}
function Publish([string]$file, [object]$value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($value | ConvertTo-Json -Compress))
  $stream = [IO.File]::Open(($file+'.next'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try { $stream.Write($bytes,0,$bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
  [IO.File]::Move(($file+'.next'),$file)
}
$job = [GateWitness]::CreateJobObject([IntPtr]::Zero,$Name)
if ($job -eq [IntPtr]::Zero) { throw 'job cannot be created' }
if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 183) { [void][GateWitness]::CloseHandle($job); throw 'job name collision' }
try {
  $process = [GateWitness]::OpenProcess(0x541,$false,$Target)
  if ($process -eq [IntPtr]::Zero) { throw 'holder cannot be opened' }
  try {
    $retained = @([GateWitness]::RetainJobs($process))
    [GateWitness]::Check([GateWitness]::AssignProcessToJobObject($job,$process))
  }
  finally { [void][GateWitness]::CloseHandle($process) }
  if (@([GateWitness]::Members($job)) -notcontains [long]$Target) { throw 'holder job assignment not verified' }
  $proof = @{schema='claim-gate-witness-v1'; job=$Name; boot=$boot; holder=$Target; observer=$PID}
  Publish (Join-Path $Directory 'ready.json') $proof
  while (@([GateWitness]::Members($job)).Length -ne 0) { Start-Sleep -Milliseconds 50 }
  Publish (Join-Path $Directory 'stopped.json') $proof
} finally { foreach ($handle in $retained) { [void][GateWitness]::CloseHandle($handle) }; [void][GateWitness]::CloseHandle($job) }
