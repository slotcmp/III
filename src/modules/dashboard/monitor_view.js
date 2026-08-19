/**
 * @file: src/modules/dashboard/monitor_view.js
 * @path: C:\slotcmd_3\src\modules\dashboard\monitor_view.js
 * @version: 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description: Суб-представление Дашборда. (0% RegExp, No BOM, 0% Class).
 */

export function _write(rowArr, startX, textStr, colorAnsi) {
    if (!rowArr) return;
    const len = textStr.length;
    const max = rowArr.length;
    for (let i = 0; i < len; i++) {
        const targetX = startX + i;
        if (targetX >= 0 && targetX < max && rowArr[targetX]) {
            rowArr[targetX].char = textStr.charAt(i);
            rowArr[targetX].fg = colorAnsi;
        }
    }
}

export function _bar(rowArr, startX, pct, totalBlocks, activeColor, bgColor) {
    if (!rowArr) return;
    const cleanPct = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
    const filled = Math.floor((cleanPct / 100) * totalBlocks);
    const max = rowArr.length;
    for (let b = 0; b < totalBlocks; b++) {
        const targetX = startX + b;
        if (targetX >= 0 && targetX < max && rowArr[targetX]) {
            rowArr[targetX].char = (b < filled) ? "█" : "░";
            rowArr[targetX].fg = (b < filled) ? activeColor : bgColor;
        }
    }
}

export function renderMonitorContent(matrix, currentW, currentH, mdl) {
    if (!matrix || currentH < 2 || !mdl) return;

    const cpuPct = Math.max(0, Math.floor(mdl._cpuPercent || 0));
    const ramPct = Math.max(0, Math.floor(mdl._ramPercent || 0));
    const cpuCores = Math.floor(mdl._cpuCores || 1);
    const ramUsed = Math.floor(mdl._ramUsedMb || 0);
    const ramTotal = Math.floor(mdl._ramTotalMb || 1);

    // Внутри UHD-матрицы слота 101 контент выводится со смещением на 1 строку от рамы
    const rowCpu = matrix[1]; 
    const rowRam = matrix[2]; 

    if (!rowCpu || !rowRam) return;

    const barStartX = 32;
    const barLength = Math.max(5, Math.floor(currentW) - barStartX - 2);

    _write(rowCpu, 2, "CPU LOAD: ", "\x1b[38;5;248m");
    const cpuValStr = String(cpuPct) + "% (" + cpuCores + " Cores) ";
    _write(rowCpu, 12, cpuValStr, "\x1b[38;5;44m");
    _bar(rowCpu, barStartX, cpuPct, barLength, "\x1b[38;5;46m", "\x1b[38;5;236m");

    _write(rowRam, 2, "RAM USED: ", "\x1b[38;5;248m");
    const ramValStr = String(ramUsed) + " MB / " + ramTotal + " MB (" + ramPct + "%) ";
    _write(rowRam, 12, ramValStr, "\x1b[38;5;220m");
    _bar(rowRam, barStartX, ramPct, barLength, "\x1b[38;5;220m", "\x1b[38;5;236m");
}
