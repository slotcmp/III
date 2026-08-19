/**
 * @file: src/modules/dashboard/ruler_view.js
 * @path: C:\slotcmd_3\src\modules\dashboard\ruler_view.js
 * @version: 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description: Суб-представление Дашборда Линейки (0% RegExp, No BOM, 0% Class).
 */

const SAFE_MAX_COLS = 512;

export function renderRulerContent(matrix, currentW, currentH, mdl) {
    if (!matrix || currentH < 2) return;

    const topRow = matrix[1]; 
    const midRow = matrix[2]; 

    if (!topRow || !midRow) return;

    const limitW = Math.min(SAFE_MAX_COLS, Math.max(1, Math.floor(currentW || 120)));

    for (let x = 2; x < limitW - 2; x++) {
        const absX = x - 1;
        const remainderNum = absX % 10;

        if (midRow[x]) {
            midRow[x].char = "─";
            midRow[x].fg = "\x1b[38;5;239m"; 
            midRow[x].bg = "\x1b[40m";
        }

        if (absX % 5 === 0 && remainderNum !== 0) {
            if (midRow[x]) {
                midRow[x].char = "┼";
                midRow[x].fg = "\x1b[38;5;242m";
            }
        }

        if (remainderNum === 0) {
            if (midRow[x]) {
                midRow[x].char = "┴";
                midRow[x].fg = "\x1b[38;5;220m"; 
            }

            const coordString = String(absX);
            const strLen = coordString.length;
            const startX = x - Math.floor(strLen / 2);

            for (let charIdx = 0; charIdx < strLen; charIdx++) {
                const targetX = startX + charIdx;
                if (targetX >= 2 && targetX < limitW - 2 && topRow[targetX]) {
                    topRow[targetX].char = coordString.charAt(charIdx);
                    topRow[targetX].fg = "\x1b[38;5;44m"; 
                    topRow[targetX].bg = "\x1b[40m";
                }
            }
        }
    }

    // ВЫЖИГАНИЕ КРАСНОГО ТРЕУГОЛЬНИКА ПО ОРДИНАТЕ X (Метрика CPU нагрузки)
    const cpuPct = Math.max(0, Math.min(100, Math.floor(mdl?._cpuPercent || 0)));
    const usableWidth = limitW - 6;
    const targetTriangleX = 3 + Math.floor((cpuPct / 100) * usableWidth);
    
    if (matrix[3] && matrix[3][targetTriangleX]) {
        matrix[3][targetTriangleX].char = "▲";
        matrix[3][targetTriangleX].fg = "\x1b[38;5;196m"; // Ярко-красный треугольник
    }
}
