from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from playwright.sync_api import sync_playwright, expect
import os
import tempfile

BASE = os.environ.get('PRINTER_PAGE_URL', (Path(__file__).resolve().parents[1] / 'index.html').as_uri())
OUT = Path(os.environ.get('COMPLETED_MODELS_SHOTS') or tempfile.mkdtemp(prefix='completed-models-'))
OUT.mkdir(exist_ok=True)
def url(**params):
    parts = urlsplit(BASE)
    return urlunsplit(parts._replace(query=urlencode({**dict(parse_qsl(parts.query)), **params})))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':375,'height':812}, device_scale_factor=2, reduced_motion='reduce')
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    def dismiss_celebration():
        modal = page.locator('#completion-celebration')
        if modal.count() and modal.is_visible():
            page.locator('.cc-acknowledge').click()
    for name, params in [('single', {'plates':'single'}), ('last-plate', {'plate':'3','completed':'1,2'})]:
        page.goto(url(status='printing', **params))
        expect(page.locator('#completed-my-models')).to_be_hidden()
        page.locator('#finish-now').click()
        dismiss_celebration()
        button=page.locator('#completed-my-models')
        expect(button).to_be_visible()
        expect(button).to_have_attribute('aria-label','我的模型')
        expect(button.locator('span').last).to_have_text('我的模型')
        expect(page.locator('#next-plate')).to_be_hidden()
        expect(page.locator('#restart-print')).to_be_visible()
        page.locator('#device-page').screenshot(path=str(OUT/f'{name}-complete.png'), style='#simulation-console, #toast, .scroll-indicator { visibility: hidden !important; }')
        button.click()
        expect(page.locator('#reference-screen')).to_be_visible()
        expect(page.locator('#reference-title')).to_have_text('我的模型')
        page.locator('#reference-back').click()
        expect(page.locator('#task-panel')).to_have_attribute('data-status','completed')
        expect(button).to_be_visible()
        page.reload()
        dismiss_celebration()
        expect(button).to_be_visible()
        print(f'PASS: {name} completed shows My Models, opens existing destination, preserves result and reload')
    page.goto(url(status='completed',plate='1',completed='1'))
    dismiss_celebration()
    expect(page.locator('#next-plate')).to_be_visible()
    expect(page.locator('#completed-my-models')).to_be_hidden()
    page.goto(url(status='printing',plates='single'))
    page.locator('#cancel-print').click()
    page.locator('#dialog-confirm').click()
    expect(page.locator('#cancelled-model-actions')).to_be_visible()
    expect(page.locator('#completed-my-models')).to_be_hidden()
    assert not errors, errors
    browser.close()
    print('PASS: unfinished queue retains Next Plate; cancellation behavior and page scripts remain valid')
