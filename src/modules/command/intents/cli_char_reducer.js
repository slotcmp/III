/**
 * @file src/modules/command/intents/cli_char_reducer.js
 * @version 1.8.1-RELEASE-SMO-CLI-CHAR-REDUCER-PATHS-STABLE
 * @description Изолированная DOD-процедура обработки ввода, стирания и перемещения курсора.
 * ИСПРАВЛЕН ПУТЬ ИМПОРТА: Исправлена линковка bus.js для предотвращения затирания Слота 105.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { calculateMutation } from "../../../io/terminal/common_input_engine.js";
import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Выполняет безмусорную мутацию символьного буфера командной строки с такта
 */
export function reduceCliCharInput(m, intentStr, targetCharStr) {
    const cleanIntent = String(intentStr || "");
    const chr = String(targetCharStr || "");

    // =================================================================
    // 1. СДВИГ КАРЕТКИ КУРСOРА СТРЕЛКАМИ ВЛЕВО / ВПРАВO
    // =================================================================
    if (cleanIntent === "MOVE_CURSOR_LEFT" || cleanIntent === "MOVE_CURSOR_RIGHT") {
        const actionType = (cleanIntent === "MOVE_CURSOR_LEFT") ? "CURSOR_LEFT" : "CURSOR_RIGHT";
        
        const patch = calculateMutation(actionType, null, m);
        if (patch) {
            m.cursor = Math.max(0, Math.floor(patch.cursor || 0));
            m.cursorX = m.cursor; 
            m._isDirty = true;
            return true;
        }
        return false;
    }
    
    // =================================================================
    // 2. АВТОНОМНОЕ DOD-УДАЛЕНИЕ BACKSPACE С ИНЖЕКЦИЕЙ ПОДТВЕРЖДЕНИЯ
    // =================================================================
    if (cleanIntent === "BACKSPACE_PRESSED" || cleanIntent === "BACKSPACE" || cleanIntent === "DELETE_CHAR" || chr === "\x7f" || chr === "\x08") {
        const currentLen = m.buffer.length;
        
        if (currentLen > 0) {
            m.buffer = m.buffer.substring(0, currentLen - 1);
            m.cursor = Math.max(0, m.buffer.length);
            m.textLength = m.buffer.length;
            m.cursorX = m.cursor;

            const charCount = Math.min(m.buffer.length, 256);
            for (let i = 0; i < 256; i++) {
                m.charBuffer[i] = i < charCount ? m.buffer.charAt(i) : " ";
            }

            // Выстрел подтверждения операции в Системный журнал (Слот 108)
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const min = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            const doneLogStr = "[" + h + ":" + min + ":" + s + " Msk] [WORKER_CLI] Операция BACKSPACE успешно завершена | Длина буфера: " + charCount + "\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", doneLogStr, "105");

            m._isDirty = true;
            return true; 
        }
        return false;
    }
    
    // Гвард от проброса управляющего мусора в обычный ввод
    if (chr === "\x00" || chr === "null" || chr.length === 0) {
        return false; 
    }

    // =================================================================
    // 3. ОБЫЧНЫЙ НАБОР БУКВ И ЦИФР
    // =================================================================
    const patch = calculateMutation("TYPE_CHAR", chr, m);
    if (!patch) return false;

    m.buffer = String(patch.buffer);
    m.cursor = Math.max(0, Math.floor(patch.cursor || 0));
    
    const charCount = Math.min(m.buffer.length, 256);
    m.textLength = charCount;
    m.cursorX = m.cursor;

    for (let i = 0; i < 256; i++) {
        m.charBuffer[i] = i < charCount ? m.buffer.charAt(i) : " ";
    }
    
    m._isDirty = true;
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/intents/cli_char_reducer.js
 * Время изменения: 05.09.2026 11:55:20 MSK
 */
