/**
 * @file src/modules/logger/logger_view.js
 * @path src/modules/logger/logger_view.js
 * @version 3.0.1-RELEASE-SMO-LOGGER-VIEW-RESOLVED
 * @description Пассивное TUI-представление системного логгера (Presentation-контур).
 * ИСПРАВЛЕНА ИНДЕКСАЦИЯ И СИМВОЛЫ: Удален остаток от деления %, заблокирован вывод управляющих символов \n.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика выделения локального запечатанного TUI-буфера отображения логгера Слота 108
 * @param {string} slotIdStr Идентификатор целевой панели
 * @returns {Object} Запечатанная мономорфная структура представления
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

/**
 * Синхронный накат скользящего окна журнала логов на локальную матрицу ОЗУ прибора
 * @param {Object} view Ссылка на буфер отображения прибора
 * @param {Object} mdl Ссылка на мономорфную модель данных логов
 */
export function renderLoggerContent(view, mdl) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 120));
    const currentH = Math.max(1, Math.floor(view.height || 6));

    // Очищаем внутреннее пространство окна строго внутри стальных рамок
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

    // ИСПРАВЛЕНИЕ: Вычисляем начальное смещение окна просмотра по плоскому массиву logsArray
    // Учитывается скроллинг через viewportOffset, зажатый гвардами границ
    let startIdx = totalLines - maxVisibleLines - Math.max(0, Math.floor(mdl.viewportOffset || 0));
    if (startIdx < 0) startIdx = 0;

    for (let i = 0; i < maxVisibleLines; i++) {
        const currentLineIdx = startIdx + i;
        if (currentLineIdx >= totalLines) break;

        // ИСПРАВЛЕНИЕ: Прямое чтение индекса без деструктивной операции % mdl.maxLines
        const rawLineStr = String(mdl.logsArray[currentLineIdx] || "");
        const targetRowY = 1 + i;
        const row = m[targetRowY];

        if (row) {
            const bufferLen = rawLineStr.length;
            const maxTextCols = currentW - 2;
            let screenX = 1; // Стартовый TUI отступ справа от левой рамки окна ║

            for (let x = 0; x < bufferLen; x++) {
                if (screenX >= maxTextCols) break;

                const code = rawLineStr.charCodeAt(x);
                
                // КРИТИЧЕСКИЙ ГВАРД: Полностью отсекаем непечатные символы перевода строк \n и \r
                // Это гарантирует защиту от срыва швов рамок окон при блайтинге в ConPTY дескриптор
                if (code === 0x0A || code === 0x0D) {
                    continue;
                }

                const cell = row[screenX];
                if (cell) {
                    cell.char = rawLineStr.charAt(x);
                    cell.fg = "\x1b[38;5;244m"; // Стальной серый след системной трассировки
                    cell.bg = "\x1b[40m";
                }
                screenX++;
            }
        }
    }
}
