$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  'index.html',
  'styles.css',
  'prototype.js',
  'idle.html',
  'connecting.html',
  'offline.html'
)

foreach ($file in $requiredFiles) {
  $path = Join-Path $prototypeRoot $file
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing required prototype file: $file"
  }
}

$html = Get-Content -Raw -Encoding UTF8 (Join-Path $prototypeRoot 'index.html')
$styles = Get-Content -Raw -Encoding UTF8 (Join-Path $prototypeRoot 'styles.css')
$script = Get-Content -Raw -Encoding UTF8 (Join-Path $prototypeRoot 'prototype.js')

$htmlFragments = @(
  'id="device-page"',
  'id="printer-status-panel"',
  'id="status-reference"',
  'id="connecting-spinner"',
  'id="timelapse-panel"',
  'id="timelapse-image"',
  'id="idle-task-panel"',
  'id="state-only-task"',
  'id="task-state"',
  'id="content-reference-screen"',
  'id="content-reference-image"',
  'id="content-device-back"',
  'class="filament-panel"',
  'id="filament-sheet"',
  'id="filament-sheet-close"',
  'class="sheet-slots"',
  'id="feed-filament"',
  'id="retract-filament"',
  'id="filament-operation-screen"',
  'id="filament-operation-image"',
  'id="close-filament-operation"',
  'id="cancel-filament-operation"',
  'id="control-carousel"',
  'class="bottom-nav"',
  'id="bottom-nav-reference"',
  'class="bottom-nav-hotspots"',
  'aria-live="polite"'
)

foreach ($fragment in $htmlFragments) {
  if (-not $html.Contains($fragment)) {
    throw "index.html is missing contract fragment: $fragment"
  }
}

$scriptFragments = @(
  'const STATE_CONFIG',
  "idle:",
  "connecting:",
  "offline:",
  'statusImage:',
  'timelapseImage:',
  'showIdleTask: true',
  'showIdleTask: false',
  'URLSearchParams',
  "dataset.state",
  'openContentReference',
  'closeContentReference'
)

foreach ($fragment in $scriptFragments) {
  if (-not $script.Contains($fragment)) {
    throw "prototype.js is missing contract fragment: $fragment"
  }
}

if ($styles -notmatch '@keyframes\s+connecting-spin') {
  throw 'styles.css must define the connecting spinner animation.'
}

if ($styles -notmatch '@keyframes\s+filament-sheet-rise') {
  throw 'styles.css must define the bottom-up filament sheet animation.'
}

if ($styles -notmatch '\[hidden\]\s*\{\s*display:\s*none') {
  throw 'styles.css must reliably hide non-applicable state content.'
}

foreach ($fragment in @('openFilamentSheet', 'closeFilamentSheet', 'sheet-open')) {
  if (-not $script.Contains($fragment)) {
    throw "prototype.js is missing filament sheet behavior: $fragment"
  }
}

foreach ($fragment in @('openFilamentOperation', 'cancelFilamentOperation', "closeFilamentOperationButton.addEventListener('click', cancelFilamentOperation)", 'syncSheetSlots')) {
  if (-not $script.Contains($fragment)) {
    throw "prototype.js is missing filament operation behavior: $fragment"
  }
}

$entryContracts = @{
  'idle.html' = 'state=idle'
  'connecting.html' = 'state=connecting'
  'offline.html' = 'state=offline'
}

foreach ($entry in $entryContracts.GetEnumerator()) {
  $content = Get-Content -Raw -Encoding UTF8 (Join-Path $prototypeRoot $entry.Key)
  if (-not $content.Contains($entry.Value)) {
    throw "$($entry.Key) must open index.html with $($entry.Value)."
  }
}

Write-Output 'Prototype contract passed.'
