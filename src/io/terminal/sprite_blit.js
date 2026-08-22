/**
 * @file src/io/terminal/sprite_blit.js
 * @path src/io/terminal/sprite_blit.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description Низкоуровневый аллокатор ОЗУ-матриц знакомест. (0% RegExp, No BOM, 0% Class).
 * ИСПРАВЛЕНА АЛЛОКАЦИЯ: Переведен на статический UHD-пул ячеек для защиты от GC Thrashing при ресайзах.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// ГЛОБАЛЬНЫЙ ПРЕАЛЛОЦИРОВАННЫЙ UHD-ПУЛ ЯЧЕЕК ПОД МАКСИМАЛЬНЫЙ РАЗМЕР ЭКРАНА (512x64)
// Все приборы при ресайзах берут ссылки на ячейки отсюда in-place, исключая генерацию мусора
const _GLOBAL_UHD_CELL_POOL = new Array(64);
for (let y = 0; y < 64; y++) {
    _GLOBAL_UHD_CELL_POOL[y] = new Array(512);
    for (let x = 0; x < 512; x++) {
        _GLOBAL_UHD_CELL_POOL[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
        Object.preventExtensions(_GLOBAL_UHD_CELL_POOL[y][x]);
    }
    Object.preventExtensions(_GLOBAL_UHD_CELL_POOL[y]);
}
Object.preventExtensions(_GLOBAL_UHD_CELL_POOL);

/**
 * Прецизионно нарезает двумерную матрицу ссылок из глобального пула без выделения новых объектов ячеек
 * @param {Object} nodeState Состояние узла или вьюхи, куда инжектируется матрица
 * @param {number} colsNum Целевая ширина матрицы в знакоместах
 * @param {number} rowsNum Целевая высота матрицы в строках
 */
export function initNodeMatrix(nodeState, colsNum, rowsNum) {
    if (!nodeState) return;

    // Жестко зажимаем границы под физический лимит преаллоцированного UHD-пула
    const w = Math.min(512, Math.max(1, Math.floor(colsNum || 120)));
    const h = Math.min(64, Math.max(1, Math.floor(rowsNum || 30)));

    const m = new Array(h);
    for (let y = 0; y < h; y++) {
        m[y] = new Array(w);
        
        const sourcePoolRow = _GLOBAL_UHD_CELL_POOL[y];
        const targetMatrixRow = m[y];
        
        for (let x = 0; x < w; x++) {
            // ИСПРАВЛЕНИЕ: Переносим строгую ссылку на уже существующий в куче объект ячейки пула.
            // Новые ячейки не создаются, старые очищаются in-place до дефолтных значений.
            const cell = sourcePoolRow[x];
            cell.char = " ";
            cell.fg = "\x1b[37m";
            cell.bg = "\x1b[40m";
            
            targetMatrixRow[x] = cell;
        }
        Object.preventExtensions(targetMatrixRow);
    }
    Object.preventExtensions(m);

    // Легитимный DOD-выжиг ссылки на сгенерированную матрицу в ОЗУ-буфер узла
    if (nodeState.localBuffer) {
        nodeState.localBuffer.matrix = m;
    } else {
        nodeState.matrix = m;
    }
}
