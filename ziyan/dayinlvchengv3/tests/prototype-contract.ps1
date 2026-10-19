$ErrorActionPreference = 'Stop'

$prototypeRoot = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $prototypeRoot 'index.html') -Raw -Encoding UTF8
$script = Get-Content -LiteralPath (Join-Path $prototypeRoot 'prototype.js') -Raw -Encoding UTF8
$girlTaskOne = '../src/dayinjirenwukongzhi/' + [char]0x5973 + [char]0x5b69 + [char]0x7684 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1 + '_1.jpg'
$girlTaskTwo = '../src/dayinjirenwukongzhi/' + [char]0x5973 + [char]0x5b69 + [char]0x7684 + [char]0x6253 + [char]0x5370 + [char]0x4efb + [char]0x52a1 + '_2.jpg'

foreach ($fragment in @(
    'Choose your builder',
    'Choose your color',
    '>Add it</button>',
    'id="printing-notice"',
    'data-task="girl-1"',
    'data-task="girl-2"',
    $girlTaskOne,
    $girlTaskTwo
)) {
    if (-not $html.Contains($fragment)) { throw "Missing girls journey UI contract: $fragment" }
}

foreach ($behavior in @(
    "const girlTaskIds = ['girl-1', 'girl-2']",
    'const girlTaskAssets',
    "status = params.get('status') || 'printing'",
    "source: 'journey-v3'",
    "family: 'multi'",
    "params.get('entry') === 'queue'"
)) {
    if (-not $script.Contains($behavior)) { throw "Missing girls journey behavior contract: $behavior" }
}

Write-Host 'Girls print journey contract checks passed.'
