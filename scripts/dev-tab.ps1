<#
.SYNOPSIS
  Start the WoWSims Upgrades-tab dev servers (Go sim backend + vite frontend)
  from a plain PowerShell terminal.

.DESCRIPTION
  The tab needs two servers running together:
    - A Go sim backend, hardcoded by the frontend to port 3333.
    - A vite frontend on port 5173, serving at http://localhost:5173/tbc/.

  Both live in the gitignored vendor/tbc-new-fork checkout (main checkout
  only). This script is committed in the main repo, so it locates the fork
  relative to its own path rather than assuming a cwd.

  Ambient Node on this machine is fnm-managed and does not reliably resolve
  to 22 for every shim (vite.cmd has been observed running on a stale
  Node 20 even after `fnm use 22` in the same shell). Every Node-touching
  step below runs through `fnm exec --using=22` so the pin is per-command,
  not shell-state-dependent.

  `make` is present on this box (`make --version`), so -Desktop uses it to
  build and run the packaged embedded binary the way the release does. The
  -Backend branch stays a PowerShell port of the equivalent cmd one-liner in
  .claude/launch.json (build steps only, no cmd-isms: no `&&`, no `copy /y`,
  no `type nul`), because it serves `dist/` live from disk for fast frontend
  iteration; -Desktop is the mode that proves the embedded HTTP transport.

.PARAMETER Backend
  Build and run the Go sim backend on the given -BackendPort (default 3333).

.PARAMETER Frontend
  Run the vite dev server on the given -FrontendPort (default 5173).

.PARAMETER Both
  Launch both servers, each in its own separate PowerShell window, so you
  can watch each log and Ctrl+C each independently. (A single window with
  background jobs would merge or hide the logs you actually want to watch
  while iterating — separate windows are the better fit for a solo dev.)

.PARAMETER Desktop
  Build the packaged embedded binary (`make wowsimtbc`) and run it on
  -BackendPort with the **embedded** HTTP transport — without the usefs
  disk-serve flag, so the server serves its embedded net_worker.js rather than
  dist/ from disk. This is the mode `pnpm desktop-gate:check` verifies; use it
  to eyeball the tab on the real desktop transport.

.PARAMETER BackendPort
  Port for the Go backend. Must be 3333 unless you know the frontend proxy
  config also changed — the frontend hardcodes 3333.

.PARAMETER FrontendPort
  Port for vite. Defaults to 5173.

.EXAMPLE
  pnpm tab:dev
    # runs: powershell -File scripts/dev-tab.ps1 -Both

.EXAMPLE
  scripts\dev-tab.ps1 -Backend
  scripts\dev-tab.ps1 -Frontend
#>
[CmdletBinding(DefaultParameterSetName = 'Both')]
param(
    [Parameter(ParameterSetName = 'Backend')]
    [switch]$Backend,

    [Parameter(ParameterSetName = 'Frontend')]
    [switch]$Frontend,

    [Parameter(ParameterSetName = 'Both')]
    [switch]$Both,

    [Parameter(ParameterSetName = 'Desktop')]
    [switch]$Desktop,

    [int]$BackendPort = 3333,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ForkDir = Join-Path $RepoRoot 'vendor\tbc-new-fork'

if (-not (Test-Path $ForkDir)) {
    throw "Fork checkout not found at $ForkDir. This script only works from the main checkout (vendor/ is gitignored)."
}

function Start-Backend {
    param([int]$Port)

    Push-Location $ForkDir
    try {
        Write-Host "[dev-tab] Building wowsims sim backend (port $Port)..." -ForegroundColor Cyan

        $binaryDistTbc = Join-Path $ForkDir 'binary_dist\tbc'
        if (-not (Test-Path $binaryDistTbc)) {
            New-Item -ItemType Directory -Path $binaryDistTbc -Force | Out-Null
        }

        Copy-Item -Path (Join-Path $ForkDir 'sim\web\dist.go.tmpl') `
                  -Destination (Join-Path $ForkDir 'binary_dist\dist.go') `
                  -Force

        # go:embed needs this file to exist even though it stays empty for dev.
        New-Item -ItemType File -Path (Join-Path $binaryDistTbc 'embedded') -Force | Out-Null

        $exeName = if ($Port -eq 3333) { 'wowsimtbc.exe' } else { "wowsimtbc-$Port.exe" }
        & go build -o $exeName ./sim/web
        if ($LASTEXITCODE -ne 0) { throw "go build failed with exit code $LASTEXITCODE" }

        Write-Host "[dev-tab] Starting backend on :$Port..." -ForegroundColor Cyan
        & (Join-Path $ForkDir $exeName) --usefs=true --launch=false --host=":$Port"
    }
    finally {
        Pop-Location
    }
}

function Start-Desktop {
    param([int]$Port)

    Push-Location $ForkDir
    try {
        Write-Host "[dev-tab] Building packaged desktop binary (make wowsimtbc)..." -ForegroundColor Cyan

        # The makefile shells out to POSIX tools (`uname -s`, `realpath`) that
        # live in Git's usr\bin, not on PowerShell's PATH; without them make
        # dies at the devserver step with "CreateProcess(NULL, uname -s) failed".
        # Prepend Git's usr\bin for this build only so make can spawn them. (The
        # -Backend branch hand-rolls the build and sidesteps make, but -Desktop
        # needs make's full binary_dist target to embed the real dist.)
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
        if ($gitCmd) {
            $gitUsrBin = Join-Path (Split-Path (Split-Path $gitCmd.Source -Parent) -Parent) 'usr\bin'
            if (Test-Path (Join-Path $gitUsrBin 'uname.exe')) {
                $env:PATH = "$gitUsrBin;$env:PATH"
            }
        }

        & fnm exec --using=22 -- make wowsimtbc
        if ($LASTEXITCODE -ne 0) { throw "make wowsimtbc failed with exit code $LASTEXITCODE" }

        # Deliberately without the usefs disk-serve flag: the embedded server
        # serves its rewritten net_worker.js (the HTTP transport the desktop
        # gate proves). Serving dist/ live would defeat the gate, so -Desktop
        # must not copy Start-Backend's flag.
        Write-Host "[dev-tab] Starting embedded desktop server on :$Port..." -ForegroundColor Cyan
        & (Join-Path $ForkDir 'wowsimtbc.exe') --launch=false --host=":$Port"
    }
    finally {
        Pop-Location
    }
}

function Start-Frontend {
    param([int]$Port)

    Push-Location $ForkDir
    try {
        Write-Host "[dev-tab] Starting vite dev server on :$Port (Node 22 pinned)..." -ForegroundColor Cyan

        # Bare `vite` / `npx vite` were both "not recognized" in this shell; the
        # local .cmd shim is what actually resolves. `fnm exec` (not `fnm use`)
        # pins Node 22 for this one process regardless of ambient shell state,
        # since ambient fnm state has been observed not sticking for this shim.
        # The config is ours: upstream's plus the fixture plugin.
        $ViteConfig = Join-Path $RepoRoot 'scripts\tab-harness\vite.config.mjs'
        & fnm exec --using=22 -- .\node_modules\.bin\vite.cmd --config $ViteConfig --port $Port
    }
    finally {
        Pop-Location
    }
}

switch ($PSCmdlet.ParameterSetName) {
    'Backend' { Start-Backend -Port $BackendPort }
    'Desktop' { Start-Desktop -Port $BackendPort }
    'Frontend' { Start-Frontend -Port $FrontendPort }
    'Both' {
        Write-Host "[dev-tab] Launching backend and frontend in separate windows..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList @(
            '-NoExit', '-File', $PSCommandPath, '-Backend', '-BackendPort', $BackendPort
        )
        Start-Process powershell -ArgumentList @(
            '-NoExit', '-File', $PSCommandPath, '-Frontend', '-FrontendPort', $FrontendPort
        )
        Write-Host "[dev-tab] Two windows opened. Ctrl+C in each to stop; closing a window stops that server." -ForegroundColor Cyan
        Write-Host "[dev-tab] Frontend will serve at http://localhost:$FrontendPort/tbc/" -ForegroundColor Cyan
    }
}
