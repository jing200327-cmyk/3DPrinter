$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "Prototype entry is missing: $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
# 原型修改复用图片资源 / 连接配网结束.png
$reuseAssetDir = '../../' + [char]0x539f + [char]0x578b + [char]0x4fee + [char]0x6539 + [char]0x590d + [char]0x7528 + [char]0x56fe + [char]0x7247 + [char]0x8d44 + [char]0x6e90
$pairingFinishedAsset = $reuseAssetDir + '/' + [char]0x8fde + [char]0x63a5 + [char]0x914d + [char]0x7f51 + [char]0x7ed3 + [char]0x675f + '.png'
$printerHomePath = '../../dayinji/' + [char]0x81ea + [char]0x7814 + [char]0x6b3e + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x6253 + [char]0x5370 + [char]0x9875 + [char]0x9762 + [char]0x539f + [char]0x578b + '/index.html'
$finishHotspotLabel = -join [char[]](0x5df2, 0x5b8c, 0x6210, 0xff0c, 0x53d6, 0x6d88)
$wifiExampleAsset = '../../src/lianjiepeiwnag/WiFi' + [char]0x8bbe + [char]0x7f6e + [char]0x793a + [char]0x610f + [char]0x56fe + '.jpg'
$locationPromptCopy = -join [char[]](0x8fde, 0x63a5, 0x6253, 0x5370, 0x673a, 0x524d, 0x9700, 0x8981, 0x5f00, 0x542f, 0x41, 0x50, 0x50, 0x4f4d, 0x7f6e, 0x6743, 0x9650)
$hotspotReturnHintCopy = -join [char[]](0x8bbe, 0x7f6e, 0x597d, 0x540e, 0x8fd4, 0x56de, 0xff0c, 0x5c06, 0x81ea, 0x52a8, 0x8fdb, 0x5165, 0x7f51, 0x7edc, 0x914d, 0x7f6e)
$deprecatedReturnHintCopy = -join [char[]](0x5728, 0x4f60, 0x8bbe, 0x7f6e, 0x597d)
# 打印前准备页（真实 DOM）用到的文案：打印机已连接 / 三步耗材操作 / 回退按钮无障碍名
$connectedTitleCopy = -join [char[]](0x6253, 0x5370, 0x673a, 0x5df2, 0x8fde, 0x63a5)
$filamentInsertCopy = -join [char[]](0x5c06, 0x8017, 0x6750, 0x63d2, 0x5165, 0xff0c, 0x5411, 0x55b7, 0x5934, 0x91cc, 0x63a8, 0x9001, 0x8017, 0x6750, 0xff0c, 0x76f4, 0x81f3, 0x65e0, 0x6cd5, 0x524d, 0x8fdb, 0x3002)
$filamentFeedCopy = -join [char[]](0x0041, 0x0050, 0x0050, 0x81ea, 0x52a8, 0x8bc6, 0x522b, 0x5230, 0x8017, 0x6750, 0x8fdb, 0x5165, 0xff0c, 0x9009, 0x4e2d, 0x8017, 0x6750, 0xff0c, 0x7f16, 0x8f91, 0x8017, 0x6750, 0x4fe1, 0x606f, 0x5e76, 0x70b9, 0x51fb, 0x8fdb, 0x6599, 0x3002)
$filamentNozzleCopy = -join [char[]](0x5982, 0x679c, 0x55b7, 0x5934, 0x6b63, 0x5e38, 0x5410, 0x51fa, 0x6599, 0x4e1d, 0xff0c, 0x5219, 0x5b8c, 0x6210, 0x8fdb, 0x6599, 0x3002)
$backButtonLabel = -join [char[]](0x8fd4, 0x56de, 0x6253, 0x5370, 0x673a, 0x6253, 0x5370, 0x9875, 0x9762)
# 统一关闭确认弹窗的固定文案与两种按钮文案
$closeConfirmCopy = -join [char[]](0x6253, 0x5370, 0x524d, 0xff0c, 0x8bf7, 0x52a1, 0x5fc5, 0x5b8c, 0x6210, 0x6253, 0x5370, 0x673a, 0x8bbe, 0x7f6e, 0xff0c, 0x53ea, 0x9700, 0x51e0, 0x5206, 0x949f, 0x5373, 0x53ef, 0x5b8c, 0x6210)
$confirmLabel = -join [char[]](0x786e, 0x8ba4)
$cancelLabel = -join [char[]](0x53d6, 0x6d88)
# 终页标题，用于断言终页的关闭图标保持 direct 模式
$printReadyTitle = -join [char[]](0x6253, 0x5370, 0x524d, 0x51c6, 0x5907)
# 「帮助」→ 常见问题解决方案弹窗：底部文案与蓝色下划线外链文案（需求文档 2.2-1 逻辑第 4 点）
$faqFootPrefix = -join [char[]](0x3010, 0x8be6, 0x60c5, 0x67e5, 0x770b)          # 【详情查看
$faqFootSuffix = -join [char[]](0x3011)                                          # 】
$faqLinkCopy = -join [char[]](0x8fde, 0x63a5, 0x914d, 0x7f51, 0x5e38, 0x89c1, 0x95ee, 0x9898)  # 连接配网常见问题
$faqTitleCopy = -join [char[]](0x8fde, 0x63a5, 0x914d, 0x7f51, 0x5e38, 0x89c1, 0x95ee, 0x9898)  # 连接配网常见问题
# 【连接等待】页圆心文案（需求文档 2.2-5 逻辑第 2 点）
$connectingCopy = -join [char[]](0x6b63, 0x5728, 0x8fde, 0x63a5, 0x6253, 0x5370, 0x673a, 0x4e2d)  # 正在连接打印机中
# 60s 超时提醒文案（需求文档原文，此处用「，」而非即时校验的「：」）
$timeoutErrorCopy = -join [char[]](0x8fde, 0x63a5, 0x5931, 0x8d25, 0xff0c, 0x8bf7, 0x68c0, 0x67e5, 0xff1a, 0x0031, 0x002e, 0x0057, 0x0069, 0x0046, 0x5bc6, 0x7801, 0x662f, 0x5426, 0x6b63, 0x786e, 0xff1b, 0x0032, 0x002e, 0x5728, 0x70b9, 0x51fb, 0x8fde, 0x63a5, 0x524d, 0x624b, 0x673a, 0x662f, 0x5426, 0x8fde, 0x63a5, 0x4e0a, 0x6253, 0x5370, 0x673a, 0x0057, 0x0069, 0x0046, 0x70ed, 0x70b9)
$requiredFragments = @(
    'id="screen-start"',
    'id="start-reference"',
    'id="add-printer"',
    'id="screen-printer-select"',
    'id="printer-select-cover"',
    'class="reference-cover"',
    'id="location-dialog"',
    'id="location-cancel"',
    'id="location-settings"',
    'id="screen-system-settings"',
    'id="settings-back"',
    'id="wlan-home"',
    'id="wlan-printer"',
    'id="wlan-other"',
    'id="printer-type"',
    'id="screen-printer-ready"',
    'id="power-reference"',
    'id="network-reference"',
    'id="ready-next"',
    'id="screen-hotspot"',
    'id="video-placeholder"',
    'id="wifi-example-placeholder"',
    'id="wifi-example-reference"',
    $wifiExampleAsset,
    'id="open-wlan"',
    'id="screen-home-wifi"',
    'id="home-wifi-name"',
    'id="home-wifi-password"',
    'id="connect-home-wifi"',
    'id="connecting-dialog"',
    'id="connection-success"',
    'id="notice-dialog"',
    'id="notice-message"',
    'id="notice-confirm"',
    'id="screen-print-ready"',
    'id="print-ready-title"',
    'id="print-ready-back"',
    'class="connected-banner"',
    'class="connected-check"',
    'class="filament-guide-title"',
    'class="filament-steps"',
    'class="filament-step"',
    'class="filament-step-index"',
    'class="filament-step-media"',
    'class="filament-media-placeholder"',
    'id="goto-filament"',
    'id="goto-print"',
    $connectedTitleCopy,
    $filamentInsertCopy,
    $filamentFeedCopy,
    $filamentNozzleCopy,
    ('aria-label="' + $backButtonLabel + '"'),
    'aria-live="polite"',
    # 统一关闭确认：除终页外都标 confirm，终页标 direct
    'data-close="confirm"',
    'data-close="direct"',
    # 「帮助」→ 连接配网常见问题解决方案弹窗（需求文档 2.2-1 逻辑第 4 点）
    'href="styles-pairing-help.css"',
    'id="start-help"',
    'id="start-help-v2"',
    'class="hotspot-help"',
    'id="faq-dialog"',
    'id="faq-title"',
    'id="faq-close"',
    'class="sheet-body"',
    'class="faq-list"',
    'class="faq-item"',
    'class="faq-q"',
    'class="faq-a"',
    'id="faq-more"',
    'id="faq-link"',
    'class="faq-more__link"',
    ('>' + $faqTitleCopy + '</h2>'),
    $faqFootPrefix,
    ('>' + $faqLinkCopy + '</a>'),
    # 【连接等待】页：蓝色填充圆圈 + 浅蓝水波纹虚线圆圈（需求文档 2.2-5 逻辑第 2 点）
    'class="sheet connecting-sheet"',
    'class="connecting-stage"',
    'class="connecting-visual"',
    'class="ripple ripple--1"',
    'class="ripple ripple--2"',
    'class="ripple ripple--3"',
    'class="connecting-core"',
    'id="connecting-core-text"',
    'class="connecting-tip"',
    'id="connecting-seconds"',
    'id="connecting-limit-note"',
    'id="connecting-done"',
    'id="connecting-timeout"',
    ('>' + $connectingCopy + '...</span>'),
    ('>' + $connectingCopy + '...</h2>')
)

foreach ($fragment in $requiredFragments) {
    if (-not $html.Contains($fragment)) {
        throw "Required pairing-flow contract is missing: $fragment"
    }
}

# 三页走二次确认、一页直接关闭，数量固定，防止新增页面漏接线
$confirmCloseCount = ([regex]::Matches($html, 'data-close="confirm"')).Count
$directCloseCount = ([regex]::Matches($html, 'data-close="direct"')).Count
if ($confirmCloseCount -ne 3) {
    throw "Expected 3 confirm-mode close buttons, found $confirmCloseCount"
}
if ($directCloseCount -ne 1) {
    throw "Expected exactly 1 direct-mode close button (print-ready), found $directCloseCount"
}
# 终页必须是 direct（不加二次确认），否则会把二次确认加到不该加的页上
if (-not $html.Contains('id="print-ready-title" tabindex="-1">' + $printReadyTitle + '</h1><button type="button" data-close="direct"')) {
    throw "The print-ready close button must stay in direct mode"
}

if (-not $html.Contains($locationPromptCopy)) {
    throw 'Location-permission prompt copy was not updated.'
}

if (-not $html.Contains($hotspotReturnHintCopy)) {
    throw 'Hotspot return hint copy was not updated to the automatic network-configuration wording.'
}

if ($html.Contains($deprecatedReturnHintCopy)) {
    throw 'The deprecated hotspot return hint copy must be removed.'
}

if ($html.Contains('class="wifi-hero"')) {
    throw 'The deprecated orange network-configuration hero must be removed.'
}

if ($html.Contains('id="hotspot-next"')) {
    throw 'The hotspot page must no longer offer a standalone next-step button.'
}

# FAQ 弹窗底部必须整体呈现【详情查看连接配网常见问题】，且链接部分用 <a> 包住蓝色下划线文案
if (-not $html.Contains($faqFootPrefix + '<a id="faq-link"')) {
    throw 'The FAQ sheet footer must read【详情查看 + 连接配网常见问题 link】.'
}
if (-not $html.Contains($faqFootSuffix)) {
    throw 'The FAQ sheet footer is missing its closing bracket.'
}

if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Prototype behavior script is missing: $scriptPath"
}

$script = Get-Content -LiteralPath $scriptPath -Raw -Encoding UTF8
$requiredBehaviors = @(
    "showScreen('printer-select')",
    'locationDialog.showModal()',
    "showScreen('system-settings')",
    "showScreen('printer-ready')",
    "showScreen('hotspot')",
    "let selectedWlan = 'Home_5G'",
    'printerHotspotConnected',
    "EXPECTED_HOME_WIFI_PASSWORD = '12345678'",
    'showNotice',
    "if (settingsReturnTarget !== 'hotspot')",
    'printerHotspotConnected = selectedWlan === PRINTER_WLAN',
    'MISSING_PRINTER_WIFI_MESSAGE',
    "showScreen('home-wifi')",
    'connectingDialog.showModal()',
    'window.setTimeout',
    "showScreen('print-ready')",
    "const PRINTER_HOME_PATH = '$printerHomePath';",
    "document.querySelector('#print-ready-back').addEventListener('click'",
    "document.querySelector('#goto-filament').addEventListener('click'",
    "document.querySelector('#goto-print').addEventListener('click'",
    'window.location.href = PRINTER_HOME_PATH',
    '?highlight=filament',
    '?screen=explore-toys',
    # 统一关闭确认：可复用组件 + 两种关闭模式 + 取消不动状态 / 确认跳工作台
    'function createConfirmDialog(',
    'const EXIT_PAIRING_CONFIRM = createConfirmDialog({',
    "message: '$closeConfirmCopy'",
    "confirmText: '$confirmLabel'",
    "cancelText: '$cancelLabel'",
    'function resetPairingFlowState()',
    "document.querySelectorAll('[data-close]').forEach",
    "if (button.dataset.close === 'direct')",
    'const confirmed = await EXIT_PAIRING_CONFIRM.ask(event);',
    'if (!confirmed) return;',
    'resetPairingFlowState();',
    'window.location.href = PRINTER_HOME_PATH;',
    # 支持从其他原型深链到指定页面（?screen=...）
    "new URLSearchParams(window.location.search).get('screen')",
    'showScreen(requestedScreen)',
    # 「帮助」→ 常见问题解决方案弹窗：两个起始页都接线、点遮罩关闭、外链模拟跳转
    'function openFaqDialog()',
    "document.querySelector('#start-help').addEventListener('click', openFaqDialog);",
    "document.querySelector('#start-help-v2').addEventListener('click', openFaqDialog);",
    "document.querySelector('#faq-close').addEventListener('click'",
    'const FAQ_URL =',
    'function goToFaqLink(',
    # 【连接等待】页：进入 / 正常收 / 60s 超时收 / 超时后清空密码框
    'function openConnectingSheet()',
    'function finishConnectingAsSuccess()',
    'function finishConnectingAsTimeout()',
    'function clearConnectingTimers()',
    'openConnectingSheet();',
    "document.querySelector('#connecting-done').addEventListener('click', finishConnectingAsSuccess);",
    "document.querySelector('#connecting-timeout').addEventListener('click', finishConnectingAsTimeout);",
    'const WIFI_TIMEOUT_ERROR =',
    "wifiPassword.value = '';",
    "window.clearInterval(connectingTicker);",
    "if (faqDialog.open) faqDialog.close();"
)

foreach ($behavior in $requiredBehaviors) {
    if (-not $script.Contains($behavior)) {
        throw "Required pairing-flow behavior is missing: $behavior"
    }
}

$forbiddenFragments = @(
    'id="print-ready-filament-reference"',
    'class="final-screen"',
    'class="success-hero"',
    'class="prep-illustration"',
    # 打印前准备页已改为真实 DOM，整图 + 图上热区这套旧实现不应再出现
    'class="final-reference-stage"',
    'class="final-reference-image"',
    'class="image-hotspot image-hotspot--finish"',
    'id="finish-network-setup"'
)

foreach ($fragment in $forbiddenFragments) {
    if ($html.Contains($fragment)) {
        throw "Superseded print-preparation content is still present: $fragment"
    }
}

Write-Host 'Printer pairing-flow prototype contract checks passed.'
