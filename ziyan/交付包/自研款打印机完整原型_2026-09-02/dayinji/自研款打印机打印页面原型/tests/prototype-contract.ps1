$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "Prototype entry is missing: $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
$filamentAsset = '../../src/dayinji/' + [char]0x8017 + [char]0x6750 + '.jpg'
$localFileAsset = '../../src/dayinji/' + [char]0x672c + [char]0x5730 + [char]0x6587 + [char]0x4ef6 + '.jpg'
$plateOneFile = [char]0x9009 + [char]0x4e2d + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '1.jpg'
$plateTwoFile = [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '2' + [char]0xff08 + [char]0x4fee + [char]0x6539 + [char]0xff09 + '.jpg'
$plateThreeFile = [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '3.jpg'
$queuePrefix = '' + [char]0x6253 + [char]0x5370 + [char]0x961f + [char]0x5217
$restartText = '' + [char]0x91cd + [char]0x65b0 + [char]0x6253 + [char]0x5370
$localFileToastText = '' + [char]0x5df2 + [char]0x6253 + [char]0x5f00 + [char]0x672c + [char]0x5730 + [char]0x6587 + [char]0x4ef6
$localFileToastBehavior = "showToast('$localFileToastText')"
$preparingCancelPrompt = '' + [char]0x5f53 + [char]0x524d + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x6b63 + [char]0x5728 + [char]0x51c6 + [char]0x5907 + [char]0xff0c + [char]0x662f + [char]0x5426 + [char]0x9700 + [char]0x8981 + [char]0x53d6 + [char]0x6d88 + [char]0xff1f
$cancelledTaskText = '' + [char]0x5df2 + [char]0x53d6 + [char]0x6d88 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1
$requiredFragments = @(
    'id="printer-switch"',
    'id="printer-settings"',
    'id="timelapse-placeholder"',
    'id="task-panel"',
    'id="active-task-image"',
    '5 h 15 min',
    'id="task-state"',
    'id="remaining-time"',
    'id="task-progress"',
    'id="preparation-progress"',
    'id="preparation-spinner"',
    'id="preparation-label"',
    'id="preparation-percent"',
    'id="finish-now"',
    'id="pause-print"',
    'id="cancel-print"',
    'id="queue-toggle"',
    'id="queued-task"',
    'id="queued-task-second"',
    'id="queue-task-image-one"',
    'id="queue-task-image-two"',
    'id="completion-actions"',
    'id="restart-print"',
    'id="local-file"',
    ('>' + $restartText + '</span>'),
    $localFileAsset,
    'id="next-plate"',
    'id="filament-settings"',
    'id="filament-reference"',
    'id="filament-title-mask"',
    'id="filament-pointer-mask"',
    'id="filament-pointer"',
    $filamentAsset,
    'data-slot-index="rack"',
    'id="filament-sheet"',
    'id="feed-filament"',
    'id="retract-filament"',
    'id="filament-operation-screen"',
    'id="filament-operation-image"',
    'id="close-filament-operation"',
    'id="cancel-filament-operation"',
    'id="control-settings"',
    'id="reference-screen"',
    'id="action-dialog"',
    'id="dialog-dismiss"',
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
    'const plateCatalog',
    'const queuePlateIds',
    'const completedPlates',
    'const PREPARATION_DURATION_SECONDS = 30',
    'const PREPARATION_STAGES',
    'advancePreparation',
    "setTaskStatus('preparing')",
    "params.get('completed')",
    '!completedPlates.has(plate)',
    'renderPlateTaskAndQueue',
    $plateOneFile,
    $plateTwoFile,
    $plateThreeFile,
    ($queuePrefix + '1.jpg'),
    ($queuePrefix + '2.jpg'),
    ($queuePrefix + '3.jpg'),
    "setInterval(tick, 1000)",
    "setTaskStatus('paused')",
    "setTaskStatus('cancelled')",
    $preparingCancelPrompt,
    ("cancelled: '" + $cancelledTaskText + "'"),
    'taskCopy.hidden = isCancelled',
    "taskActions.hidden = status === 'completed' || isCancelled",
    'queueToggle.hidden = isPreparing || isCancelled || queuePlateIds.length === 0',
    "setTaskStatus('completed')",
    'restartPrint',
    'secondsRemaining = TOTAL_SECONDS',
    'completedPlates.add(activePlate)',
    "query.set('completed'",
    'openPrintSettings',
    'openQueueTaskSettings',
    "entry: 'queue'",
    "step: 'material'",
    'selected: queuePlate',
    "params.get('source') === 'journey-v2'",
    '../../dayinlvchengv2/',
    "status: currentStatus === 'completed' ? 'completed' : 'printing'",
    "params.get('status') === 'completed'",
    "task.addEventListener('click', () => openQueueTaskSettings(task.dataset.plate))",
    "nextPlateButton.addEventListener('click'",
    $localFileToastBehavior,
    "filamentSheet.showModal()",
    "openFilamentOperation",
    "cancelFilamentOperation",
    "closeFilamentOperationButton.addEventListener('click', cancelFilamentOperation)",
    "dialog.showModal()"
)

foreach ($behavior in $requiredBehaviors) {
    if (-not $script.Contains($behavior)) {
        throw "Required prototype behavior is missing: $behavior"
    }
}

$slotCount = ([regex]::Matches($html, 'class="material-slot(?:\s|")')).Count
if ($slotCount -ne 5) {
    throw "Expected one external rack and four internal material slots, found $slotCount"
}

Write-Host 'Self-developed printer prototype contract checks passed.'
