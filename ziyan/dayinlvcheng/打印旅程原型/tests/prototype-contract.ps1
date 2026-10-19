$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $prototypeRoot 'index.html'
$scriptPath = Join-Path $prototypeRoot 'prototype.js'
$stylePath = Join-Path $prototypeRoot 'styles.css'

foreach ($path in @($htmlPath, $scriptPath, $stylePath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Print journey prototype file is missing: $path"
    }
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
$assetRoot = '../../src/dayinji/'
$modelDetailAsset = $assetRoot + [char]0x6a21 + [char]0x578b + [char]0x8be6 + [char]0x60c5 + [char]0x9875 + '.jpg'
$plateOneAsset = $assetRoot + [char]0x9009 + [char]0x4e2d + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '1.jpg'
$plateTwoAsset = $assetRoot + [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '2' + [char]0xff08 + [char]0x4fee + [char]0x6539 + [char]0xff09 + '.jpg'
$plateThreeAsset = $assetRoot + [char]0x9009 + [char]0x62e9 + [char]0x8981 + [char]0x6253 + [char]0x5370 + [char]0x7684 + [char]0x76d8 + '3.jpg'
$warehouseAsset = $assetRoot + [char]0x9009 + [char]0x62e9 + [char]0x4ed3 + [char]0x5185 + [char]0x8017 + [char]0x6750 + '.jpg'
$printingNotice = '' + [char]0x6253 + [char]0x5370 + [char]0x673a + [char]0x6b63 + [char]0x5728 + [char]0x6253 + [char]0x5370
$requiredHtml = @(
    'id="screen-model"',
    'id="model-reference"',
    $modelDetailAsset,
    'id="print-now"',
    'id="screen-settings"',
    'id="printing-notice"',
    $printingNotice,
    'id="plate-carousel"',
    'id="part-title"',
    'data-plate="1"',
    'data-plate="2"',
    'data-plate="3"',
    $plateOneAsset,
    $plateTwoAsset,
    $plateThreeAsset,
    'id="selected-model-image"',
    'id="open-preview"',
    'name="feed-source"',
    'id="open-filament-picker"',
    'id="filament-picker"',
    $warehouseAsset,
    'data-filament-slot="3"',
    'disabled',
    'id="copy-minus"',
    'id="copy-count"',
    'id="copy-plus"',
    'id="print-calibration"',
    'id="timelapse"',
    'id="start-print"',
    'id="upload-dialog"',
    'id="upload-progress"',
    'aria-live="polite"'
)

foreach ($fragment in $requiredHtml) {
    if (-not $html.Contains($fragment)) {
        throw "Required print journey contract is missing: $fragment"
    }
}

$script = Get-Content -LiteralPath $scriptPath -Raw -Encoding UTF8
$previewText = '' + [char]0x5df2 + [char]0x6253 + [char]0x5f00 + [char]0x9884 + [char]0x89c8
$previewBehavior = "showToast('$previewText')"
$requiredBehaviors = @(
    'selectPlate',
    'const jobPlate',
    "card.dataset.plate === jobPlate",
    "plateCarousel.addEventListener('pointerdown'",
    "plateCarousel.addEventListener('pointermove'",
    'plateDragActive',
    'suppressPlateClick',
    'selectFilament',
    $previewBehavior,
    'copyCount',
    'window.setTimeout',
    '2000',
    "status === 'printing'",
    "status === 'completed'",
    'URLSearchParams'
)

foreach ($behavior in $requiredBehaviors) {
    if (-not $script.Contains($behavior)) {
        throw "Required print journey behavior is missing: $behavior"
    }
}

$style = Get-Content -LiteralPath $stylePath -Raw -Encoding UTF8
$requiredStyles = @(
    'right: 2.5%',
    'bottom: 6.8%',
    'width: 185px',
    'height: 258px',
    'touch-action: pan-y',
    'pointer-events: none',
    'font-size: 0',
    'color: transparent',
    '.has-job-status',
    '.picker-options button[data-filament-slot="1"]'
)

foreach ($fragment in $requiredStyles) {
    if (-not $style.Contains($fragment)) {
        throw "Required print journey style is missing: $fragment"
    }
}

Write-Host 'Print journey prototype contract checks passed.'
