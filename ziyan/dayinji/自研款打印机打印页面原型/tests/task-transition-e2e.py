"""Closing a progress popup must not cancel task completion or freeze controls."""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from playwright.sync_api import sync_playwright, expect
import os
import tempfile

BASE = os.environ.get('PRINTER_PAGE_URL', (Path(__file__).resolve().parents[1] / 'index.html').as_uri())
OUT = Path(os.environ.get('TASK_TRANSITION_SHOTS') or tempfile.mkdtemp(prefix='task-transition-'))
OUT.mkdir(exist_ok=True)
def url(**params):
    parts = urlsplit(BASE)
    return urlunsplit(parts._replace(query=urlencode({**dict(parse_qsl(parts.query)), **params})))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.clock.install()
    page.clock.pause_at(2000000000000)
    page.goto(url(status='printing'))
    pause = page.locator('#pause-print')
    cancel = page.locator('#cancel-print')
    overlay = page.locator('#transition-overlay')
    close = page.locator('#transition-close')
    pause.click()
    expect(overlay).to_be_visible()
    expect(pause).to_be_disabled()
    expect(page.locator('#finish-now')).to_be_disabled()
    overlay.screenshot(path=str(OUT/'pause-popup.png'))
    close.click()
    expect(overlay).to_be_hidden()
    page.clock.run_for(2100)
    expect(page.locator('#task-state')).to_have_text('已暂停')
    expect(pause).to_be_enabled()
    expect(cancel).to_be_enabled()
    expect(pause).to_contain_text('继续')
    pause.click()
    close.click()
    page.clock.run_for(2100)
    expect(page.locator('#task-state')).to_have_text('打印中')
    expect(pause).to_be_enabled()
    expect(pause).to_contain_text('暂停')
    print('PASS: pause/resume completes after closing popup and restores controls')
    for single, all_tasks in [(False, False), (False, True), (True, True)]:
        page.goto(url(status='printing', **({'plates':'single'} if single else {})))
        cancel.click()
        page.locator('#dialog-confirm' if all_tasks else '#dialog-dismiss').click()
        expect(overlay).to_be_visible()
        close.click()
        page.clock.run_for(2100)
        expect(page.locator('#task-state')).to_have_text('已取消打印任务')
        expected = 'cancelled-all' if all_tasks else 'cancelled'
        expect(page.locator('#task-panel')).to_have_attribute('data-status', expected)
        expect(page.locator('#cancelled-explore-toys' if all_tasks else '#restart-print')).to_be_visible()
    print('PASS: current/all/single task cancellation completes after closing popup')
    page.goto(url(status='printing'))
    pause.click()
    page.clock.run_for(2100)
    expect(overlay).to_be_hidden()
    expect(page.locator('#task-state')).to_have_text('已暂停')
    for width in [320, 375, 1440]:
        page.set_viewport_size({'width':width,'height':950})
        pause.click()
        image = overlay.locator('.transition-mascot')
        expect(image).to_have_attribute('src','assets/任务处理中-完整人物.png')
        assert image.evaluate('(img) => img.complete && img.naturalHeight > img.naturalWidth')
        overlay.locator('.transition-card').screenshot(path=str(OUT/f'complete-mascot-{width}.png'))
        close.click()
        page.clock.run_for(2100)
    assert not errors, errors
    browser.close()
    print('PASS: automatic dismissal, complete artwork, narrow-screen rendering, no script errors')
