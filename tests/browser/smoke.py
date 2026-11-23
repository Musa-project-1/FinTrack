"""Self-contained browser smoke suite for Finkas (Desktop + Mobile, offline API mocks)."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import sys
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
VIEWPORTS = (("desktop", 1280, 820), ("mobile", 390, 844))
GROUPS = [
    {"id": "GRP-A", "nama": "RT 05 Melati"},
    {"id": "GRP-B", "nama": "Kas Kelas 12"},
]
PINS = {"GRP-A": ("1234", "pin-tok-a"), "GRP-B": ("5678", "pin-tok-b")}


def build_snapshot(group_id):
    if group_id == "GRP-B":
        return {
            "groupId": "GRP-B",
            "groupName": "Kas Kelas 12",
            "version": 2,
            "anggota": [
                {"ID_Anggota": "B1", "Nama_Anggota": "Citra Lestari", "Status_Aktif": "Aktif", "Tanggal_Gabung": "2026-01-01"},
            ],
            "kategori": [
                {"ID_Kategori": "KB1", "Nama_Kategori": "Kas Mingguan", "Tipe": "Masuk"},
            ],
            "transaksi": [
                {
                    "ID_Transaksi": "TXB-1",
                    "Nominal": 250000,
                    "ID_Anggota": "B1",
                    "ID_Kategori": "KB1",
                    "Keterangan": "Kas Kelas",
                    "Timestamp": "2026-09-04T09:00:00+07:00",
                    "Tipe_Arus": "Masuk",
                    "Bulan_Iuran": "September",
                    "Tahun_Iuran": 2026,
                },
            ],
            "settings": {"kasStart": "01-2026", "skippedMonths": []},
        }
    return {
        "groupId": "GRP-A",
        "groupName": "RT 05 Melati",
        "version": 5,
        "anggota": [
            {"ID_Anggota": "A1", "Nama_Anggota": "Budi Santoso", "Status_Aktif": "Aktif", "Tanggal_Gabung": "2026-01-01"},
            {"ID_Anggota": "A2", "Nama_Anggota": "Siti Aminah", "Status_Aktif": "Aktif", "Tanggal_Gabung": "2026-01-01"},
            {"ID_Anggota": "A3", "Nama_Anggota": "Andi Wijaya", "Status_Aktif": "Aktif", "Tanggal_Gabung": "2026-01-01"},
        ],
        "kategori": [
            {"ID_Kategori": "K1", "Nama_Kategori": "Iuran Wajib", "Tipe": "Masuk"},
            {"ID_Kategori": "K2", "Nama_Kategori": "Kebersihan", "Tipe": "Keluar"},
        ],
        "transaksi": [
            {
                "ID_Transaksi": "TXA-1",
                "Nominal": 120000,
                "ID_Anggota": "A1",
                "ID_Kategori": "K1",
                "Keterangan": "Iuran September",
                "Timestamp": "2026-09-05T10:00:00+07:00",
                "Tipe_Arus": "Masuk",
                "Bulan_Iuran": "September",
                "Tahun_Iuran": 2026,
            },
            {
                "ID_Transaksi": "TXA-2",
                "Nominal": 35000,
                "ID_Anggota": "",
                "ID_Kategori": "K2",
                "Keterangan": "Kebersihan Pos",
                "Timestamp": "2026-09-12T18:30:00+07:00",
                "Tipe_Arus": "Keluar",
            },
            {
                "ID_Transaksi": "TXA-BAD",
                "Nominal": 5000,
                "ID_Anggota": "",
                "ID_Kategori": "K1",
                "Keterangan": "Baris tanggal rusak",
                "Timestamp": "not-a-date",
                "Tipe_Arus": "Masuk",
            },
        ],
        "settings": {"kasStart": "01-2026", "skippedMonths": []},
    }


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A002
        return


def start_server():
    handler = partial(_QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def _block_external(route):
    ctype = {
        "stylesheet": "text/css",
        "script": "application/javascript",
    }.get(route.request.resource_type, "text/plain")
    route.fulfill(status=200, content_type=ctype, body="")


def attach_routes(context):
    context.route("https://**/*", _block_external)

    def handle_api(route):
        url = route.request.url
        body = route.request.post_data_json or {}
        if url.endswith("/api/verify-group-pin"):
            gid = str(body.get("groupId") or "")
            pin = str(body.get("pin") or "")
            expected_pin, token = PINS.get(gid, ("", ""))
            payload = (
                {"status": True, "data": {"sessionToken": token}}
                if pin == expected_pin
                else {"status": False, "message": "PIN salah."}
            )
        elif body.get("action") == "groups" or "action=groups" in url:
            payload = {"status": True, "data": {"groups": GROUPS}}
        elif body.get("action") == "version" or "action=version" in url:
            gid = str(body.get("groupId") or "GRP-A")
            payload = {"status": True, "data": {"version": build_snapshot(gid)["version"]}}
        else:
            gid = str(body.get("groupId") or "GRP-A")
            payload = {"status": True, "data": build_snapshot(gid)}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(payload))

    context.route("**/api/**", handle_api)


def new_clean_context(browser, width, height, seed=None):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        reduced_motion="reduce",
        service_workers="block",
    )
    attach_routes(context)
    if seed is not None:
        context.add_init_script(f"""
            for (const [k, v] of Object.entries({json.dumps(seed)})) {{
                localStorage.setItem(k, v);
            }}
        """)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console.error: {msg.text}") if msg.type == "error" else None,
    )
    return context, page, errors


def check_onboarding(browser, base_url, label, width, height):
    context, page, errors = new_clean_context(browser, width, height)
    try:
        page.goto(f"{base_url}/onboarding.html", wait_until="domcontentloaded")
        page.locator("#btn-to-list").click()
        expect(page.locator("#state-list")).to_be_visible()
        expect(page.locator("#group-list .group-item")).to_have_count(2)

        page.locator("#group-search-input").fill("Melati")
        expect(page.locator("#group-list .group-item")).to_have_count(1)
        page.locator('#group-list .group-item[data-id="GRP-A"]').click()

        expect(page.locator("#state-pin")).to_be_visible()
        page.locator("#group-pin").fill("1234")
        page.wait_for_url("**/index.html", timeout=10000)
        assert page.evaluate("localStorage.getItem('finkas_active_group')") == "GRP-A"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, f"{label} onboarding errors: {errors}"
    finally:
        context.close()


def check_dashboard_and_switch(browser, base_url, label, width, height):
    seed = {
        "finkas_active_group": "GRP-A",
        "finkas_active_group_name": "RT 05 Melati",
        "finkas_group_open": "1",
        "finkas_group_sessions": json.dumps({"GRP-A": "pin-tok-a"}),
        "finkas_tour_seen_v1": json.dumps(["GRP-A", "GRP-B"]),
    }
    context, page, errors = new_clean_context(browser, width, height, seed=seed)
    try:
        page.goto(f"{base_url}/index.html", wait_until="domcontentloaded")
        expect(page.locator("#group-overview-name")).to_have_text("RT 05 Melati")
        expect(page.locator("#ui-saldo")).not_to_have_text("Rp 0")
        expect(page.locator("#bento-compliance")).to_be_visible()

        if width >= 768:
            expect(page.locator("#ui-table-rekap")).to_contain_text("Budi Santoso")
        else:
            expect(page.locator("#iuran-cards-mobile")).to_contain_text("Budi Santoso")

        # Spotlight pin + Self-Pay modal
        page.locator("#spotlight-picker").select_option("A1")
        expect(page.locator("#spotlight-card")).to_be_visible()
        expect(page.locator("#spotlight-name")).to_have_text("Budi Santoso")
        page.locator("#spotlight-pay-btn").click()
        expect(page.locator("#modal-bayar-anggota")).to_be_visible()
        assert page.locator("#self-pay-months button").count() > 0
        page.keyboard.press("Escape")
        expect(page.locator("#modal-bayar-anggota")).to_be_hidden()

        # Group switch GRP-A -> GRP-B via PIN modal
        page.locator("#app-group-name").click()
        expect(page.locator("#modal-groups")).to_be_visible()
        page.locator('#group-picker-list [data-action="request-group-pin"][data-id="GRP-B"]').click()
        expect(page.locator("#modal-group-pin")).to_be_visible()
        page.locator("#modal-group-pin #group-pin").fill("5678")
        expect(page.locator("#modal-group-pin")).to_be_hidden(timeout=5000)

        expect(page.locator("#group-overview-name")).to_have_text("Kas Kelas 12")
        rekap_box = "#ui-table-rekap" if width >= 768 else "#iuran-cards-mobile"
        expect(page.locator(rekap_box)).to_contain_text("Citra Lestari")
        expect(page.locator(rekap_box)).not_to_contain_text("Budi Santoso")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, f"{label} dashboard errors: {errors}"
    finally:
        context.close()


def check_admin_and_reports(browser, base_url, label, width, height):
    seed = {
        "finkas_active_group": "GRP-A",
        "finkas_active_group_name": "RT 05 Melati",
        "finkas_group_open": "1",
        "finkas_group_sessions": json.dumps({"GRP-A": "pin-tok-a"}),
        "finkas_admin_session": "admin-tok",
        "finkas_admin_role": "group_admin",
        "finkas_tour_seen_v1": json.dumps(["GRP-A", "GRP-B"]),
    }
    context, page, errors = new_clean_context(browser, width, height, seed=seed)
    try:
        page.goto(f"{base_url}/index.html", wait_until="domcontentloaded")
        expect(page.locator("#group-overview-name")).to_have_text("RT 05 Melati")

        # Master data modal
        page.locator('.group-overview-actions [data-action="open-kelola-master"]').click()
        expect(page.locator("#modal-kelola-master")).to_be_visible()
        page.keyboard.press("Escape")
        expect(page.locator("#modal-kelola-master")).to_be_hidden()

        # Transaction Wizard step 2: check A1, filter Siti, clear filter, assert A1 stays checked
        page.locator('.group-overview-actions [data-action="buka-transaksi"]').click()
        expect(page.locator("#modal-transaksi")).to_be_visible()
        page.locator('#form-iuran [data-trx-next]').click()
        expect(page.locator("#iuran-step-2")).to_be_visible()

        chk_a1 = page.locator("#chk-iuran-A1")
        chk_a1.check()
        expect(chk_a1).to_be_checked()

        search = page.locator("#search-anggota-iuran")
        search.fill("Siti")
        expect(page.locator("#iuran-checkbox-anggota label", has_text="Siti Aminah")).to_be_visible()
        expect(page.locator("#iuran-checkbox-anggota label", has_text="Budi Santoso")).to_be_hidden()

        search.fill("")
        expect(chk_a1).to_be_checked()
        page.keyboard.press("Escape")
        expect(page.locator("#modal-transaksi")).to_be_hidden()

        # Monthly Cash Report: WIB period + invalid transaction alert
        page.locator("#btn-header-menu").click()
        expect(page.locator("#modal-menu")).to_be_visible()
        page.locator('#modal-menu [data-action="open-export"]').click()
        expect(page.locator("#modal-export")).to_be_visible()

        month_input = page.locator("#cash-report-month")
        month_input.fill("2026-09")
        month_input.dispatch_event("change")
        expect(page.locator("#cash-report-alert")).to_be_visible()
        assert page.locator("#cash-report-details tr").count() > 0

        page.locator("#modal-export .close-modal-btn").click()
        expect(page.locator("#modal-export")).to_be_hidden()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, f"{label} admin errors: {errors}"
    finally:
        context.close()


def check_privacy(browser, base_url, label, width, height):
    context, page, errors = new_clean_context(browser, width, height)
    try:
        page.goto(f"{base_url}/privacy.html", wait_until="domcontentloaded")
        expect(page.locator("h1")).to_have_text("Kebijakan Privasi")
        page.locator('[data-privacy-lang="en"]').click()
        expect(page.locator("h1")).to_have_text("Privacy Policy")
        page.locator('[data-privacy-lang="id"]').click()
        expect(page.locator("h1")).to_have_text("Kebijakan Privasi")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, f"{label} privacy errors: {errors}"
    finally:
        context.close()


def main():
    server = start_server()
    base_url = f"http://127.0.0.1:{server.server_address[1]}"
    launch_opts = {}
    if os.environ.get("CHROME_BIN"):
        launch_opts["executable_path"] = os.environ["CHROME_BIN"]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(**launch_opts)
            try:
                for label, width, height in VIEWPORTS:
                    check_onboarding(browser, base_url, label, width, height)
                    check_dashboard_and_switch(browser, base_url, label, width, height)
                    check_admin_and_reports(browser, base_url, label, width, height)
                    check_privacy(browser, base_url, label, width, height)
                    print(f"smoke {label} ({width}x{height}): PASS", flush=True)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover
        print(f"smoke FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
