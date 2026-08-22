/**
 * @file src/io/terminal/common_input_engine.js
 * @version 2.5.1-RELEASE-GOLDEN-MONOMORPHIC
 * @description Общий служебный движок посимвольного строкового ввода (PAC / Abstraction).
 * ИСПРАВЛЕНА ОЧИСТКА И ПАТЧ: Статический буфер чистится тотально, форма патча жестко мономорфизирована.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// Статический кольцевой DOD-буфер с запасом под максимальную длину CLI
export const _charBuffer = new Array(264);
for (let i = 0; i < 264; i++) _charBuffer[i] = " ";

/**
 * Прецизионный расчет посимвольного изменения строки на базе In-Place буфера
 * @param {string} action Тип производимой мутации (TYPE_CHAR, BACKSPACE, CURSOR_LEFT, CURSOR_RIGHT)
 * @param {string|null} payload Символьный чанк для вставки (при наличии)
 * @param {Object} model Ссылка на мономорфную модель данных, содержащую текстовые регистры
 * @returns {Object|null} Запечатанный патч мутации для наката на модель
 */
export function calculateMutation(action, payload, model) {
    if (!model) return null;

    // Унифицируем чтение текущего буфера под DOD-стандарты slot_maker.js
    const currentBuffer = model.buffer !== undefined ? String(model.buffer) : 
                         (model.text !== undefined ? String(model.text) : 
                         (model.value !== undefined ? String(model.value) : ""));
                         
    const bufferLen = currentBuffer.length;

    // Извлекаем каретку курсора с гвардом лимитов строки
    const rawCursor = model.cursor !== undefined ? Number(model.cursor) : 
                      (model.cursorX !== undefined ? Number(model.cursorX) : 0);
                      
    const currentCursor = Math.max(0, Math.min(bufferLen, isNaN(rawCursor) ? 0 : rawCursor));
    const buf = _charBuffer;

    // Быстрый векторизованный налив текущей строки в статический ОЗУ-регистр
    for (let i = 0; i < bufferLen; i++) {
        buf[i] = currentBuffer.charAt(i);
    }

    let nextLen = bufferLen;
    let nextCursor = currentCursor;

    switch (action) {
        case "TYPE_CHAR":
            if (!payload) return null;
            const payloadStr = String(payload);
            const payloadLen = payloadStr.length;

            if (bufferLen >= 260) return null;
            
            let allowedLen = payloadLen;
            if (bufferLen + payloadLen > 260) {
                allowedLen = 260 - bufferLen;
            }

            // Раздвигаем буфер вправо in-place для освобождения места под чанк
            for (let i = bufferLen - 1; i >= currentCursor; i--) {
                buf[i + allowedLen] = buf[i];
            }

            // Вставляем входящие символы
            for (let i = 0; i < allowedLen; i++) {
                buf[currentCursor + i] = payloadStr.charAt(i);
            }

            nextLen = bufferLen + allowedLen;
            nextCursor = currentCursor + allowedLen;
            break;

        case "BACKSPACE":
            if (currentCursor > 0 && bufferLen > 0) {
                let charsToRemove = 1;
                // Аппаратная детекция и безопасное удаление суррогатных пар Юникода (Эмодзи, редкие знаки)
                if (currentCursor >= 2) {
                    const codeHigh = currentBuffer.charCodeAt(currentCursor - 2);
                    const codeLow = currentBuffer.charCodeAt(currentCursor - 1);
                    if (codeHigh >= 0xD800 && codeHigh <= 0xDBFF && codeLow >= 0xDC00 && codeLow <= 0xDFFF) {
                        charsToRemove = 2;
                    }
                }

                // Сдвигаем растр влево, затирая удаленный символ
                for (let i = currentCursor; i < bufferLen; i++) {
                    buf[i - charsToRemove] = buf[i];
                }

                nextLen = bufferLen - charsToRemove;
                nextCursor = currentCursor - charsToRemove;
            } else {
                return null;
            }
            break;

        case "CURSOR_LEFT":
            if (currentCursor === 0) return null;
            let stepLeft = 1;
            if (currentCursor >= 2) {
                const codeHigh = currentBuffer.charCodeAt(currentCursor - 2);
                const codeLow = currentBuffer.charCodeAt(currentCursor - 1);
                if (codeHigh >= 0xD800 && codeHigh <= 0xDBFF && codeLow >= 0xDC00 && codeLow <= 0xDFFF) {
                    stepLeft = 2;
                }
            }
            nextCursor = currentCursor - stepLeft;
            break;

        case "CURSOR_RIGHT":
            if (currentCursor === bufferLen) return null;
            let stepRight = 1;
            if (currentCursor <= bufferLen - 2) {
                const codeHigh = currentBuffer.charCodeAt(currentCursor);
                const codeLow = currentBuffer.charCodeAt(currentCursor + 1);
                if (codeHigh >= 0xD800 && codeHigh <= 0xDBFF && codeLow >= 0xDC00 && codeLow <= 0xDFFF) {
                    stepRight = 2;
                }
            }
            nextCursor = currentCursor + stepRight;
            break;

        default:
            return null;
    }

    // ИСПРАВЛЕНИЕ: Тотально вычищаем пробелами ВЕСЬ статический буфер до максимальной емкости (264)
    // Это полностью пресекает утечки и «всплытие» хвостов старых длинных команд в ОЗУ
    for (let i = nextLen; i < 264; i++) {
        buf[i] = " ";
    }

    // Собираем итоговую строку. Вызов ассемблируется JIT компилятором напрямую
    let finalString = "";
    for (let i = 0; i < nextLen; i++) {
        finalString += buf[i];
    }

    // ИСПРАВЛЕНИЕ: Форма патча жестко мономорфизирована для сохранения Inline Caching карт V8.
    // Возвращаются фиксированные предопределенные ключи, совместимые со всеми PAC-моделями ввода.
    const patch = {
        buffer: finalString,
        cursor: nextCursor
    };

    Object.preventExtensions(patch);
    return patch;
}
