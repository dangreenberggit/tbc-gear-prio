# Load monitor for the ticket 542 timing runs (plan "Load control for timing
# runs"). Each sample appends one JSON line to -Out:
#   {t, backendPid, backendCpuS, machineLoadPct, own, foreign: [{pid, name, localPort}]}
# t is Unix epoch ms, so replay.mjs can line samples up with the page's
# Date.now() at the Run click.
#
# A client socket to :3333 is "own" when its process is -ChromePid or a
# descendant of it (Chrome's network service is a child of the browser
# process), and "foreign" otherwise.
#
# -GateSeconds G > 0: sample for G seconds, then exit 0 only if the backend's
# CPU time rose by less than 1.0 s and no sample saw a foreign socket; exit 1
# otherwise. Exit 2 if nothing listens on 3333. With G = 0, sample until
# killed.
param(
  [Parameter(Mandatory = $true)][int]$ChromePid,
  [Parameter(Mandatory = $true)][string]$Out,
  [double]$IntervalS = 2,
  [double]$GateSeconds = 0
)
$ErrorActionPreference = 'Stop'

function Get-BackendPid {
  $l = Get-NetTCPConnection -State Listen -LocalPort 3333 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($l) { return [int]$l.OwningProcess }
  return $null
}

function Get-OwnSet([int]$root) {
  $children = @{}
  foreach ($p in (Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId)) {
    $pp = [int]$p.ParentProcessId
    if (-not $children.ContainsKey($pp)) { $children[$pp] = New-Object System.Collections.Generic.List[int] }
    $children[$pp].Add([int]$p.ProcessId)
  }
  $set = New-Object 'System.Collections.Generic.HashSet[int]'
  $queue = New-Object 'System.Collections.Generic.Queue[int]'
  [void]$set.Add($root)
  $queue.Enqueue($root)
  # The set check stops a loop through a parent id that Windows reused.
  while ($queue.Count -gt 0) {
    $x = $queue.Dequeue()
    if ($children.ContainsKey($x)) {
      foreach ($c in $children[$x]) { if ($set.Add($c)) { $queue.Enqueue($c) } }
    }
  }
  return , $set
}

function Get-Sample {
  $backendPid = Get-BackendPid
  if ($null -eq $backendPid) { return $null }
  $cpu = (Get-Process -Id $backendPid).TotalProcessorTime.TotalSeconds
  $load = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  $ownSet = Get-OwnSet $ChromePid
  $own = 0
  $foreign = @()
  foreach ($c in @(Get-NetTCPConnection -State Established -RemotePort 3333 -ErrorAction SilentlyContinue)) {
    $procId = [int]$c.OwningProcess
    if ($ownSet.Contains($procId)) { $own++; continue }
    $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    $foreign += [pscustomobject]@{ pid = $procId; name = $name; localPort = [int]$c.LocalPort }
  }
  return [pscustomobject]@{
    t              = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    backendPid     = $backendPid
    backendCpuS    = $cpu
    machineLoadPct = $load
    own            = $own
    foreign        = $foreign
  }
}

function Write-Sample($s) {
  $line = $s | ConvertTo-Json -Compress -Depth 4
  [System.IO.File]::AppendAllText($Out, $line + "`n")
}

$start = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$firstCpu = $null
$lastCpu = $null
$foreignSeen = $false
while ($true) {
  $s = Get-Sample
  if ($null -eq $s) { exit 2 }
  Write-Sample $s
  if ($null -eq $firstCpu) { $firstCpu = $s.backendCpuS }
  $lastCpu = $s.backendCpuS
  if ($s.foreign.Count -gt 0) { $foreignSeen = $true }
  if ($GateSeconds -gt 0 -and ($s.t - $start) -ge $GateSeconds * 1000) {
    if (($lastCpu - $firstCpu) -lt 1.0 -and -not $foreignSeen) { exit 0 }
    exit 1
  }
  Start-Sleep -Milliseconds ([int]($IntervalS * 1000))
}
