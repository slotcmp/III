/**
 * @file: src/modules/logger/logger_view.js
 * @path: C:\slotcmd_3\src\modules\logger\logger_view.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: Пассивное TUI-представление логгера (0% Class).
 */

export function createLoggerViewInstance(slotIdStr) {
    const viewState = {
        slotId: String(slotIdStr || "108"),
        width: 120,
        height: 6,
        localBuffer: { matrix: null }
    };

    const m = new Array(64);
    for (let y = 0; y < 64; y++) {
        m[y] = new Array(512);
        for (let x = 0; x < 512; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }
    
    viewState.localBuffer.matrix = m;
    Object.preventExtensions(viewState.localBuffer);
    Object.preventExtensions(viewState);
    return viewState;
}

export function renderLoggerContent(view, mdl) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 120));
    const currentH = Math.max(1, Math.floor(view.height || 6));

    // Очищаем внутренности рамки
    for (let y = 1; y < currentH - 1; y++) {
        const row = m[y];
        if (!row) continue;
        for (let x = 1; x < currentW - 1; x++) {
            row[x].char = " ";
            row[x].fg = "\x1b[37m";
            row[x].bg = "\x1b[40m";
        }
    }

    const totalLines = Math.floor(mdl.totalLogsCount || 0);
    const maxVisibleLines = currentH - 2;
    if (totalLines === 0) return;

    // Вычисляем окно прокрутки логов с конца кольцевого буфера
    let startIdx = totalLines - maxVisibleLines - Math.floor(mdl.viewportOffset || 0);
    if (startIdx < 0) startIdx = 0;

    for (let i = 0; i < maxVisibleLines; i++) {
        const currentLineIdx = startIdx + i;
        if (currentLineIdx >= totalLines) break;

        const rawLineStr = String(mdl.logsArray[currentLineIdx % mdl.maxLines] || "");
        const targetRowY = 1 + i;
        const row = m[targetRowY];

        if (row) {
            const printLen = Math.min(rawLineStr.length, currentW - 2);
            for (let x = 0; x < printLen; x++) {
                if (1 + x < currentW - 1) {
                    row[1 + x].char = rawLineStr.charAt(x);
                    row[1 + x].fg = "\x1b[38;5;246m"; // Неяркий серый след трассировки
                }
            }
        }
    }
}
