/**
 * @file src/modules/v_slider/v_slider_ctl.js
 * @version 1.0.0-RELEASE-SMO-VSLIDER-DOD
 * @description Изолированный DOD-контроллер левого вертикального дашборда (id: 100).
 * Paradigm: 0% OOP / 0% try-catch / 0% RegExp / Pure DOD
 */

// Плоское запечатанное состояние прибора
const STATE = Object.create(null);
STATE.width = 4;
STATE.activeRow = 2; // Строка по умолчанию, где стоит стрелка >
Object.preventExtensions(STATE);

/**
 * Прямой инжект растра дашборда в скомпонованную матрицу дерева отображения
 * @param {Array} matrix Плоский массив ячеек {char, attr} из rootDisplayNode.matrix
 * @param {number} ctx_w Реальная ширина экрана
 * @param {number} ctx_h Реальная высота экрана
 */
export function inject_v_slider_raster(matrix, ctx_w, ctx_h) {
    const max_y = ctx_h | 0;
    const stride = ctx_w | 0;

    for (let y = 0; y < max_y; y++) {
        // Заполняем строго первые 4 знакоместа каждой строки (x от 0 до 3)
        const line_offset = (y * stride) | 0;

        for (let x = 0; x < 4; x++) {
            const idx = (line_offset + x) | 0;
            if (idx >= matrix.length) break;

            if (!matrix[idx]) {
                matrix[idx] = Object.create(null);
                matrix[idx].char = " ";
                matrix[idx].attr = 0;
            }

            // Отрисовка геометрии шкалы
            if (x === 0) {
                // Левая граница — индикатор фокуса
                if (y === STATE.activeRow) {
                    matrix[idx].char = "▶";
                    matrix[idx].attr = 31; // Красный фокус
                } else {
                    matrix[idx].char = "│";
                    matrix[idx].attr = 36; // Бирюзовая разметка
                }
            } else if (x === 3) {
                // Правое ребро слайдера, отделяющее его от Explorer
                matrix[idx].char = "┃";
                matrix[idx].attr = 36;
            } else {
                // Внутренние знакоместа: выводим индекс строки (шкалу)
                if (x === 1) {
                    const tens = (y / 10) | 0;
                    matrix[idx].char = tens > 0 ? String(tens) : "0";
                    matrix[idx].attr = y === STATE.activeRow ? 31 : 90; // Серый или красный
                } else if (x === 2) {
                    matrix[idx].char = String(y % 10);
                    matrix[idx].attr = y === STATE.activeRow ? 31 : 90;
                }
            }
        }
    }
}

/**
 * Обработка кликов мыши, пролетающих через tty_mouse_parser
 */
export function process_v_slider_mouse(click_x, click_y) {
    if (click_x < STATE.width) {
        STATE.activeRow = click_y | 0;
        return true; // Транзакт поглощен, нужен такт EXECUTE_RENDER
    }
    return false;
}
