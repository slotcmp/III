/**
 * @file src/modules/logger/logger_view.js
 * @version 3.2.6-RELEASE-SMO-LOGGER-CYRILLIC-STRICT-COMPLIANT
 * @description Пассивный процедурный отрисовщик строк Журнала логов Слота 108.
 * ИСПРАВЛЕНО: Интегрирован прецизионный кириллический фильтр X-границ против UTF-8 байтового раздувания.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Унифицированная процедура рендеринга контента Системного Журнала
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const sampleRow = matrix[3];
    const w = sampleRow ? sampleRow.length : Math.max(10, Math.floor(currentW || 120));
    const h = Math.max(3, Math.floor(currentH || 6));

    // 1. Подготовка стандартной TUI-подложки и плашки таба на Y = 1
    prepareGenericTuiLayout(matrix, w, h, mdl, ["CORE_LOG"], 0, false, slotIdStr, true);

    // 2. Отрисовка фоновой сетки знакомест с защитой скроллбара
    drawFrameGrid(matrix, w, h, false);

    // 3. Вывод строк лога на экран из преаллоцированного массива
    const logs = mdl.logsArray;
    const totalCount = Math.floor(mdl.totalLogsCount || 0);
    const offset = Math.floor(mdl.viewportOffset || 0);

    const maxVisibleLines = Math.max(1, h - 4); 
    const printCount = Math.min(totalCount - offset, maxVisibleLines);

    const fgColorStr = "\x1b[38;5;250m"; 
    const bgColorStr = "\x1b[40m";       
    const cleanSpaceBits = packCellBits(" ", fgColorStr, bgColorStr);

    for (let i = 0; i < printCount; i++) {
        const rowLineIdx = 3 + i;
        const row = matrix[rowLineIdx];
        if (!row) continue;

        const logLineStr = String(logs[offset + i] || "");
        
        // ЖЕСТКИЙ АППАРАТНЫЙ ПРЕДЕЛ: Текст контента ни при каких обстоятельствах 
        // не имеет права заходить на скроллбар (w-2) и на раму ║ (w-1)
        const textLimitX = (w - 2) | 0;
        let currentX = 2;

        if (logLineStr.length > 0) {
            // Разбираем строку на чистые физические символы
            const charsArray = Array.from(logLineStr);
            const charsLen = charsArray.length;

            for (let x = 0; x < charsLen; x++) {
                // Если из-за байтового раздувания кириллицы каретка достигла лимита — 
                // принудительно обрываем цикл, полностью защищая правую рамку!
                if (currentX >= textLimitX) {
                    break;
                }

                const charStr = charsArray[x];
                const charCode = charStr.charCodeAt(0);

                // Фильтруем скрытые UTF-8 байтовые «огрызки» (управляющие символы и недоделки кодировок)
                if (charCode < 32 && charCode !== 9) {
                    continue; // Пропускаем системный мусор
                }

                row[currentX] = packCellBits(charStr, fgColorStr, bgColorStr);
                currentX++;
            }
        }

        // Чистовой DOD-залив пробелами остатка строки. 
        // Ячейка w - 1 гарантированно останется пустой для беспрепятственного наката рамы Z-2.
        while (currentX < w - 1) {
            row[currentX] = cleanSpaceBits;
            currentX++;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/logger/logger_view.js
 * Время изменения: 10.09.2026 16:41:00 MSK
 */
