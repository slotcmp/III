/**
 * @file: src/modules/command/view.js
 * @path: C:\slotcmd_3\src\modules\command\view.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: Пассивное TUI-представление Командной строки. Осуществляет посимвольное впекание растра (0% RegExp, No BOM, 0% Class).
 * @revision: #0817-COMMAND-VIEW-DOD
 */

/**
 * ЧИСТАЯ ФУНКЦИЯ-ФАБРИКА: Аллокация пассивной UHD-матрицы знакомест Слота
 * @returns {Object} Запечатанный буфер кадра
 */
export function createCommandViewInstance(slotIdStr) {
    const viewState = {
        slotId: String(slotIdStr || "105"),
        width: 120,
        height: 3,
        
        _isFocused: false,
        _borderColorWebName: "gray",
        
        // Преаллоцированный UHD-массив знакомест 512x64 для защиты от Out of Bounds при ресайзах
        localBuffer: {
            matrix: null
        }
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
 * ЧИСТАЯ ВНЕШНЯЯ ПРОЦЕДУРА: Параметрическое выжигание контента модели поверх растра вьюхи
 * Сама вьюха пассивна — её и модель связывает СМО-движок в аргументах этого вызова
 */
export function renderCommandContent(view, mdl) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 120));
    
    // Выжигаем строку ввода на фиксированной TUI-линии Y = 1 (внутри рамки окна)
    const contentRowY = 1;
    const row = m[contentRowY];
    if (!row) return;

    // Отрисовываем приглашение командной строки
    row[1].char = ">";
    row[1].fg = "\x1b[38;5;220m"; // Золотой цвет ANSI
    row[1].bg = "\x1b[40m";

    const maxTextCols = currentW - 5; 
    const len = Math.min(Math.floor(mdl.textLength || 0), maxTextCols);
    const cursorX = Math.max(0, Math.floor(mdl.cursorX || 0));

    // Параметрический цикл: формируем символы и каретку курсора на основе регистров mdl
    for (let x = 0; x < maxTextCols; x++) {
        const targetX = 3 + x; 
        const cell = row[targetX];
        if (!cell) break;

        const isCursorPos = (x === cursorX && view._isFocused);

        if (x < len) {
            cell.char = String(mdl.charBuffer[x] || " ");
            cell.fg = isCursorPos ? "\x1b[38;5;16m" : "\x1b[38;5;231m";
            cell.bg = isCursorPos ? "\x1b[48;5;231m" : "\x1b[40m"; // Инверсия цвета под курсором
        } else {
            cell.char = " ";
            cell.fg = "\x1b[37m";
            cell.bg = isCursorPos ? "\x1b[48;5;231m" : "\x1b[40m"; 
        }
    }
}
