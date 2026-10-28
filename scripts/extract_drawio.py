"""Unpack the draw.io web archive into vendor/drawio.

The editor runs from the plugin's own dist/drawio. Cloud integration bundles,
Java server jars, and the upstream service worker are left out.
"""
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "vendor" / "drawio"
VERSION = "v32.6.1"

SKIP_PREFIXES = (
    "WEB-INF/",
    "META-INF/",
    "js/diagramly/",
    "js/grapheditor/",
    "js/onedrive/",
    "js/simplepeer/",
    "mxgraph/src/",
    "connect/",
)
SKIP_NAMES = {
    "js/integrate.min.js",
    "js/viewer.min.js",
    "js/viewer-static.min.js",
    "mxgraph/mxClient.js",
    "service-worker.js",
    "service-worker.js.map",
    "workbox-05b6c01b.js",
    "workbox-05b6c01b.js.map",
    "teams.html",
    "clear.html",
    "onedrive3.html",
    "open.html",
    "export3.html",
    "vsdxImporter.html",
    "monday-app-association.json",
}

PRE_CONFIG = """/**
 * Copyright (c) 2006-2024, JGraph Holdings Ltd
 * Copyright (c) 2006-2024, draw.io AG
 *
 * fat-diagrams: force every base URL onto this folder so the editor
 * does not fall back to app.diagrams.net.
 */
var drawioLocalBase = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
window.DRAWIO_PUBLIC_BUILD = true;
window.DRAWIO_BASE_URL = drawioLocalBase;
window.DRAWIO_SERVER_URL = drawioLocalBase;
window.DRAWIO_VIEWER_URL = null;
window.DRAWIO_LIGHTBOX_URL = drawioLocalBase;
window.EXPORT_URL = null;
window.DRAW_MATH_URL = "math4/es5";
window.DRAWIO_CONFIG = null;
urlParams["sync"] = "manual";
urlParams["stealth"] = "1";
urlParams["offline"] = "1";
urlParams["gapi"] = "0";
urlParams["db"] = "0";
urlParams["od"] = "0";
urlParams["gh"] = "0";
urlParams["gl"] = "0";
urlParams["tr"] = "0";
urlParams["math"] = "0";
urlParams["splash"] = "0";
urlParams["enableSW"] = "0";
"""

SERVICE_WORKER = """/* fat-diagrams: local editor, no precache and no remote logging. */
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
"""


def keep(name: str) -> bool:
    if name.endswith("/") or name.endswith(".map"):
        return False
    if name in SKIP_NAMES or name.startswith(SKIP_PREFIXES):
        return False
    return True


def patch_index(html: str) -> str:
    for snippet in (
        '    <link rel="canonical" href="https://app.diagrams.net">\n',
        '\t<link rel="manifest" href="images/manifest.json">\n',
        '\t<meta itemprop="image" content="https://lh4.googleusercontent.com/-cLKEldMbT_E/Tx8qXDuw6eI/AAAAAAAAAAs/Ke0pnlk8Gpg/w500-h344-k/BPMN%2Bdiagram%2Brc2f.png">\n',
    ):
        html = html.replace(snippet, "")
    return html


def main() -> None:
    war = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "")
    if not war.is_file():
        raise SystemExit("usage: python scripts/extract_drawio.py <draw.war>")
    if TARGET.exists():
        import shutil

        shutil.rmtree(TARGET)
    TARGET.mkdir(parents=True)
    written = 0
    total = 0
    with zipfile.ZipFile(war) as bundle:
        for info in bundle.infolist():
            if not keep(info.filename):
                continue
            dest = TARGET / info.filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            data = bundle.read(info)
            if info.filename == "index.html":
                data = patch_index(data.decode("utf-8")).encode("utf-8")
            dest.write_bytes(data)
            written += 1
            total += len(data)
    (TARGET / "js" / "PreConfig.js").write_text(PRE_CONFIG, encoding="utf-8")
    (TARGET / "service-worker.js").write_text(SERVICE_WORKER, encoding="utf-8")
    (TARGET / "VERSION").write_text(VERSION + "\n", encoding="utf-8")
    notice = (
        "draw.io " + VERSION + "\n"
        "Source: https://github.com/jgraph/drawio\n"
        "The editor files are licensed under the Apache License 2.0.\n"
        "Copyright (c) JGraph Holdings Ltd and draw.io AG.\n"
        "This copy is configured to stay on the local plugin folder.\n"
    )
    (TARGET / "NOTICE.txt").write_text(notice, encoding="utf-8")
    print(f"extracted {written} files, {total / 1024 / 1024:.1f} MB -> {TARGET}")


if __name__ == "__main__":
    main()
