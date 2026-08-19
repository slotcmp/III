/**
 * @file: src/io/terminal/sprite_blit.js
 * @path: C:\slotcmd_3\src\io\terminal\sprite_blit.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: Низкоуровневый аллокатор ОЗУ-матриц знакомест. (0% RegExp, No BOM, 0% Class).
 */

/**
 * ЧИСТАЯ ПРОЦЕДУРА: Выделяет двумерный массив ячеек и жестко запечатывает Hidden Classes V8
 */
export function initNodeMatrix(nodeState, colsNum, rowsNum) {
    if (!nodeState) return;

    const w = Math.max(1, Math.floor(colsNum || 120));
    const h = Math.max(1, Math.floor(rowsNum || 30));

    const m = new Array(h);
    for (let y = 0; y < h; y++) {
        m[y] = new Array(w);
        for (let x = 0; x < w; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }

    // Сохраняем ссылку на сгенерированную матрицу в ОЗУ-буфер узла
    if (nodeState.localBuffer) {
        nodeState.localBuffer.matrix = m;
    } else {
        nodeState.matrix = m;
    }
}
