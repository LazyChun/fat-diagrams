/**
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
