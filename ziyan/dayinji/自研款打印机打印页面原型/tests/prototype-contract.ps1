$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "Prototype entry is missing: $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
# 原型修改复用图片资源
$reuseAssetDir = '../../' + [char]0x539f + [char]0x578b + [char]0x4fee + [char]0x6539 + [char]0x590d + [char]0x7528 + [char]0x56fe + [char]0x7247 + [char]0x8d44 + [char]0x6e90
$filamentAsset = $reuseAssetDir + '/' + [char]0x8017 + [char]0x6750 + [char]0x9762 + [char]0x677f + '.png'
$feedingAsset = $reuseAssetDir + '/' + [char]0x8fdb + [char]0x6599 + [char]0x4e2d + '.png'
$retractingAsset = $reuseAssetDir + '/' + [char]0x9000 + [char]0x6599 + [char]0x4e2d + '.png'
$feedingLabel = '' + [char]0x8fdb + [char]0x6599
$retractingLabel = '' + [char]0x9000 + [char]0x6599
$feedingStatusText = $feedingLabel + [char]0x4e2d
$loadedStatusText = $feedingLabel + [char]0x5b8c + [char]0x6210
$retractingStatusText = $retractingLabel + [char]0x4e2d
$retractedStatusText = $retractingLabel + [char]0x5b8c + [char]0x6210
# 新增复用大图
$cameraLimitAsset = $reuseAssetDir + '/' + [char]0x8fbe + [char]0x5230 + [char]0x89c2 + [char]0x770b + [char]0x65f6 + [char]0x957f + [char]0x540e + [char]0x81ea + [char]0x52a8 + [char]0x5173 + [char]0x95ed + [char]0x6444 + [char]0x50cf + [char]0x5934 + '.png'
$deviceSettingsAsset = $reuseAssetDir + '/' + [char]0x8bbe + [char]0x5907 + [char]0x8bbe + [char]0x7f6e + [char]0x9875 + '.png'
$printOptionsAsset = $reuseAssetDir + '/' + [char]0x6253 + [char]0x5370 + [char]0x9009 + [char]0x9879 + '.png'
$timelapsePageAsset = $reuseAssetDir + '/' + [char]0x5ef6 + [char]0x65f6 + [char]0x6444 + [char]0x5f71 + [char]0x9875 + '.png'
$timelapseDeleteAsset = $reuseAssetDir + '/' + [char]0x5ef6 + [char]0x65f6 + [char]0x6444 + [char]0x5f71 + [char]0x5220 + [char]0x9664 + [char]0x6f14 + [char]0x793a + '.png'
$fanFilterAsset = $reuseAssetDir + '/' + [char]0x98ce + [char]0x6247 + [char]0x6ee4 + [char]0x82af + [char]0x66f4 + [char]0x6362 + '.png'
$fanAlertAsset = $reuseAssetDir + '/' + [char]0x98ce + [char]0x6247 + [char]0x63d0 + [char]0x9192 + [char]0x5f39 + [char]0x7a97 + '.png'
$exploreToysAsset = $reuseAssetDir + '/' + [char]0x63a2 + [char]0x7d22 + [char]0x73a9 + [char]0x5177 + [char]0x9875 + '.png'
$modelDetailAsset = $reuseAssetDir + '/' + [char]0x6a21 + [char]0x578b + [char]0x8be6 + [char]0x60c5 + [char]0x9875 + '.png'
$preparePrintAsset = $reuseAssetDir + '/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '.png'
# 准备打印页切片（盘列表可拖动排序，底图 + 三行切片）
$plateRowBackdrop = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x5e95 + [char]0x56fe + '.png'
$plateRowOne = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x76d8 + '1.png'
$plateRowTwo = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x76d8 + '2.png'
$plateRowThree = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x76d8 + '3.png'
# 准备打印页“耗材颜色更换后”整套原图（源图 准备打印耗材颜色更换后.png + 底图 + 三行切片）
$prepareChangedSource = $reuseAssetDir + '/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x8017 + [char]0x6750 + [char]0x989c + [char]0x8272 + [char]0x66f4 + [char]0x6362 + [char]0x540e + '.png'
$prepareChangedBackdrop = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x66f4 + [char]0x6362 + [char]0x540e + '-' + [char]0x5e95 + [char]0x56fe + '.png'
$prepareChangedRowOne = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x66f4 + [char]0x6362 + [char]0x540e + '-' + [char]0x76d8 + '1.png'
$prepareChangedRowTwo = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x66f4 + [char]0x6362 + [char]0x540e + '-' + [char]0x76d8 + '2.png'
$prepareChangedRowThree = 'assets/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '-' + [char]0x66f4 + [char]0x6362 + [char]0x540e + '-' + [char]0x76d8 + '3.png'
# 任务状态版准备打印页复用空闲版底图 + 盘行切片，状态戳为 assets 下从原图裁出的圆形戳
$printingStampAsset = 'assets/' + [char]0x72b6 + [char]0x6001 + [char]0x6233 + '-' + [char]0x6b63 + [char]0x5728 + [char]0x6253 + [char]0x5370 + '.png'
$cancelledStampAsset = 'assets/' + [char]0x72b6 + [char]0x6001 + [char]0x6233 + '-' + [char]0x5df2 + [char]0x53d6 + [char]0x6d88 + '.png'
$printedStampAsset = 'assets/' + [char]0x72b6 + [char]0x6001 + [char]0x6233 + '-' + [char]0x5df2 + [char]0x6253 + [char]0x5370 + '.png'
$printingAsset = $reuseAssetDir + '/' + [char]0x6b63 + [char]0x5728 + [char]0x6253 + [char]0x5370 + '.png'
$cancelledAsset = $reuseAssetDir + '/' + [char]0x5df2 + [char]0x53d6 + [char]0x6d88 + '.png'
$printedAsset = $reuseAssetDir + '/' + [char]0x5df2 + [char]0x6253 + [char]0x5370 + '.png'
$prepareMaterialAsset = $reuseAssetDir + '/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + [char]0x9009 + [char]0x62e9 + [char]0x8017 + [char]0x6750 + '.png'
$prepareEmptyAsset = $reuseAssetDir + '/' + [char]0x51c6 + [char]0x5907 + [char]0x6253 + [char]0x5370 + [char]0x9875 + [char]0x65e0 + [char]0x8017 + [char]0x6750 + '.png'
# 固件升级链路：源图（原型修改复用图片资源） + 裁掉四周白边并归一到 375×812 的页面图（assets）
$firmwareUpgradeSource = $reuseAssetDir + '/' + [char]0x56fa + [char]0x4ef6 + [char]0x5347 + [char]0x7ea7 + '.png'
$firmwareVersionSource = $reuseAssetDir + '/' + [char]0x56fa + [char]0x4ef6 + [char]0x7248 + [char]0x672c + '.png'
$firmwareProgressSource = $reuseAssetDir + '/' + [char]0x56fa + [char]0x4ef6 + [char]0x5347 + [char]0x7ea7 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '.png'
$firmwareDoneSource = $reuseAssetDir + '/' + [char]0x66f4 + [char]0x65b0 + [char]0x5b8c + [char]0x6210 + '.png'
$firmwareUpgradeAsset = 'assets/' + [char]0x56fa + [char]0x4ef6 + [char]0x5347 + [char]0x7ea7 + [char]0x9875 + '.png'
$firmwareVersionAsset = 'assets/' + [char]0x56fa + [char]0x4ef6 + [char]0x7248 + [char]0x672c + [char]0x9875 + '.png'
$firmwareProgressAsset = 'assets/' + [char]0x56fa + [char]0x4ef6 + [char]0x5347 + [char]0x7ea7 + [char]0x6253 + [char]0x5370 + [char]0x9875 + '.png'
$firmwareDoneAsset = 'assets/' + [char]0x66f4 + [char]0x65b0 + [char]0x5b8c + [char]0x6210 + [char]0x9875 + '.png'
$addPrinterAsset = $reuseAssetDir + '/' + [char]0x6dfb + [char]0x52a0 + [char]0x6253 + [char]0x5370 + [char]0x673a + '.png'
$removePrinterAsset = $reuseAssetDir + '/' + [char]0x79fb + [char]0x9664 + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x5f39 + [char]0x7a97 + '.png'
# 进料中 / 退料中：真实 DOM 页面的插画（由 assets/_tools_make_filament_assets.py 从设计稿裁切 + 去背）
$filamentPullAsset = 'assets/' + [char]0x8017 + [char]0x6750 + [char]0x64cd + [char]0x4f5c + '-' + [char]0x8fdb + [char]0x6599 + '-' + [char]0x62bd + [char]0x56de + [char]0x5f53 + [char]0x524d + [char]0x8017 + [char]0x6750 + '.png'
$filamentPushAsset = 'assets/' + [char]0x8017 + [char]0x6750 + [char]0x64cd + [char]0x4f5c + '-' + [char]0x8fdb + [char]0x6599 + '-' + [char]0x9001 + [char]0x51fa + [char]0x65b0 + [char]0x8017 + [char]0x6750 + '.png'
$filamentRetractAsset = 'assets/' + [char]0x8017 + [char]0x6750 + [char]0x64cd + [char]0x4f5c + '-' + [char]0x9000 + [char]0x6599 + '-' + [char]0x9000 + [char]0x51fa + [char]0x5f53 + [char]0x524d + [char]0x8017 + [char]0x6750 + '.png'
$filamentRetractDoneAsset = 'assets/' + [char]0x8017 + [char]0x6750 + [char]0x64cd + [char]0x4f5c + '-' + [char]0x9000 + [char]0x6599 + '-' + [char]0x9000 + [char]0x6599 + [char]0x5b8c + [char]0x6210 + '.png'
$materialSettingsAsset = $reuseAssetDir + '/' + [char]0x8017 + [char]0x6750 + [char]0x8bbe + [char]0x7f6e + [char]0x9875 + '.png'
$materialNameAsset = $reuseAssetDir + '/' + [char]0x540d + [char]0x79f0 + [char]0x4fee + [char]0x6539 + [char]0x9875 + '.png'
$materialTypeAsset = $reuseAssetDir + '/' + [char]0x8017 + [char]0x6750 + [char]0x7c7b + [char]0x578b + [char]0x4fee + [char]0x6539 + [char]0x9875 + '.png'
$materialColorAsset = $reuseAssetDir + '/' + [char]0x989c + [char]0x8272 + [char]0x4fee + [char]0x6539 + [char]0x9875 + '.png'
$pairingFlowPath = '../../lianjiepeiwnag/' + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x9996 + [char]0x6b21 + [char]0x914d + [char]0x7f51 + [char]0x8fde + [char]0x63a5 + [char]0x6d41 + [char]0x7a0b + [char]0x539f + [char]0x578b + '/index.html'
$localFileAsset = '../../src/dayinji/' + [char]0x672c + [char]0x5730 + [char]0x6587 + [char]0x4ef6 + '.jpg'
$plateOneFile = [char]0x9009 + [char]0x4e2d + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '1.jpg'
$plateTwoFile = [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '2' + [char]0xff08 + [char]0x4fee + [char]0x6539 + [char]0xff09 + '.jpg'
$plateThreeFile = [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '3.jpg'
$queuePrefix = '' + [char]0x6253 + [char]0x5370 + [char]0x961f + [char]0x5217
$restartText = '' + [char]0x91cd + [char]0x65b0 + [char]0x6253 + [char]0x5370
$localFileToastText = '' + [char]0x5df2 + [char]0x6253 + [char]0x5f00 + [char]0x672c + [char]0x5730 + [char]0x6587 + [char]0x4ef6
$localFileToastBehavior = "showToast('$localFileToastText')"
$preparingCancelPrompt = '' + [char]0x662f + [char]0x5426 + [char]0x8981 + [char]0x53d6 + [char]0x6d88 + [char]0x4efb + [char]0x52a1
$cancelCurrentText = '' + [char]0x53d6 + [char]0x6d88 + [char]0x5f53 + [char]0x524d + [char]0x4efb + [char]0x52a1
$cancelAllText = '' + [char]0x53d6 + [char]0x6d88 + [char]0x5168 + [char]0x90e8 + [char]0x4efb + [char]0x52a1
$cancelledTaskText = '' + [char]0x5df2 + [char]0x53d6 + [char]0x6d88 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1
$cancelledAllText = '' + [char]0x5df2 + [char]0x53d6 + [char]0x6d88 + [char]0x5168 + [char]0x90e8 + [char]0x4efb + [char]0x52a1
$dialogCloseLabel = '' + [char]0x5173 + [char]0x95ed + [char]0x5f39 + [char]0x7a97
$readyTaskText = '' + [char]0x53ef + [char]0x6253 + [char]0x5370
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
    'id="camera-view-limit"',
    $cameraLimitAsset,
    $idleTimelapseAsset,
    $cameraOffAsset,
    'id="task-panel"',
    'data-status="ready"',
    ('id="task-state">' + $readyTaskText + '</span>'),
    'id="model-navigation"',
    'id="ready-navigation-image"',
    'id="explore-toys"',
    'id="my-models"',
    $idlePanelAsset,
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
    $girlAvatarAsset,
    $girlTaskOneAsset,
    $girlTaskTwoAsset,
    'id="completion-actions"',
    'id="restart-print"',
    'id="local-file"',
    ('>' + $restartText + '</span>'),
    $localFileAsset,
    'id="next-plate"',
    'class="filament-panel-canvas"',
    'id="filament-panel-image"',
    $filamentAsset,
    'id="fan-filter-banner"',
    'id="fan-filter-hours"',
    'id="filament-selection-ring"',
    'id="filament-status"',
    'id="filament-spool"',
    'id="load-filament"',
    'id="unload-filament"',
    'id="filament-operation-screen"',
    'id="filament-operation-title"',
    'id="filament-operation-steps"',
    'id="filament-operation-hint"',
    'id="filament-operation-percent"',
    'id="filament-operation-ring"',
    'id="filament-operation-arc"',
    'id="filament-operation-art"',
    'id="filament-operation-temp"',
    'id="filament-operation-degree"',
    'id="filament-operation-tip"',
    'id="filament-operation-label"',
    'id="filament-operation-banner"',
    'id="filament-operation-primary"',
    'id="filament-operation-back"',
    'id="filament-cancel-dialog"',
    'id="filament-cancel-confirm"',
    'id="filament-cancel-dismiss"',
    $filamentPullAsset,
    # 设备设置 / 打印选项 / 延时摄影 / 风扇滤芯 复用大图页面
    'id="device-settings-screen"',
    'id="device-settings-back"',
    'id="open-print-options"',
    'id="open-timelapse-settings"',
    $deviceSettingsAsset,
    'id="print-options-screen"',
    'id="print-options-back"',
    $printOptionsAsset,
    'id="timelapse-screen"',
    'id="timelapse-screen-frame"',
    'id="timelapse-screen-back"',
    'id="open-timelapse-delete"',
    $timelapsePageAsset,
    'id="timelapse-delete-screen"',
    'id="timelapse-delete-back"',
    $timelapseDeleteAsset,
    'id="fan-filter-screen"',
    'id="fan-filter-back"',
    'id="fan-filter-replaced"',
    'id="open-fan-alert"',
    $fanFilterAsset,
    'id="fan-alert-screen"',
    'id="fan-alert-back"',
    $fanAlertAsset,
    # 添加打印机 / 移除打印机 / 耗材设置与三个子页面
    'id="add-printer-screen"',
    'id="add-printer-back"',
    'id="configure-new-printer"',
    $addPrinterAsset,
    'id="open-remove-printer"',
    'id="remove-printer-screen"',
    'id="remove-printer-back"',
    'id="remove-printer-cancel"',
    'id="remove-printer-confirm"',
    $removePrinterAsset,
    'id="logic-demo-screen"',
    'id="logic-demo-existing"',
    'id="logic-demo-none"',
    'id="logic-demo-back"',
    'id="explore-toys-screen"',
    'id="explore-toys-anywhere"',
    'id="explore-toys-back"',
    $exploreToysAsset,
    'id="model-detail-screen"',
    'id="model-detail-back"',
    'id="open-prepare-print"',
    $modelDetailAsset,
    'id="prepare-print-screen"',
    'id="prepare-print-back"',
    'id="prepare-stage"',
    'id="prepare-artwork"',
    'id="prepare-plate-list"',
    'class="plate-row"',
    'class="plate-material-hit"',
    'data-chip="left"',
    'data-chip="right"',
    'data-target="prepareMaterial"',
    'data-target="prepareEmpty"',
    'class="plate-material-hit plate-material-hit--mismatch"',
    'id="prepare-switch-printer"',
    'class="reuse-hotspot reuse-hotspot--prepare-switch"',
    'id="timelapse-toggle"',
    'class="timelapse-check-box"',
    'id="start-print"',
    $plateRowBackdrop,
    $plateRowOne,
    $plateRowTwo,
    $plateRowThree,
    'id="prepare-state-screen"',
    'id="prepare-state-stage"',
    'id="prepare-state-artwork"',
    'id="state-stamp"',
    'id="printer-busy-patch"',
    'id="prepare-state-toggle"',
    'id="prepare-state-start"',
    'id="prepare-state-dim"',
    'id="prepare-state-back"',
    'class="state-row',
    'class="state-material-hit"',
    $printingStampAsset,
    'id="prepare-material-screen"',
    'id="prepare-material-confirm"',
    'id="prepare-material-close"',
    $prepareMaterialAsset,
    'id="prepare-empty-screen"',
    'id="prepare-empty-spool"',
    'id="prepare-empty-close"',
    $prepareEmptyAsset,
    'id="open-firmware-version"',
    'id="firmware-status-badge"',
    'id="firmware-banner"',
    'id="firmware-upgrade-screen"',
    'id="firmware-upgrade-now"',
    'id="firmware-upgrade-back"',
    'id="firmware-version-screen"',
    'id="firmware-version-back"',
    'id="firmware-progress-screen"',
    'id="firmware-progress-percent"',
    'id="firmware-done-screen"',
    'id="firmware-done-ok"',
    'id="firmware-dialog"',
    'id="firmware-dialog-title"',
    'id="firmware-dialog-cancel"',
    'id="firmware-dialog-confirm"',
    'class="firmware-banner"',
    'class="firmware-banner-cta"',
    'class="firmware-status-badge"',
    'class="firmware-progress-disc"',
    'class="firmware-progress-percent"',
    $firmwareUpgradeAsset,
    $firmwareVersionAsset,
    $firmwareProgressAsset,
    $firmwareDoneAsset,
    'id="open-material-settings"',
    'id="material-settings-screen"',
    'id="material-settings-back"',
    'id="open-material-name"',
    'id="open-material-type"',
    'id="open-material-color"',
    $materialSettingsAsset,
    'id="material-name-screen"',
    'id="material-name-cancel"',
    'id="material-name-confirm"',
    'id="material-name-return"',
    $materialNameAsset,
    'id="material-type-screen"',
    'id="material-type-anywhere"',
    $materialTypeAsset,
    'id="material-color-screen"',
    'id="material-color-anywhere"',
    $materialColorAsset,
    'id="reference-screen"',
    'id="reference-content"',
    'id="action-dialog"',
    'id="dialog-close"',
    ('aria-label="' + $dialogCloseLabel + '"'),
    ('id="dialog-title">' + $preparingCancelPrompt + '</h2>'),
    ('>' + $cancelCurrentText + '</button>'),
    ('>' + $cancelAllText + '</button>'),
    'id="dialog-dismiss"',
    'aria-live="polite"',
    'id="transition-overlay"',
    'id="transition-label"',
    'id="transition-close"',
    'transition-mascot'
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
    'let familyQueueTasks',
    'getVisibleQueueTasks',
    'getActiveTaskOwner',
    'cancelTasksForActiveRole',
    "journey: 'v3'",
    'const taskCatalog',
    'const taskResults',
    'const completedPlates',
    'const PREPARATION_DURATION_SECONDS = 26',
    'const PREPARATION_STAGES',
    'advancePreparation',
    "let currentStatus = 'ready'",
    ("ready: '" + $readyTaskText + "'"),
    "const isReady = status === 'ready'",
    'modelNavigation.hidden = !isReady',
    'taskSummary.hidden = isReady',
    "setTaskStatus('preparing')",
    "setTaskStatus('ready')",
    "params.get('completed')",
    '!taskResults.has(id)',
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
    "setTaskStatus('cancelled-all')",
    ("title: '" + $preparingCancelPrompt + "'"),
    ("dismissText: '" + $cancelCurrentText + "'"),
    ("confirmText: '" + $cancelAllText + "'"),
    ("cancelled: '" + $cancelledTaskText + "'"),
    ("'cancelled-all': '" + $cancelledAllText + "'"),
    "dialogClose.addEventListener('click'",
    "dialog.returnValue === 'cancel'",
    'taskCopy.hidden = isCancelled',
    "taskActions.hidden = isReady || status === 'completed' || isCancelled",
    'queueToggle.hidden = isReady || isPreparing || getVisibleQueueTasks().length === 0',
    "queueToggle.setAttribute('aria-expanded', 'true')",
    "setTaskStatus('completed')",
    'restartPrint',
    'secondsRemaining = TOTAL_SECONDS',
    'completedPlates.add(activePlate)',
    'const next = new URL(window.location.href);',
    'function pickNextQueuedTask()',
    'function startNextPlate()',
    "next.searchParams.set('status', 'preparing')",
    "next.searchParams.set('activeTask', nextTask.task)",
    "next.searchParams.delete('activeTask')",
    'openQueueTaskSettings',
    "params.get('status') === 'completed'",
    "params.get('status') === 'preparing'",
    "exploreToysButton.addEventListener('click', () => openReuseScreen('exploreToys'))",
    ("openReference('" + [char]0x6211 + [char]0x7684 + [char]0x6a21 + [char]0x578b + ".jpg', '" + [char]0x6211 + [char]0x7684 + [char]0x6a21 + [char]0x578b + "'"),
    "document.querySelector('#explore-toys-anywhere').addEventListener('click', () => openReuseScreen('modelDetail'))",
    "document.querySelector('#explore-toys-back').addEventListener('click', closeReuseScreens)",
    "document.querySelector('#open-prepare-print').addEventListener('click', () => {",
    'const PREPARE_ARTWORKS',
    $plateRowBackdrop,
    $plateRowOne,
    $plateRowTwo,
    $plateRowThree,
    $prepareChangedBackdrop,
    $prepareChangedRowOne,
    $prepareChangedRowTwo,
    $prepareChangedRowThree,
    "ratio: '311 / 675'",
    "ratio: '375 / 812'",
    'function renderPrepareArtwork(key)',
    'function resetPrepareArtwork()',
    "renderPrepareArtwork('default')",
    "renderPrepareArtwork('colorChanged')",
    'let prepareColorChanged = false',
    'let pendingFilamentColorChange = false',
    "const mismatch = chip.dataset.target === 'prepareEmpty' && !prepareColorChanged",
    'slotTops:',
    'function selectPlate(plate)',
    'function startPlateDrag(event, row)',
    'function endPlateDrag()',
    'function applyPlateOrder(order)',
    "row.querySelectorAll('.plate-material-hit').forEach",
    'function openPrepareStateScreen(preferredPlate)',
    'function selectStateRow(plate)',
    'function renderStateRows()',
    'function goToPrinterState(plate, status)',
    'PREPARE_STATE_STAMPS',
    'let materialSheetFrom',
    'STATE_ROW_ART',
    'const isSinglePlateModel',
    'const modelPlateIds',
    'let reprintPreparation',
    'function runTransition',
    'function openTransition',
    'function bindTimelapseToggle(button)',
    "goToPrinterState(selectedPlate, 'preparing')",
    "goToPrinterState(selectedStateRow, 'printing')",
    "params.get('status') === 'paused'",
    "params.get('status') === 'cancelled'",
    $cancelledStampAsset,
    $printedStampAsset,
    "document.querySelector('#prepare-switch-printer').addEventListener('click', () => openReuseScreen('addPrinter'))",
    "document.querySelector('#prepare-material-confirm').addEventListener('click', () => {",
    "document.querySelector('#prepare-material-close').addEventListener('click', () => {",
    "document.querySelector('#prepare-empty-spool').addEventListener('click', () => {",
    "document.querySelector('#prepare-empty-close').addEventListener('click', () => {",
    "pendingFilamentColorChange = true",
    'if (pendingFilamentColorChange) {',
    "document.querySelector('#start-print').addEventListener('click'",
    "setTaskStatus('preparing')",
    "document.querySelector('#timelapse-toggle')",
    "button.addEventListener('click'",
    "button.setAttribute('aria-checked', String(nextChecked))",
    "bindTimelapseToggle(document.querySelector('#prepare-state-toggle'))",
    'const FIRMWARE_LATEST_VERSION',
    'let firmwareUpdateAvailable = true',
    'function setFirmwareUpdateAvailable(available)',
    'function setFirmwareSettingsHasUpdate(hasUpdate)',
    'function renderFirmwareState()',
    'function firmwareHasUpdateContext()',
    'firmwareBanner.hidden = !firmwareUpdateAvailable',
    "document.querySelector('#printer-settings').addEventListener('click', () => {",
    'setFirmwareSettingsHasUpdate(false)',
    'function renderFirmwareProgress(value)',
    'function startFirmwareProgress()',
    'function stopFirmwareProgress()',
    "firmwareBanner.addEventListener('click', () => {",
    "document.querySelector('#open-firmware-version').addEventListener('click', () => {",
    "openReuseScreen(firmwareHasUpdateContext() ? 'firmwareUpgrade' : 'firmwareVersion')",
    "document.querySelector('#firmware-upgrade-now').addEventListener('click', () => {",
    'firmwareDialog.showModal()',
    "document.querySelector('#firmware-dialog-confirm').addEventListener('click', () => {",
    'startFirmwareProgress()',
    "openReuseScreen('firmwareDone')",
    "document.querySelector('#firmware-done-ok').addEventListener('click', () => {",
    'setFirmwareUpdateAvailable(false)',
    'function returnToReuseScreen(name)',
    "task.addEventListener('click', () => openQueueTaskSettings(task.dataset.queueId))",
    "nextPlateButton.addEventListener('click', startNextPlate)",
    $localFileToastBehavior,
    'renderFilamentPanel',
    'const FILAMENT_STATUS_LABELS',
    "feeding: '$feedingStatusText'",
    "loaded: '$loadedStatusText'",
    "retracting: '$retractingStatusText'",
    "retracted: '$retractedStatusText'",
    'filamentSpoolSelected',
    "operation === 'feed' ? 'feeding' : 'retracting'",
    "foState.operation === 'feed' ? 'loaded' : 'retracted'",
    'foState.panelStateBefore',
    "filamentSpoolButton.addEventListener('click'",
    "loadFilamentButton.addEventListener('click'",
    "unloadFilamentButton.addEventListener('click'",
    "loadFilamentButton.textContent = loadBusy ? '$feedingStatusText...' : '$feedingLabel'",
    "unloadFilamentButton.textContent = unloadBusy ? '$retractingStatusText...' : '$retractingLabel'",
    'filamentSelectionRing.hidden = !filamentSpoolSelected',
    # 进料中 / 退料中：时间轴状态机（步骤、进度、回退不中断、取消二次确认）
    'const FO_CONFIG = {',
    'feed: {',
    'retract: {',
    'function foTick()',
    'function foComplete()',
    'function foEnter(operation)',
    'function foLeave()',
    'function foAbort()',
    'function foFinish()',
    "filamentOperationBack.addEventListener('click', foLeave)",
    "window.setInterval(foTick, foConfig.tick)",
    'foState.running && foState.operation === operation',
    'filamentPanel.dataset.filamentState = foState.panelStateBefore',
    'window.__filamentOperation = {',
    # 摄像头观看时长与延时摄影标签
    'renderCameraMonitor',
    'const CAMERA_VIEW_LIMIT_DELAY_MS = 7000',
    "cameraViewLimitButton.addEventListener('click'",
    "cameraMonitor.dataset.cameraState = 'limit'",
    "timelapseActionButton.addEventListener('click'",
    # 复用大图页面的跳转栈
    'const reuseScreenNames',
    'let reuseStack = []',
    'openReuseScreen',
    'closeReuseScreens',
    'goBackInReuseScreens',
    "openReuseScreen('deviceSettings')",
    "openReuseScreen('printOptions')",
    "openReuseScreen('timelapse')",
    "openReuseScreen('timelapseDelete')",
    "openReuseScreen('fanFilter')",
    "openReuseScreen('fanAlert')",
    # 风扇滤芯标签
    "fanFilterBanner.addEventListener('click'",
    "fanFilterHours.textContent = '400h'",
    'enableDragToPan',
    # 添加打印机 / 移除打印机 / 耗材设置
    "const PAIRING_FLOW_PATH = '$pairingFlowPath'",
    "openReuseScreen('addPrinter')",
    'screen=printer-select',
    "openReuseScreen('removePrinter')",
    "openReuseScreen('logicDemo')",
    "openReuseScreen('materialSettings')",
    "openReuseScreen('materialName')",
    "openReuseScreen('materialType')",
    "openReuseScreen('materialColor')",
    "document.querySelector('#logic-demo-existing').addEventListener('click'",
    "document.querySelector('#logic-demo-none').addEventListener('click'",
    "window.location.href = PAIRING_FLOW_PATH",
    "dialog.showModal()"
)

foreach ($behavior in $requiredBehaviors) {
    if (-not $script.Contains($behavior)) {
        throw "Required prototype behavior is missing: $behavior"
    }
}

$forbiddenFragments = @(
    'id="filament-settings"',
    'id="filament-reference"',
    'id="filament-title-mask"',
    'id="filament-pointer-mask"',
    'id="filament-sheet"',
    'id="feed-filament"',
    'id="retract-filament"',
    'class="sheet-slots"',
    # 控制板块已整体删除
    'class="controls-section"',
    'id="control-carousel"',
    'id="control-settings"',
    'class="carousel-dots"',
    # 旧耗材面板槽位与取消按钮已替换
    'class="filament-slot-hotspot',
    'id="filament-pointer"',
    'id="cancel-filament-operation"',
    # 进料中 / 退料中已从「整图复用 + 拖动看板」改为真实 DOM 页面
    'id="filament-operation-frame"',
    'id="filament-operation-image"',
    'id="close-filament-operation"',
    'class="filament-operation-screen"',
    'class="filament-operation-frame"',
    'class="filament-operation-back"',
    'function openFilamentOperation',
    'function closeFilamentOperation',
    # 探索玩具已改为复用整图页面，旧的参考图入口与打印旅程热区一并移除
    'id="explore-journey-hotspot"',
    # 两张耗材弹层已改成“中央料架 / 底部确定”的具体热区，整页点击层移除
    'id="prepare-material-anywhere"',
    'id="prepare-empty-anywhere"'
)

# 进料中 / 退料中：页面文案与步骤名必须与设计稿一致
$filamentCopyFragments = @(
    $feedingStatusText,
    $retractingStatusText,
    $filamentPushAsset,
    $filamentRetractAsset,
    $filamentRetractDoneAsset,
    [char]0x52a0 + [char]0x70ed + [char]0x55b7 + [char]0x5634 + [char]0x6e29 + [char]0x5ea6,
    [char]0x62bd + [char]0x56de + [char]0x5f53 + [char]0x524d + [char]0x8017 + [char]0x6750,
    [char]0x9001 + [char]0x51fa + [char]0x65b0 + [char]0x8017 + [char]0x6750,
    [char]0x9000 + [char]0x51fa + [char]0x5f53 + [char]0x524d + [char]0x8017 + [char]0x6750,
    [char]0x9000 + [char]0x6599 + [char]0x5b8c + [char]0x6210,
    [char]0x53ef + [char]0x9000 + [char]0x51fa + [char]0x9875 + [char]0x9762 + [char]0xff0c + [char]0x8fdb + [char]0x6599 + [char]0x5c06 + [char]0x7ee7 + [char]0x7eed + [char]0x8fdb + [char]0x884c,
    [char]0x53ef + [char]0x9000 + [char]0x51fa + [char]0x9875 + [char]0x9762 + [char]0xff0c + [char]0x9000 + [char]0x6599 + [char]0x5c06 + [char]0x7ee7 + [char]0x7eed + [char]0x8fdb + [char]0x884c,
    [char]0x52a0 + [char]0x70ed + [char]0x65f6 + [char]0x95f4 + [char]0x8f83 + [char]0x957f + [char]0xff0c + [char]0x8bf7 + [char]0x8010 + [char]0x5fc3 + [char]0x7b49 + [char]0x5f85,
    [char]0x89c2 + [char]0x5bdf + [char]0x662f + [char]0x5426 + [char]0x6709 + [char]0x8017 + [char]0x6750 + [char]0x4e1d + [char]0x9001 + [char]0x51fa + [char]0xff0c + [char]0x5982 + [char]0x679c + [char]0x6709 + [char]0x5219 + [char]0x8fdb + [char]0x6599 + [char]0x5b8c + [char]0x6210,
    [char]0x55b7 + [char]0x5934 + [char]0x6e29 + [char]0x5ea6 + [char]0x9ad8 + [char]0xff0c + [char]0x8bf7 + [char]0x52ff + [char]0x89e6 + [char]0x78b0
)
foreach ($fragment in $filamentCopyFragments) {
    if (-not $script.Contains($fragment)) {
        throw "Filament operation copy is missing from prototype.js: $fragment"
    }
}
if ($script.Contains($feedingAsset) -or $script.Contains($retractingAsset)) {
    throw 'The retired merged-artwork feeding pages must not be referenced from prototype.js any more.'
}

foreach ($fragment in $forbiddenFragments) {
    if ($html.Contains($fragment)) {
        throw "Removed filament-panel content is still present: $fragment"
    }
}

$spoolHotspotCount = ([regex]::Matches($html, 'id="filament-spool"')).Count
if ($spoolHotspotCount -ne 1) {
    throw "Expected exactly one filament spool hotspot, found $spoolHotspotCount"
}

if ($script.Contains('controls-section)') -or $script.Contains('control-carousel')) {
    throw 'Removed device-control behaviour is still wired in prototype.js'
}

# 打印队列的待打印任务不再跳转打印旅程的 Choose your color 配色页
foreach ($removed in @("step: 'material'", 'v3PrintJourneyPath')) {
    if ($script.Contains($removed)) {
        throw "The retired queue -> journey color page routing is still present: $removed"
    }
}
if (-not $script.Contains('openPrepareStateScreen(plate)')) {
    throw 'Queue tasks must open the state-specific prepare page.'
}

# 添加打印机不再经过“切换或添加打印机”弹窗
if ($script.Contains('action: ' + [char]0x27 + 'add-printer' + [char]0x27)) {
    throw 'The removed switch/add-printer dialog action is still wired in prototype.js'
}

# 色卡分流 / 耗材弹层已改为带状态的判断，旧的一行式写法必须彻底消失
foreach ($removed in @(
    "chip.addEventListener('click', () => openReuseScreen(chip.dataset.target === 'prepareEmpty' ? 'prepareEmpty' : 'prepareMaterial'))",
    "document.querySelector('#prepare-material-confirm').addEventListener('click', () => returnToReuseScreen('preparePrint'))",
    "document.querySelector('#prepare-empty-spool').addEventListener('click', () => openReuseScreen('prepareMaterial'))",
    'const PLATE_SLOT_TOPS ='
)) {
    if ($script.Contains($removed)) {
        throw "The retired prepare-print wiring is still present: $removed"
    }
}
if ($script.Contains('pendingAction === ' + [char]0x27 + 'add-printer' + [char]0x27)) {
    throw 'The removed switch/add-printer dialog branch is still wired in prototype.js'
}
$directAddPrinter = 'querySelector(' + [char]0x27 + '#printer-switch' + [char]0x27 + ').addEventListener(' + [char]0x27 + 'click' + [char]0x27 + ', () => openReuseScreen(' + [char]0x27 + 'addPrinter' + [char]0x27 + '))'
if (-not $script.Contains($directAddPrinter)) {
    throw 'The add-printer entry must open the add-printer page directly.'
}

# 固件状态必须拆成「设备事实」与「设置页展示上下文」两个标志：
# 旧的单一 firmwarePending 会让「从顶栏齿轮进设置页」连带把首页提醒条一起收掉。
foreach ($removed in @(
    'setFirmwarePending',
    'let firmwarePending',
    '!firmwarePending'
)) {
    if ($script.Contains($removed)) {
        throw "The retired single-flag firmware state is still wired in prototype.js: $removed"
    }
}
# 橙色文案必须同时看“设备有没有新版本”和“本次是否带更新上下文进来”，不能只看前者
if ($script.Contains('firmwareStatusBadge.hidden = !firmwareUpdateAvailable')) {
    throw 'The orange firmware copy must also depend on the 设备设置 entry context, not only on the device state.'
}
# 顶栏齿轮只能重置“设置页展示上下文”，不许碰首页提醒条
if ($script.Contains('setFirmwareUpdateAvailable(false)')) {
    $gearBlock = 'querySelector(' + [char]0x27 + '#printer-settings' + [char]0x27 + ').addEventListener(' + [char]0x27 + 'click' + [char]0x27 + ', () => {'
    $gearIndex = $script.IndexOf($gearBlock)
    if ($gearIndex -lt 0) {
        throw 'The 设备设置 gear entry is missing from prototype.js.'
    }
    $gearBody = $script.Substring($gearIndex, [Math]::Min(360, $script.Length - $gearIndex))
    if ($gearBody.Contains('setFirmwareUpdateAvailable(false)')) {
        throw 'The gear entry must not clear the firmware update availability flag.'
    }
}

# 整屏铺满型大图页：进料中 / 退料中 / 风扇提醒弹窗
$stylePath = Join-Path $prototypeRoot 'styles.css'
if (-not (Test-Path -LiteralPath $stylePath)) {
    throw "Prototype stylesheet is missing: $stylePath"
}
$style = Get-Content -LiteralPath $stylePath -Raw -Encoding UTF8

if (-not $html.Contains('class="reuse-screen reuse-screen--fullscreen"')) {
    throw 'The fan reminder dialog page is not marked as a full screen artwork page.'
}
if (-not $html.Contains('class="fullscreen-art"')) {
    throw 'The fan reminder dialog artwork is missing the full screen artwork class.'
}
if (-not $html.Contains($fanAlertAsset)) {
    throw 'The fan reminder dialog page is missing its reused artwork.'
}
foreach ($fragment in @('.fullscreen-art', 'width: max(min(100vw, var(--device-width)), calc(var(--frame-height) * var(--artwork-ratio)))', 'height: max(var(--frame-height), calc(min(100vw, var(--device-width)) / var(--artwork-ratio)))', '#fan-alert-screen { --artwork-ratio: 1.76695; }')) {
    if (-not $style.Contains($fragment)) {
        throw "Full screen artwork styling is missing: $fragment"
    }
}
foreach ($fragment in @('#timelapse-screen { --artwork-ratio: 1.63647; }', '#timelapse-delete-screen { --artwork-ratio: 1.59264; }', '.reuse-stage--screen {', '.timelapse-check[aria-checked="false"] .timelapse-check-box')) {
    if (-not $style.Contains($fragment)) {
        throw "Timelapse full screen styling is missing: $fragment"
    }
}
if ($html.Contains('reuse-stage--fill')) {
    throw 'The retired reuse-stage--fill class is still used; the 延时摄影 pages must fill the screen.'
}
if ($style.Contains('.filament-operation-screen') -or $style.Contains('.filament-operation-frame')) {
    throw 'The retired merged-artwork feeding styles are still present in styles.css.'
}

# 进料中 / 退料中：独立样式表（主色 / 圆环 / 底部提示条 / 主按钮）
# 线上 CDN 会按 Accept-Encoding 分片缓存旧文件，静态资源统一带 ?v= 版本查询串做缓存击穿
foreach ($fragment in @('href="styles.css?v=', 'href="styles-share-printer.css?v=', 'href="styles-filament-operation.css?v=', 'src="share-code-pool.js?v=', 'src="prototype.js?v=')) {
    if (-not $html.Contains($fragment)) {
        throw "Static assets must carry a cache-busting version query: $fragment"
    }
}

$filamentOpStylePath = Join-Path $prototypeRoot 'styles-filament-operation.css'
if (-not (Test-Path -LiteralPath $filamentOpStylePath)) {
    throw "Filament operation stylesheet is missing: $filamentOpStylePath"
}
$filamentOpStyle = Get-Content -LiteralPath $filamentOpStylePath -Raw -Encoding UTF8
foreach ($fragment in @(
    '.fo-screen {',
    'z-index: 35;',
    'top: var(--frame-top);',
    'width: min(100vw, var(--device-width));',
    'height: var(--frame-height);',
    '.fo-ring { position: relative; width: 220px; height: 220px; }',
    '--fo-orange: #eb5d11;',
    '--fo-track: #f6d4c4;',
    '--fo-gradient: linear-gradient(90deg, #7654ee 0%, #3a80f3 100%);',
    'stroke-dasharray: 681.1;',
    'stroke-dashoffset: -681.1;',
    '@keyframes fo-heat-pulse',
    '.fo-banner[data-tone="warn"]',
    '.fo-banner[data-tone="info"]'
)) {
    if (-not $filamentOpStyle.Contains($fragment)) {
        throw "Filament operation styling is missing: $fragment"
    }
}
if (-not ($html.Contains('href="styles-filament-operation.css"') -or $html.Contains('href="styles-filament-operation.css?'))) {
    throw 'index.html does not link the filament operation stylesheet.'
}
# 插画资源必须真实存在（打包发布时靠静态引用被复制）
foreach ($asset in @($filamentPullAsset, $filamentPushAsset, $filamentRetractAsset, $filamentRetractDoneAsset)) {
    $assetPath = Join-Path $prototypeRoot $asset
    if (-not (Test-Path -LiteralPath $assetPath)) {
        throw "Filament operation illustration is missing: $asset"
    }
}

# ---------- 准备打印页色卡分流 + 弹层热区 ----------
if (([regex]::Matches($html, 'class="plate-material-hit')).Count -ne 5) {
    throw 'Expected 5 material chip hotspots (盘1 一张、盘2 两张、盘3 两张).'
}
# 旧的“整行一张耗材热区”写法必须彻底消失，否则红框 / 非红框分不开
foreach ($removed in @('.plate-row[data-plate="1"] .plate-material-hit', '.plate-row[data-plate="2"] .plate-material-hit')) {
    if ($style.Contains($removed)) {
        throw "The retired single-chip material hotspot is still styled: $removed"
    }
}
foreach ($fragment in @(
    '.reuse-hotspot--prepare-switch {',
    '.plate-material-hit[data-chip="left"] {',
    '.plate-material-hit[data-chip="right"] {',
    '.reuse-hotspot--material-confirm {',
    '.reuse-hotspot--empty-spool {',
    '#prepare-material-screen .reuse-hotspot--sheet-close {',
    '#prepare-empty-screen .reuse-hotspot--sheet-close {'
)) {
    if (-not $style.Contains($fragment)) {
        throw "Prepare-print material hotspot styling is missing: $fragment"
    }
}

# ---------- 准备打印页 · 耗材颜色更换后整页换原图 ----------
# 换色后的原图画布尺寸不同（375×812），盘列表槽位与色卡坐标必须有一套独立量取的值
foreach ($fragment in @(
    '#prepare-stage[data-artwork="colorChanged"] .plate-row { height: 16.0099%; }',
    '#prepare-stage[data-artwork="colorChanged"] .plate-row[data-slot="0"] { top: 27.3399%; }',
    '#prepare-stage[data-artwork="colorChanged"] .plate-row[data-slot="1"] { top: 45.0739%; }',
    '#prepare-stage[data-artwork="colorChanged"] .plate-row[data-slot="2"] { top: 62.931%; }',
    '#prepare-stage[data-artwork="colorChanged"] .plate-material-hit[data-chip="left"]',
    '#prepare-stage[data-artwork="colorChanged"] .plate-material-hit[data-chip="right"]'
)) {
    if (-not $style.Contains($fragment)) {
        throw "Color-changed prepare-print styling is missing: $fragment"
    }
}
# 换色后的 4 张资源必须真实存在，否则切图后会白屏
foreach ($asset in @($prepareChangedBackdrop, $prepareChangedRowOne, $prepareChangedRowTwo, $prepareChangedRowThree)) {
    $assetFile = Join-Path $prototypeRoot $asset
    if (-not (Test-Path -LiteralPath $assetFile)) {
        throw "Color-changed prepare-print asset is missing: $assetFile"
    }
}
$prepareChangedSourceFile = Join-Path $prototypeRoot $prepareChangedSource
if (-not (Test-Path -LiteralPath $prepareChangedSourceFile)) {
    throw "Color-changed prepare-print source artwork is missing: $prepareChangedSourceFile"
}

# ---------- 固件升级链路 ----------
# 首页提醒条 + 设备设置页固件版本行 + 四个固件页面 + 确认弹窗的样式
foreach ($fragment in @(
    '.firmware-banner {',
    '.firmware-banner-cta {',
    '.firmware-status-badge {',
    '.reuse-hotspot--firmware-version {',
    '.reuse-hotspot--firmware-upgrade {',
    '.reuse-hotspot--firmware-done {',
    '.firmware-progress-disc {',
    '.firmware-progress-percent {',
    '.dialog-actions button[data-tone="outline"]',
    '.dialog-actions button[data-tone="upgrade"]'
)) {
    if (-not $style.Contains($fragment)) {
        throw "Firmware upgrade styling is missing: $fragment"
    }
}
# 四张页面图（assets 下、裁白边后归一到 375×812）+ 四张源图都必须真实存在
foreach ($asset in @($firmwareUpgradeAsset, $firmwareVersionAsset, $firmwareProgressAsset, $firmwareDoneAsset, $firmwareUpgradeSource, $firmwareVersionSource, $firmwareProgressSource, $firmwareDoneSource)) {
    if (-not (Test-Path -LiteralPath (Join-Path $prototypeRoot $asset))) {
        throw "Firmware upgrade asset is missing: $asset"
    }
}
# 四张页面图必须都是 375×812，才能和整套百分比热区严格对齐
Add-Type -AssemblyName System.Drawing
foreach ($asset in @($firmwareUpgradeAsset, $firmwareVersionAsset, $firmwareProgressAsset, $firmwareDoneAsset)) {
    $bitmap = [System.Drawing.Image]::FromFile((Join-Path $prototypeRoot $asset))
    try {
        if ($bitmap.Width -ne 375 -or $bitmap.Height -ne 812) {
            throw "Firmware artwork must be normalised to 375x812: $asset is $($bitmap.Width)x$($bitmap.Height)"
        }
    } finally {
        $bitmap.Dispose()
    }
}
# 设备设置页的「儿童账号」入口整条链路已删除（元素 / 页面 / 入口映射 / 旧复用图都不许再出现）
foreach ($removed in @(
    'open-kids-settings',
    'device-settings-kids',
    'kids-entry',
    'deviceSettingsKids',
    ($reuseAssetDir + '/' + [char]0x8bbe + [char]0x5907 + [char]0x8bbe + [char]0x7f6e + [char]0x9875 + [char]0x513f + [char]0x7ae5 + [char]0x7248 + '.png')
)) {
    if ($html.Contains($removed) -or $script.Contains($removed) -or $style.Contains($removed)) {
        throw "The retired 儿童账号 entry is still present: $removed"
    }
}

# ---------- 所有页面适配 iPhone 13 mini（375 × 812） ----------
foreach ($fragment in @('--device-width: 375px;', '--device-height: 812px;', '--frame-height: min(100vh, var(--device-height))', '--frame-top: max(0px, calc((100vh - var(--frame-height)) / 2))', '--frame-right:', '--u: calc(var(--device-width) / 390)', '.scroll-indicator {')) {
    if (-not $style.Contains($fragment)) {
        throw "iPhone 13 mini device frame styling is missing: $fragment"
    }
}
foreach ($fragment in @(
    '.phone-shell { position: relative; width: min(100vw, var(--device-width)); height: var(--frame-height);',
    '.reference-screen { position: fixed; z-index: 30; top: var(--frame-top);',
    '.reuse-screen { position: fixed; z-index: 38; top: var(--frame-top);',
    '.bottom-nav { position: fixed; z-index: 8; bottom: var(--frame-top);'
)) {
    if (-not $style.Contains($fragment)) {
        throw "This layer is not locked to the device frame: $fragment"
    }
}
# 长页面必须在设备框内部纵向滚动，而不是被裁掉
foreach ($fragment in @('overflow-x: hidden; overflow-y: auto;', '.reuse-screen-frame.is-pannable { height: 100%;')) {
    if (-not $style.Contains($fragment)) {
        throw "Vertical scrolling inside the device frame is missing: $fragment"
    }
}
if ($style.Contains('min-height: 100vh')) {
    throw 'The device shell must not stretch to the viewport height; it has to stay 812px tall.'
}
# 旧版按 390 宽写死的 px 偏移必须全部换算过，否则 375 宽下热区会偏
foreach ($fragment in @('top: calc(77 * var(--u));', 'left: calc(226 * var(--u));', 'right: calc(15 * var(--u));', 'height: calc(139.2 * var(--u));', '.source-crop--nav img { top: calc(-769 * var(--u));')) {
    if (-not $style.Contains($fragment)) {
        throw "A 390px-based offset was not rescaled to the 375px frame: $fragment"
    }
}
if (-not $html.Contains('id="scroll-indicator"')) {
    throw 'The device scroll indicator is missing from the markup.'
}
foreach ($fragment in @('function currentScroller()', 'function renderScrollIndicator()', 'function bindScrollIndicator()', 'scrollIndicator.hidden = !overflowing', 'scroller.scrollHeight - scroller.clientHeight > 4')) {
    if (-not $script.Contains($fragment)) {
        throw "Scroll indicator behaviour is missing: $fragment"
    }
}
# 旧的“下一盘 → 打印旅程 Choose your builder”跳转必须彻底消失
foreach ($removed in @('openPrintSettings', 'openNextPlateSettings', 'printJourneyPath', "view: 'settings'")) {
    if ($script.Contains($removed)) {
        throw "The retired 下一盘 -> print journey routing is still present: $removed"
    }
}
if (-not $script.Contains('function startNextPlate()')) {
    throw '下一盘 must start the next queued task in the preparing state.'
}

Write-Host 'Self-developed printer prototype contract checks passed.'

# ==========================================================================
# 分享打印机：入口按钮 + 真实 DOM 分享页 + 成员管理页 + 异常与边界状态
# ==========================================================================
# 本段含中文字面量，依赖文件以 UTF-8 BOM 保存；编码被破坏时先在这一条上炸出来，
# 否则下面的 Contains 断言会全部静默变成 false。
$shareEncodingProbe = '分享打印机'
if ($shareEncodingProbe.Length -ne 5) {
    throw 'prototype-contract.ps1 must stay saved as UTF-8 with BOM (Chinese literals got mangled).'
}

$shareStylePath = Join-Path $prototypeRoot 'styles-share-printer.css'
if (-not (Test-Path -LiteralPath $shareStylePath)) {
    throw "Share-printer stylesheet is missing: $shareStylePath"
}
$shareStyle = Get-Content -LiteralPath $shareStylePath -Raw -Encoding UTF8

if (-not ($html.Contains('<link rel="stylesheet" href="styles-share-printer.css">') -or $html.Contains('<link rel="stylesheet" href="styles-share-printer.css?'))) {
    throw 'The share-printer stylesheet is not linked from index.html.'
}

# 邀请码池：由 assets/_tools_make_share_assets.py 生成，邀请码与二维码成对切换
$sharePoolPath = Join-Path $prototypeRoot 'share-code-pool.js'
if (-not (Test-Path -LiteralPath $sharePoolPath)) {
    throw "Invite code pool is missing: $sharePoolPath"
}
$sharePool = Get-Content -LiteralPath $sharePoolPath -Raw -Encoding UTF8
if (-not ($html.Contains('<script src="share-code-pool.js"></script>') -or $html.Contains('<script src="share-code-pool.js?'))) {
    throw 'The invite code pool script is not loaded by index.html.'
}
foreach ($fragment in @('window.SHARE_CODE_POOL = [', "'ABCD 1234'", "'K7MP 4821'", 'https://app.ugee.com/i/ABCD1234')) {
    if (-not $sharePool.Contains($fragment)) {
        throw "Invite code pool content is missing: $fragment"
    }
}

# 资产：打印机渲染图（透明底，240 x 286）+ 6 张成对的邀请二维码
$sharePrinterAsset = 'assets/分享打印机-打印机.png'
if (-not (Test-Path -LiteralPath (Join-Path $prototypeRoot $sharePrinterAsset))) {
    throw "Share page printer render is missing: $sharePrinterAsset"
}
Add-Type -AssemblyName System.Drawing
$printerBitmap = [System.Drawing.Image]::FromFile((Join-Path $prototypeRoot $sharePrinterAsset))
try {
    if ($printerBitmap.Width -ne 240 -or $printerBitmap.Height -ne 286) {
        throw "Share page printer render must stay 240 x 286, got $($printerBitmap.Width) x $($printerBitmap.Height)"
    }
    if ($printerBitmap.PixelFormat.ToString() -notmatch 'Argb|Alpha') {
        throw "Share page printer render must keep an alpha channel, got $($printerBitmap.PixelFormat)"
    }
} finally {
    $printerBitmap.Dispose()
}
for ($index = 1; $index -le 6; $index += 1) {
    $qrAsset = "assets/分享打印机-二维码-$index.svg"
    if (-not (Test-Path -LiteralPath (Join-Path $prototypeRoot $qrAsset))) {
        throw "Invite QR artwork is missing: $qrAsset"
    }
    if (-not $sharePool.Contains($qrAsset)) {
        throw "Invite QR artwork is not referenced by the code pool: $qrAsset"
    }
}

# ---------- 入口按钮：添加打印机页顶部右侧「分享打印机」 ----------
if (-not $html.Contains('id="open-share-printer" class="add-printer-share-entry"')) {
    throw 'The share-printer entry button is missing the add-printer-share-entry class.'
}
if (-not $html.Contains('<span>分享打印机</span>')) {
    throw 'The share-printer entry button label is missing.'
}
# 入口必须画在添加打印机页的画布内，且在底部 CTA 热区之前
$addPrinterStageStart = $html.IndexOf('id="add-printer-screen"')
$shareEntryIndex = $html.IndexOf('id="open-share-printer"')
$configureIndex = $html.IndexOf('id="configure-new-printer"', $addPrinterStageStart)
if ($addPrinterStageStart -lt 0 -or $shareEntryIndex -lt $addPrinterStageStart -or $shareEntryIndex -gt $configureIndex) {
    throw 'The share-printer entry must sit inside the add-printer stage, before the bottom CTA hotspot.'
}
# 几何：右缘与卡片对齐（原图 79/846），纵向比标题中心低约 10px，命中盒 >= 44px
foreach ($fragment in @(
    '.add-printer-share-entry {',
    'top: 9.44%;',
    'right: 9.34%;',
    'min-width: 44px;',
    'min-height: 44px;',
    'height: 30px;',
    '.add-printer-share-entry-pill {'
)) {
    if (-not $shareStyle.Contains($fragment)) {
        throw "Share-printer entry button geometry is missing: $fragment"
    }
}
if (-not $script.Contains("document.querySelector('#open-share-printer').addEventListener('click'")) {
    throw 'The share-printer entry button has no click handler.'
}

# ---------- 分享页结构 ----------
if (-not $html.Contains('class="reuse-screen share-screen"')) {
    throw 'The share-printer page must join the reuse-screen stack.'
}
foreach ($fragment in @(
    'id="share-printer-screen"',
    'id="share-printer-back"',
    'id="share-device-card"',
    'id="share-device-name"',
    'id="share-device-status"',
    'id="share-device-status-text"',
    'id="share-device-sn"',
    'id="share-device-note"',
    'id="share-switch-printer"',
    'id="share-device-empty"',
    'id="share-add-printer"',
    'id="share-credential"',
    'id="share-qr-image"',
    'id="share-code"',
    'id="share-copy"',
    'id="share-expiry"',
    'id="share-note"',
    'id="share-invite"',
    'id="share-regenerate"',
    'id="share-members-list"',
    'id="share-members-count"',
    'id="share-members-empty"',
    'id="share-manage-members"',
    'id="share-demo-toggle"'
)) {
    if (-not $html.Contains($fragment)) {
        throw "Share-printer page structure is incomplete: $fragment"
    }
}
foreach ($fragment in @(
    'id="member-manage-screen"',
    'id="member-manage-list"',
    'id="member-manage-count"',
    'id="member-manage-note"',
    'id="member-manage-invite"',
    'id="share-device-sheet"',
    'id="share-device-sheet-list"',
    'id="share-target-sheet"',
    'id="share-targets"',
    'id="share-demo-sheet"',
    'id="share-demo-list"',
    'id="share-confirm-dialog"',
    'id="share-alert-dialog"'
)) {
    if (-not $html.Contains($fragment)) {
        throw "Share-printer auxiliary surface is missing: $fragment"
    }
}
# 需求里的中文文案必须原样落在页面上
foreach ($copy in @(
    '分享打印机',
    '邀请家人加入',
    '和家人一起创作',
    '邀请家人使用这台打印机，一起开启 3D 创作之旅。',
    '分享邀请',
    '重新生成邀请码',
    '已共享成员',
    '管理共享成员',
    '受限成员',
    '已加入',
    '有效期剩余',
    '邀请码已复制'
)) {
    if (-not $html.Contains($copy) -and -not $script.Contains($copy)) {
        throw "Required share-printer copy is missing: $copy"
    }
}
# 二维码与邀请码属于同一份凭证：中心图标压在二维码正中
foreach ($fragment in @('class="share-qr-logo"', '.share-qr-logo {', 'place-items: center;')) {
    if (-not $html.Contains($fragment) -and -not $shareStyle.Contains($fragment)) {
        throw "QR center logo is missing: $fragment"
    }
}

# ---------- 分享页样式：主色 / 底色 / 圆角 / 各状态 ----------
foreach ($fragment in @(
    '--sh-blue: #4388f5;',
    '--sh-bg: #f7f9fc;',
    '--sh-radius: 16px;',
    '.share-screen [hidden],',
    '.share-credential[data-state="expired"] .share-code {',
    '.share-credential[data-state="disabled"] .share-qr-image {',
    '.share-status-pill[data-status="offline"] {',
    '.share-member {',
    '.share-members {',
    '.share-demo-toggle {',
    '.share-sheet-layer {'
)) {
    if (-not $shareStyle.Contains($fragment)) {
        throw "Share-printer styling is incomplete: $fragment"
    }
}

# ---------- 分享页行为 ----------
foreach ($fragment in @(
    'const SHARE_MAX_MEMBERS = 5;',
    'const SHARE_EXPIRY_SECONDS = 600;',
    'function shareActiveDevice()',
    'function shareCredentialState()',
    'function shareInviteEnabled()',
    'function regenerateShareCredential(',
    'function copyShareCode()',
    'function shareInvite()',
    'function applyShareScenario(',
    'function openShareConfirm(',
    'function openShareAlert(',
    'navigator.clipboard.writeText(text)',
    "typeof navigator.share === 'function'",
    "showToast('邀请码已复制')",
    "sharePrinter: '#share-printer-screen'",
    "memberManage: '#member-manage-screen'"
)) {
    if (-not $script.Contains($fragment)) {
        throw "Share-printer behaviour is missing: $fragment"
    }
}
# 离线时仍允许创建邀请：只有状态标签变灰，邀请按钮不禁用
if (-not $script.Contains("shareState.scenario === 'offline'")) {
    throw 'The offline scenario override is missing; invites must stay available when the printer is offline.'
}
# 邀请码过期后必须给出重新生成的引导，而不是静默失效
if (-not $script.Contains('邀请码已过期，点下方')) {
    throw 'The expired invite must guide the user to regenerate it.'
}
# 达上限时「分享邀请」必须禁用
if (-not $script.Contains('shareInviteButton.disabled = !shareInviteEnabled();')) {
    throw 'The share button must be disabled when the member limit is reached.'
}
# 四类异常态都必须在演示清单里出现
foreach ($scenario in @("'no-device'", "'offline'", "'expired'", "'member-limit'", "'gen-failed'")) {
    if (-not $script.Contains($scenario)) {
        throw "The abnormal scenario is not implemented: $scenario"
    }
}
# 深链
foreach ($fragment in @("params.get('share')", "reuseScreenNames = {")) {
    if (-not $script.Contains($fragment)) {
        throw "Share-printer deep link support is missing: $fragment"
    }
}

# ---------- 已被替换 / 已废弃的实现不得复活 ----------
foreach ($retired in @(
    'id="share-regenerate-dialog"',
    'id="share-error-dialog"',
    'id="share-regenerate-title"',
    'id="share-error-actions"',
    'assets/分享打印机-二维码.svg',
    '.share-demo-toggle { position: fixed;'
)) {
    if ($html.Contains($retired) -or $shareStyle.Contains($retired)) {
        throw "A retired share-printer implementation came back: $retired"
    }
}

Write-Host 'Share-printer contract checks passed.'

