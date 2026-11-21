"""Run with Python Playwright against a local Finkas preview.

python tests/browser/workspace_parity.py http://localhost:8099
Set CHROME_BIN to use an installed Chromium executable.
"""
import os
import sys
from itertools import product
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8099"
PROTOTYPE = "prototype-hybrid-kinetic.html"
MONTHS = "Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split()


def prototype_group(page):
    # Evaluate the prototype's own fixture factory in the isolated browser.
    source = (ROOT / PROTOTYPE).read_text()
    start = source.index("function bindGroupYear(")
    end = source.index("var state = {", source.index("function makeInitialDatasets("))
    return page.evaluate("() => {" + source[start:end] + "return makeInitialDatasets().rt05;}")


def snapshot(group):
    return {
        "anggota": [
            {"ID_Anggota": m["id"], "Nama_Anggota": m["name"], "Status_Aktif": "Aktif"}
            for m in group["members"]
        ],
        "kategori": [
            {"ID_Kategori": name, "Nama_Kategori": name, "Tipe": flow}
            for key, flow in (("inflow", "Masuk"), ("outflow", "Keluar"))
            for name in group["categories"][key]
        ],
        "transaksi": [
            {
                "ID_Transaksi": tx["id"], "Nominal": tx["amount"],
                "ID_Anggota": tx.get("memberId") or "-", "Keterangan": tx["note"],
                "ID_Kategori": tx["category"], "Timestamp": tx["date"] + "T12:00:00+07:00",
                "Tipe_Arus": "Masuk" if tx["type"] == "inflow" else "Keluar",
                "Bulan_Iuran": MONTHS[tx["paidMonth"]] if "paidMonth" in tx else "-",
                "Tahun_Iuran": 2026,
            } for tx in group["transactions"]
        ],
        "settings": {"kasStart": "01-2026", "skippedMonths": []},
    }


def check_workspace(browser, width, theme):
    height = 820 if width == 1280 else 844
    context = browser.new_context(
        viewport={"width": width, "height": height}, color_scheme=theme,
        reduced_motion="reduce", service_workers="block",
    )
    context.route("https://**/*", lambda route: route.abort())
    proto = context.new_page()
    proto.add_init_script("localStorage.setItem('finkas-hybrid-tour-seen-v1','1')")
    proto.goto(f"{BASE}/{PROTOTYPE}", wait_until="domcontentloaded")
    proto.evaluate("theme => {document.documentElement.dataset.theme = theme}", theme)
    data = snapshot(prototype_group(proto))

    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.clock.set_fixed_time("2026-11-19T12:00:00+07:00")
    page.add_init_script("""
        localStorage.setItem('finkas_palette', 'terracotta');
        localStorage.setItem('finkas_active_group', 'rt05');
        localStorage.setItem('finkas_active_group_name', 'RT 05 Melati');
        localStorage.setItem('finkas_group_open', '1');
        localStorage.setItem('finkas_group_sessions', '{"rt05":"fixture"}');
        localStorage.setItem('finkas_tour_seen_v1', '["rt05"]');
    """ + f"localStorage.setItem('theme','{theme}')")
    page.route("**/api/**", lambda route: route.fulfill(json={
        "status": True, "data": data if route.request.post_data_json.get("action") == "read" else {},
    }))
    page.emulate_media(reduced_motion="no-preference")
    page.add_init_script("""document.addEventListener('DOMContentLoaded', () => {
        window.balanceFrames = [];
        const balance = document.getElementById('ui-saldo');
        new MutationObserver(() => {
            if (balance.getClientRects().length)
                window.balanceFrames.push(Number(balance.textContent.replace(/[^0-9-]/g, '')));
        }).observe(balance, {childList: true, subtree: true, characterData: true});
    })""")
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    expect(page.locator("main.container")).to_be_visible()
    balance = sum((1 if row["Tipe_Arus"] == "Masuk" else -1) * row["Nominal"] for row in data["transaksi"])
    page.wait_for_function("total => window.balanceFrames.includes(total)", arg=balance)
    assert page.evaluate("total => window.balanceFrames.some(n => n > 0 && n < total)", balance)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_function("total => window.balanceFrames.includes(total)", arg=balance)
    assert page.evaluate("total => window.balanceFrames.some(n => n > 0 && n < total)", balance)
    for selector in (".kasi-body-rig", ".kasi-tail-rig", ".kasi-head-rig", ".kasi-eye-blink"):
        style = "e => [getComputedStyle(e).animationName, getComputedStyle(e).animationDuration]"
        proto.emulate_media(reduced_motion="no-preference")
        assert page.locator("#kasi-fab " + selector).first.evaluate(style) == proto.locator("#kasi-fab " + selector).first.evaluate(style)
    assert page.locator("#kasi-fab").bounding_box()["width"] == (54 if width == 390 else 64)
    page.locator("#kasi-fab").click()
    page.locator('[data-kasi="flip"]').click()
    expect(page.locator("#kasi-fab .kasi-body-rig")).to_have_css("animation-name", "kasi-salto-flip")
    page.keyboard.press("Escape")
    page.emulate_media(reduced_motion="reduce")
    proto.emulate_media(reduced_motion="reduce")
    for tab in (proto, page):
        tab.evaluate("document.fonts.ready")
    for actual, reference in [
        (".bento-balance", ".kpi-hero-vault"), (".bento-in", ".kpi-card:nth-child(2)"),
        (".bento-out", ".kpi-card:nth-child(3)"), (".workspace-head", ".workspace-head"),
    ]:
        app_box = page.locator(actual).bounding_box()
        ref_box = proto.locator(reference).bounding_box()
        assert abs(app_box["height"] - ref_box["height"]) <= 1, (actual, app_box, ref_box)
        if width == 390:
            assert abs(app_box["width"] - ref_box["width"]) <= 1, (actual, app_box, ref_box)
    page.locator(".bento-out").click()
    page.locator(".ledger-row").first.click()
    expect(page.locator(".receipt-drawer")).to_be_visible()
    assert page.locator(".receipt-drawer").bounding_box()["width"] == min(width, 460)
    expect(page.locator(".receipt-seal")).to_contain_text("TERCATAT · ARSIP KAS")
    page.keyboard.press("Escape")
    page.locator("#workspace-tab-stats").click()
    expect(page.locator("#hybrid-chart-readout")).to_contain_text("Saldo")
    page.locator("#kasi-fab").click()
    page.locator('[data-kasi="guide"]').click()
    for step in range(1, 6):
        expect(page.locator("#guided-tour-count")).to_have_text(f"Langkah {step} dari 5")
        page.locator('#modal-guided-tour [data-step="next"]').click()
    expect(page.locator("#modal-guided-tour")).to_be_hidden()
    page.evaluate("""async () => {
        const state = await import('/src/core/state.js');
        state.setAdminSession('fixture');
        (await import('/src/handlers/auth.js')).handleUI();
        (await import('/src/render/dashboard.js')).renderDashboard();
    }""")
    expect(page.locator("#priority-members button")).to_have_count(4)
    page.locator("#priority-members button").first.click()
    expect(page.locator("#modal-quickpay")).to_be_visible()
    expect(page.locator("#qp-nominal")).to_have_value("10.000")
    page.locator('#modal-quickpay [data-action="close-modal"]').last.click()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert not errors, errors
    context.close()
    print(f"{width}x{height} {theme} OK", flush=True)


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get("CHROME_BIN"))
        for size, mode in product((1280, 390), ("light", "dark")):
            check_workspace(browser, size, mode)
        browser.close()
