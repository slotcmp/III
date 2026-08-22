/**
 * @file src/modules/dashboard/ruler_view.js
 * @version 2.5.3-RELEASE-GOLDEN-MONOMORPHIC
 * @description Суб-представление Дашборда Линейки (0% RegExp, No BOM, 0% Class).
 * ИСПРАВЛЕНЫ ИНДЕКСЫ БУФЕРА: Восстановлен канонический синтаксис обращения к Uint8Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

const SAFE_MAX_COLS = 512;

// Статический DOD-буфер для разложения чисел без аллокаций памяти в такте блайтинга кадра
const _digitCharBuffer = new Uint8Array([0x20, 0x20, 0x20, 0x20]); 

/**
 * Синхронный накат координатных линеек и каретки CPU на UHD-матрицу прибора
 * @param {Array[]} matrix Плоская мономорфная UHD-матрица знакомест прибора
 * @param {number} currentW Текущая флекс-ширина прибора в знакоместах
 * @param {number} currentH Текущая флекс-высота прибора в строках
 * @param {Object} mdl Ссылка на мономорфную модель данных дашборда
 */
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

            // ПРЯМАЯ ИН-ПЛЕЙС ВЕКТОРИЗАЦИЯ ЧИСЛА (0% String Sugar, 0% Garbage)
            let temp = absX;
            const db = _digitCharBuffer;
            
            // ИСПРАВЛЕНИЕ: Восстановлен явный синтаксис зачистки элементов типизированного массива
            db[0] = 0x20; db[1] = 0x20; db[2] = 0x20; db[3] = 0x20;

            let charCount = 0;
            if (temp === 0) {
                db[0] = 0x30;
                charCount = 1;
            } else {
                // Временный стек разрядов для сохранения прямого порядка записи
                let t1 = temp;
                if (t1 >= 100) { charCount = 3; }
                else if (t1 >= 10) { charCount = 2; }
                else { charCount = 1; }

                let idx = charCount - 1;
                while (t1 > 0 && idx >= 0) {
                    db[idx] = 0x30 + (t1 % 10);
                    t1 = Math.floor(t1 / 10);
                    idx--;
                }
            }

            // Центрирование штампа относительно репера (засечки) для эстетики TUI интерфейса
            const startX = x - Math.floor(charCount / 2);

            for (let charIdx = 0; charIdx < charCount; charIdx++) {
                const targetX = startX + charIdx;
                if (targetX >= 2 && targetX < limitW - 2 && topRow[targetX]) {
                    topRow[targetX].char = String.fromCharCode(db[charIdx]);
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
        matrix[3][targetTriangleX].fg = "\x1b[38;5;196m"; 
    }
}
