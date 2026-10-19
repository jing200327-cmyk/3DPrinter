$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "Prototype entry is missing: $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8

$requiredFragments = @(
    'id="printer-switch"',
    'id="printer-settings"',
    'id="timelapse-placeholder"',
    'id="task-panel"',
    'id="queue-toggle"',
    'id="print-queue"',
    'id="pause-print"',
    'id="cancel-print"',
    'id="feed-filament"',
    'id="retract-filament"',
    'id="control-carousel"',
    'data-control="cabin-light"',
    'data-control="outer-light"',
    'data-control="fan"',
    'data-control="sound"',
    'aria-expanded="false"',
    'aria-live="polite"'
)

foreach ($fragment in $requiredFragments) {
    if (-not $html.Contains($fragment)) {
        throw "Required prototype contract is missing: $fragment"
    }
}

if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Prototype behavior script is missing: $scriptPath"
}

$script = Get-Content -LiteralPath $scriptPath -Raw -Encoding UTF8
$requiredBehaviors = @(
    "queueToggle.addEventListener('click'",
    "pauseButton.addEventListener('click'",
    "cancelButton.addEventListener('click'",
    "carousel.addEventListener('scroll'",
    "switchButton.addEventListener('click'",
    "dialog.showModal()"
)

foreach ($behavior in $requiredBehaviors) {
    if (-not $script.Contains($behavior)) {
        throw "Required prototype behavior is missing: $behavior"
    }
}

$controlCount = ([regex]::Matches($html, 'data-control="(?:cabin-light|outer-light|fan|sound)"')).Count
if ($controlCount -ne 4) {
    throw "Expected exactly four carousel control items, found $controlCount"
}

Write-Host 'Prototype contract checks passed.'
