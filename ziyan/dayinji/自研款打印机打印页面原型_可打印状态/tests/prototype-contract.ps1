$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "Prototype entry is missing: $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
$filamentAsset = '../../src/dayinjihaocai/' + [char]0x8017 + [char]0x6750 + [char]0x9762 + [char]0x677f + '.png'
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
$readyTaskText = '' + [char]0x53ef + [char]0x6253 + [char]0x5370
$readyQueueText = '' + [char]0x5f53 + [char]0x524d + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x5904 + [char]0x4e8e + [char]0x7a7a + [char]0x95f2 + [char]0x72b6 + [char]0x6001 + [char]0xff0c + [char]0x53ef + [char]0x4ee5 + [char]0x5f00 + [char]0x59cb + [char]0x6253 + [char]0x5370 + [char]0x961f + [char]0x5217 + [char]0x4e2d + [char]0x7684 + [char]0x4efb + [char]0x52a1 + [char]0x5566 + [char]0x3002
$startQueuedPrintText = '' + [char]0x5f00 + [char]0x59cb + [char]0x6253 + [char]0x5370
$exploreToysText = '' + [char]0x63a2 + [char]0x7d22 + [char]0x73a9 + [char]0x5177
$idlePanelAsset = '../../src/dayinji/' + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1 + [char]0x9762 + [char]0x677f + [char]0x7a7a + [char]0x95f2 + '.jpg'
$idleConnectionAsset = '../../src/lianjiezhuangtai/' + [char]0x7a7a + [char]0x95f2 + '.png'
$offlineConnectionAsset = '../../src/lianjiezhuangtai/' + [char]0x79bb + [char]0x7ebf + '.png'
$boyAvatarAsset = '../../src/dayinjirenwukongzhi/' + [char]0x4eba + [char]0x7269 + [char]0x5934 + [char]0x50cf + '-' + [char]0x7537 + [char]0x5b69 + '.png'
$girlAvatarAsset = '../../src/dayinjirenwukongzhi/' + [char]0x4eba + [char]0x7269 + [char]0x5934 + [char]0x50cf + '-' + [char]0x5973 + [char]0x5b69 + '.png'
$girlTaskOneAsset = '../../src/dayinjirenwukongzhi/' + [char]0x5973 + [char]0x5b69 + [char]0x7684 + [char]0x5f85 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1 + '__1.jpg'
$girlTaskTwoAsset = '../../src/dayinjirenwukongzhi/' + [char]0x5973 + [char]0x5b69 + [char]0x7684 + [char]0x5f85 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1 + '_2.jpg'
$idleTimelapseAsset = '../../src/shexiangtou/' + [char]0x7a7a + [char]0x95f2 + [char]0x5ef6 + [char]0x65f6 + [char]0x6444 + [char]0x5f71 + '.jpg'
$cameraOffAsset = '../../src/shexiangtou/' + [char]0x5173 + [char]0x95ed + [char]0x6444 + [char]0x50cf + [char]0x5934 + [char]0x72b6 + [char]0x6001 + '.jpg'
$requiredFragments = @(
    'id="printer-switch"',
    'id="printer-settings"',
    'id="printer-connection-state"',
    'id="printer-connection-state-image"',
    'id="printer-connection-state-label"',
    $idleConnectionAsset,
    $offlineConnectionAsset,
    'id="timelapse-placeholder"',
    'id="camera-monitor-image"',
    'id="timelapse-action"',
    'id="camera-toggle"',
    $idleTimelapseAsset,
    $cameraOffAsset,
    'id="task-panel"',
    'data-status="ready"',
    ('id="task-state">' + $readyTaskText + '</span>'),
    'id="task-navigation"',
    'id="ready-queue-message"',
    $readyQueueText,
    'id="start-queued-print"',
    ('>' + $startQueuedPrintText + '</button>'),
    'id="active-task-image"',
    'id="active-task-owner-avatar"',
    $boyAvatarAsset,
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
    'id="queued-girl-task-one"',
    'id="queued-girl-task-two"',
    'id="queue-task-image-girl-one"',
    'id="queue-task-image-girl-two"',
    'id="queued-task-fifth"',
    'id="queue-task-image-five"',
    $girlAvatarAsset,
    $girlTaskOneAsset,
    $girlTaskTwoAsset,
    'id="completion-actions"',
    'id="restart-print"',
    'id="local-file"',
    ('>' + $restartText + '</span>'),
    $localFileAsset,
    'id="next-plate"',
    ('>' + $exploreToysText + '</span>'),
    'class="filament-panel-canvas"',
    'id="filament-panel-image"',
    'id="filament-pointer"',
    $filamentAsset,
    'data-slot-index="rack"',
    'id="load-filament"',
    'id="unload-filament"',
    'id="filament-operation-screen"',
    'id="filament-operation-image"',
    'id="close-filament-operation"',
    'id="cancel-filament-operation"',
    'id="control-settings"',
    'id="reference-screen"',
    'id="reference-content"',
    'id="explore-journey-hotspot"',
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
    'toggleCamera',
    "cameraToggleButton.addEventListener('click', toggleCamera)",
    "cameraMonitor.dataset.cameraState",
    'const girlTaskCatalog',
    'const familyQueueTasks',
    'getActiveQueueTask',
    'getVisibleQueueTasks',
    "currentStatus === 'cancelled'",
    'const v3PrintJourneyPath',
    "journey: 'v3'",
    'const queuePlateIds',
    'const completedPlates',
    'const isReadyQueueScenario',
    'const boyTasksCompleted',
    'const PREPARATION_DURATION_SECONDS = 30',
    'const PREPARATION_STAGES',
    'advancePreparation',
    "let currentStatus = 'ready'",
    ("ready: '" + $readyTaskText + "'"),
    "const isReady = status === 'ready'",
    'taskNavigation.hidden = !isReady',
    'taskSummary.hidden = isReady',
    "setTaskStatus('preparing')",
    "setTaskStatus('ready')",
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
    "taskActions.hidden = isReady || status === 'completed' || isCancelled",
    'const shouldShowReadyQueue',
    'const queueShouldBeVisible',
    "queueToggle.setAttribute('aria-expanded', 'true')",
    "setTaskStatus('completed')",
    'restartPrint',
    'secondsRemaining = TOTAL_SECONDS',
    'completedPlates.add(activePlate)',
    "query.set('completed'",
    'openPrintSettings',
    'openQueueTaskSettings',
    "entry: 'queue'",
    "step: 'material'",
    'selected: queueTask.plate',
    "params.get('source') === 'journey-v2'",
    '../../dayinlvchengv2/',
    "status: currentStatus === 'completed' ? 'completed' : 'printing'",
    "params.get('status') === 'completed'",
    "params.get('status') === 'preparing'",
    'openQueuedTaskBuilder',
    "startQueuedPrintButton.addEventListener('click', openQueuedTaskBuilder)",
    "openReference('" + [char]0x63a2 + [char]0x7d22 + [char]0x73a9 + [char]0x5177 + ".jpg', '" + [char]0x63a2 + [char]0x7d22 + [char]0x73a9 + [char]0x5177 + "'",
    "exploreJourneyHotspot.hidden = fileName !== '" + [char]0x63a2 + [char]0x7d22 + [char]0x73a9 + [char]0x5177 + ".jpg'",
    "exploreJourneyHotspot.addEventListener('click'",
    'window.location.href = v2PrintJourneyPath',
    "task.addEventListener('click', () => openQueueTaskSettings(task.dataset.queueId))",
    "nextPlateButton.addEventListener('click'",
    $localFileToastBehavior,
    "loadFilamentButton.addEventListener('click', () => openFilamentOperation('feed'))",
    "unloadFilamentButton.addEventListener('click', () => openFilamentOperation('retract'))",
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

$forbiddenFragments = @(
    'class="task-navigation-badge"',
    'id="model-navigation"',
    'id="ready-navigation-image"',
    'id="explore-toys"',
    'id="my-models"',
    'id="filament-settings"',
    'id="filament-reference"',
    'id="filament-title-mask"',
    'id="filament-pointer-mask"',
    'id="filament-sheet"',
    'id="feed-filament"',
    'id="retract-filament"',
    'class="sheet-slots"'
)

foreach ($fragment in $forbiddenFragments) {
    if ($html.Contains($fragment)) {
        throw "Removed filament-panel content is still present: $fragment"
    }
}

$slotCount = ([regex]::Matches($html, 'class="filament-slot-hotspot(?:\s|")')).Count
if ($slotCount -ne 5) {
    throw "Expected one external tray and four Food Box slots, found $slotCount"
}

Write-Host 'Self-developed printer prototype contract checks passed.'
