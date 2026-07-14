from __future__ import annotations

from base64 import b64encode
from pathlib import Path
import re
import sys

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
BRAND = (ROOT / "brand-tokens.css").read_text(encoding="utf-8")
STYLE_ENTRY = (ROOT / "styles.css").read_text(encoding="utf-8")
STYLE_IMPORTS = re.findall(r'@import\s+url\(["\']?([^"\')]+)', STYLE_ENTRY)
STYLES = "\n".join((ROOT / path).read_text(encoding="utf-8") for path in STYLE_IMPORTS)
APP = (ROOT / "app.js").read_text(encoding="utf-8")
LOGO_URI = "data:image/svg+xml;base64," + b64encode(
    (ROOT / "assets/brand/cgi-logo.svg").read_bytes()
).decode("ascii")

OUTPUTS = {
    "resume.html": ("docs/Russell-Dudek-CGI-Resume.pdf", False, 2),
    "cover-letter.html": ("docs/Russell-Dudek-CGI-Cover-Letter.pdf", False, 1),
    "interview-brief.html": ("docs/Russell-Dudek-CGI-Interview-Brief.pdf", False, 2),
    "90-day-plan.html": ("docs/Russell-Dudek-CGI-90-Day-Plan.pdf", True, 1),
    "architecture-permit.html": ("docs/Russell-Dudek-CGI-Architecture-Permit.pdf", True, 1),
}

FORBIDDEN = re.compile(r"role\s*[-_ ]?forge", re.IGNORECASE)
DISALLOWED_PAGES_DOMAIN = re.compile(r"github\.io", re.IGNORECASE)


def hydrated_html(name: str, landscape: bool) -> str:
    html = (ROOT / name).read_text(encoding="utf-8")
    if DISALLOWED_PAGES_DOMAIN.search(html):
        raise RuntimeError(f"{name}: disallowed Pages-domain reference detected")
    html = re.sub(r'<link[^>]+href="brand-tokens\.css"[^>]*>', "", html, flags=re.I)
    html = re.sub(r'<link[^>]+href="styles\.css"[^>]*>', "", html, flags=re.I)
    print_css = "\n@media print{@page{size:Letter landscape;margin:0}}" if landscape else ""
    html = html.replace("</head>", f"<style>{BRAND}\n{STYLES}{print_css}</style></head>")
    html = html.replace("assets/brand/cgi-logo.svg", LOGO_URI)
    html = re.sub(
        r'<script[^>]+src="app\.js"[^>]*></script>',
        lambda _m: f"<script>{APP}</script>",
        html,
        flags=re.I,
    )
    return html


def validate_pdf(path: Path, expected_pages: int) -> None:
    reader = PdfReader(str(path))
    actual_pages = len(reader.pages)
    if actual_pages != expected_pages:
        raise RuntimeError(f"{path.name}: expected {expected_pages} pages, found {actual_pages}")

    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    metadata = " ".join(str(v) for v in (reader.metadata or {}).values())
    if FORBIDDEN.search(text) or FORBIDDEN.search(metadata):
        raise RuntimeError(f"{path.name}: prohibited internal-name match detected")

    uri_values = []
    for page in reader.pages:
        for annotation_ref in page.get("/Annots") or []:
            annotation = annotation_ref.get_object()
            action = annotation.get("/A")
            if action and action.get("/URI"):
                uri_values.append(str(action.get("/URI")))
    if any(DISALLOWED_PAGES_DOMAIN.search(value) for value in (text, metadata, *uri_values)):
        raise RuntimeError(f"{path.name}: disallowed Pages-domain reference detected")

    if path.name.endswith("Resume.pdf"):
        for page_number, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            for required in ("Russell Dudek", "412.287.8640", "russelldudek@gmail.com"):
                if required not in page_text:
                    raise RuntimeError(
                        f"{path.name}: missing {required!r} on page {page_number}"
                    )
    elif path.name.endswith("Cover-Letter.pdf"):
        for required in ("Russell Dudek", "412.287.8640", "russelldudek@gmail.com"):
            if required not in text:
                raise RuntimeError(f"{path.name}: missing {required!r}")


def main() -> int:
    (ROOT / "docs").mkdir(exist_ok=True)
    with sync_playwright() as playwright:
        launch_options = {
            "headless": True,
            "args": ["--no-sandbox", "--disable-dev-shm-usage"],
        }
        system_chromium = Path("/usr/bin/chromium")
        if system_chromium.exists():
            launch_options["executable_path"] = str(system_chromium)
        browser = playwright.chromium.launch(**launch_options)
        try:
            for source, (relative_output, landscape, expected_pages) in OUTPUTS.items():
                context = browser.new_context(
                    viewport={"width": 1440, "height": 1100},
                    reduced_motion="reduce",
                )
                try:
                    page = context.new_page()
                    page.set_content(hydrated_html(source, landscape), wait_until="load")
                    page.emulate_media(media="print")
                    page.wait_for_timeout(150)
                    output = ROOT / relative_output
                    page.pdf(
                        path=str(output),
                        format="Letter",
                        landscape=landscape,
                        print_background=True,
                        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                        prefer_css_page_size=False,
                    )
                    validate_pdf(output, expected_pages)
                    print(f"built {output.relative_to(ROOT)} ({expected_pages} page(s))")
                finally:
                    context.close()
        finally:
            browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
