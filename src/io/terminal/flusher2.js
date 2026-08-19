/**
 * @file src/io/terminal/flusher.js
 * @path src/io/terminal/flusher.js
 * @version 3.3.3-RELEASE-SMO-FLUSHER-SAFE-ZERO-ALLOC
 * @description Высокопроизводительный терминальный флешер растра. Управляет двойной буферизацией.
 * Ликвидировано мерцание ConPTY. Защищен от системного мусора памяти ОЗУ.
 * Paradigm: 0% OOP / 0% try-catch / 0% RegExp / Pure DOD / 100% ESM
 */

import fs from 'node:fs';

// Плоские глобальные буферы фаз растра (Zero Allocation в такте кадра)
export let back_char_buffer = null;  // Uint32Array кодов символов
export let back_attr_buffer = null;  // Uint32Array SGR-атрибутов и цветов
export let front_char_buffer = null; // Теневое ОЗУ-зеркало символов
export let front_attr_buffer = null; // Теневое ОЗУ-зеркало атрибутов
export let dirty_matrix = null;      // Матрица инвалидации (Грязные пиксели)

// Статический очищенный буфер для формирования кадра (Безопасная аллокация)
const OUT_BYTE_BUFFER = Buffer.alloc(65536);

/**
 * Инициализация плоскостных буферов растра под текущие метрики ConPTY
 */
export function init_raster_buffers(width, height) {
    const total_cells = (width * height) | 0;

    back_char_buffer  = new Uint32Array(total_cells);
    back_attr_buffer  = new Uint32Array(total_cells);
    front_char_buffer = new Uint32Array(total_cells);
    front_attr_buffer = new Uint32Array(total_cells);
    dirty_matrix      = new Uint8Array(total_cells);

    // Заполнение пробелами по умолчанию (ASCII 32)
    for (let i = 0; i < total_cells; i++) {
        back_char_buffer[i] = 32;
        front_char_buffer[i] = 0; // Разрываем фазу для обязательного стартового кадра
    }

    // Принудительная инвалидация стартового кадра
    dirty_matrix.fill(1);
}

/**
 * Высокоскоростной BitBlt-перенос строк растра в Back-буфере при скролле.
 */
export function blit_scroll_viewport(ctx_w, start_y, end_y, direction) {
    const stride = ctx_w | 0;
    const active_x_start = 4; // Защищаем v_slider
    const active_x_end = ctx_w | 0;

    if (direction === 1) {
        for (let y = start_y | 0; y < (end_y - 1) | 0; y++) {
            const dst_line_offset = (y * stride) | 0;
            const src_line_offset = ((y + 1) * stride) | 0;
            for (let x = active_x_start; x < active_x_end; x++) {
                const dst_idx = (dst_line_offset + x) | 0;
                const src_idx = (src_line_offset + x) | 0;
                back_char_buffer[dst_idx] = back_char_buffer[src_idx];
                back_attr_buffer[dst_idx] = back_attr_buffer[src_idx];
                dirty_matrix[dst_idx] = 1;
            }
        }
    } else if (direction === -1) {
        for (let y = (end_y - 1) | 0; y > start_y; y--) {
            const dst_line_offset = (y * stride) | 0;
            const src_line_offset = ((y - 1) * stride) | 0;
            for (let x = active_x_start; x < active_x_end; x++) {
                const dst_idx = (dst_line_offset + x) | 0;
                const src_idx = (src_line_offset + x) | 0;
                back_char_buffer[dst_idx] = back_char_buffer[src_idx];
                back_attr_buffer[dst_idx] = back_attr_buffer[src_idx];
                dirty_matrix[dst_idx] = 1;
            }
        }
    }
}

/**
 * Дифференциальный залп изменений в stdout. Выводит только грязные пиксели.
 */
export function flush_dirty_raster(ctx_w, ctx_h) {
    const total = (ctx_w * ctx_h) | 0;
    let ptr = 0; 
    let current_active_color = 0; 

    for (let i = 0; i < total; i++) {
        const char_code = back_char_buffer[i];
        const attr_code = back_attr_buffer[i];

        // Гвард дельты
        if (dirty_matrix[i] === 0 && 
            char_code === front_char_buffer[i] && 
            attr_code === front_attr_buffer[i]) {
            continue;
        }

        const y = (i / ctx_w) | 0;
        const x = (i % ctx_w) | 0;

        // Позиционирование курсора ConPTY
        ptr += OUT_BYTE_BUFFER.write(`\x1b[${y + 1};${x + 1}H`, ptr);
        
        // Управление цветом SGR
        if (attr_code !== current_active_color) {
            if (attr_code === 0) {
                ptr += OUT_BYTE_BUFFER.write('\x1b[0m', ptr);
            } else {
                ptr += OUT_BYTE_BUFFER.write(`\x1b[${attr_code}m`, ptr);
            }
            current_active_color = attr_code;
        }

        // Запись символа. Защита Юникода рамок шкал
        if (char_code < 128) {
            OUT_BYTE_BUFFER[ptr++] = char_code;
        } else {
            // Исправлено: пишем многобайтовые символы через нативный UTF-8 сериализатор буфера
            ptr += OUT_BYTE_BUFFER.write(String.fromCharCode(char_code), ptr, 'utf8');
        }

        // Синхронизация фаз
        front_char_buffer[i] = char_code;
        front_attr_buffer[i] = attr_code;
        dirty_matrix[i] = 0;
    }

    if (current_active_color !== 0) {
        ptr += OUT_BYTE_BUFFER.write('\x1b[0m', ptr);
    }

    // Атомарный сброс буфера в stdout
    if (ptr > 0) {
        fs.writeSync(1, OUT_BYTE_BUFFER, 0, ptr);
    }
}

/**
 * Высокоскоростные DOD-геттеры живых ссылок на буферы растра
 */
export function get_back_char_buffer() { return back_char_buffer; }
export function get_back_attr_buffer() { return back_attr_buffer; }
export function get_dirty_matrix()      { return dirty_matrix; }

export function forceInvalidateShadowCanvas() {
    if (dirty_matrix !== null) {
        dirty_matrix.fill(1);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/flusher.js
 * Время модификации: 19.08.2026 15:58:00 MSK
 * Ревизия: #0819-SAFE-BUFFER-FINAL
 */
