/**
 * @file src/io/terminal/frame_title_renderer.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description frameRenderer заголовка по канону скриншота slotcmd_2 (0% Class).
 * ИСПРАВЛЕН ANSI-НАКАТ: Прямая инжекция предопределенных токенов цвета без срыва палитры рамы.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// Статические константные ANSI-токены для защиты от холостых вызовов резолвера внутри такта
const _ANSI_FOCUS_WHITE = "\x1b[38;5;231m";
const _ANSI_PASSIVE_GRAY = "\x1b[38;5;244m";

/**
 * Впекает текстовое имя СМО-прибора в верхнюю грань стальной рамы окна
 * @param {Object[]} row Ссылка на плоский массив ячеек верхней строки матрицы
 * @param {string} compTypeStr Строковый тип компонента (домен прибора)
 * @param {string} slotIdStr Идентификатор слота на шине СМО
 * @param {number} currentW Текущая физическая флекс-ширина окна в знакоместах
 * @param {boolean} isFocusedBool Флаг активности/фокуса панели в интерфейсе
 */
export function drawFrameTitle(row, compTypeStr, slotIdStr, currentW, isFocusedBool) {
    if (!row) return;

    // Скриншот-оригинал: жесткий маршалинг названий системных панелей (0% RegExp)
    let displayTitle = String(compTypeStr).toUpperCase();
    if (displayTitle === "THEME") displayTitle = "COLOR PALETTE";
    else if (displayTitle === "LOGGER") displayTitle = "SYSTEM LOGGER";

    // Сборка канонического строкового шаблона рантайма GEN III
    const titleTextStr = "= [ " + displayTitle + " ] =";
    const tLen = titleTextStr.length;
    
    // Защитный гвард: впекаем штамп только если окно физически шире заголовка с отступами
    if (currentW > tLen + 6) {
        const startX = 4; // Фиксированный левый TUI-отступ по канону оригинала
        
        // Кэшируем маску цвета символов для текущего такта (Zero Allocation)
        const activeTextAnsiColor = isFocusedBool ? _ANSI_FOCUS_WHITE : _ANSI_PASSIVE_GRAY;

        for (let i = 0; i < tLen; i++) {
            const cell = row[startX + i];
            if (cell) {
                cell.char = titleTextStr.charAt(i);
                cell.fg = activeTextAnsiColor; // Безопасный накат мономорфного токена
            }
        }
    }
}
