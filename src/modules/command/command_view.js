/**
 * @file src/modules/command/command_view.js
 * @version 3.0.1-RELEASE-SMO-COMMAND-VIEW-STRICT-INDEX
 * @description Процедурный отрисовщик TUI-строки ввода команд Слота 105.
 * ИСПРАВЛЕН КРАШ ИНДЕКСАЦИИ: Извлечена единственная строка matrix из двумерного буфера кадра.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Унифицированная процедура рендеринга контента командной строки CLI под высоту 1
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.floor(currentW || 120);
    
    // ИСПРАВЛЕНИЕ: Извлекаем строго первую контентную строку (индекс 0) из двумерного массива локальной матрицы
    const row = matrix[0];
    if (!row) return;

    const fgPrompt = "\x1b[38;5;46m"; // Яркий зеленый цвет для приглашения "> "
    const fgText = "\x1b[38;5;231m";   // Белый текст для вводимых команд
    const bgColor = "\x1b[40m";        // Черный фон

    let currentX = 0;

    // 1. ВЫВОД ПРИГЛАШЕНИЯ КОМАНДНОЙ СТРОКИ "> " С НАЧАЛА СТРОКИ (X = 0)
    if (currentX < w) { row[currentX] = packCellBits(">", fgPrompt, bgColor); currentX++; }
    if (currentX < w) { row[currentX] = packCellBits(" ", fgPrompt, bgColor); currentX++; }

    // 2. ВЫВОД ТЕКСТА ИЗ ЖИВOГО БУФЕРА ВВОДА МОДЕЛИ CLI
    const rawInputBufferStr = String(mdl.inputBuffer || mdl.commandString || "");
    const bufferLen = rawInputBufferStr.length;
    const cursorPosition = Math.floor(mdl.cursorX || 0);

    for (let i = 0; i < bufferLen; i++) {
        if (currentX < w) {
            const isCursorZone = (i === cursorPosition && mdl.isFocused !== false);
            const bg = isCursorZone ? "\x1b[48;5;231m" : bgColor;
            const fg = isCursorZone ? "\x1b[38;5;16m" : fgText;

            row[currentX] = packCellBits(rawInputBufferStr.charAt(i), fg, bg);
            currentX++;
        }
    }

    // 3. ОТРИСОВКА ПУСТОГО КУРСOРА В КОНЦЕ СТРОКИ
    if (cursorPosition >= bufferLen && currentX < w && mdl.isFocused !== false) {
        row[currentX] = packCellBits(" ", "\x1b[38;5;16m", "\x1b[48;5;231m");
        currentX++;
    }

    // 4. ЗАБИВАЕМ ОСТАТОК СТРОКИ ВВОДА ПРОБЕЛАМИ ДО КРАЯ ЭКРАНА ТЕРМИНАЛА
    const cleanSpaceBits = packCellBits(" ", fgText, bgColor);
    while (currentX < w) {
        row[currentX] = cleanSpaceBits;
        currentX++;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/command_view.js
 * Время изменения: 10.09.2026 15:53:10 MSK
 */
