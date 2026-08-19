/**
 * @file src/io/terminal/common_input_engine.js
 * @version 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description Общий служебный движок посимвольного строкового ввода (PAC / Abstraction).
 * Осуществляет прецизионный in-place расчет мутаций текстовых буферов с поддержкой суррогатных пар.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

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

    let activeKey = "";
    let currentBuffer = "";

    if (model.buffer !== undefined) { activeKey = "buffer"; currentBuffer = String(model.buffer); }
    else if (model.text !== undefined) { activeKey = "text"; currentBuffer = String(model.text); }
    else if (model.value !== undefined) { activeKey = "value"; currentBuffer = String(model.value); }
    else { return null; }
    
    const bufferLen = currentBuffer.length;

    let cursorKey = "";
    let rawCursor = bufferLen;

    if (model.cursor !== undefined) { cursorKey = "cursor"; rawCursor = Number(model.cursor) || 0; }
    else if (model.cursorX !== undefined) { cursorKey = "cursorX"; rawCursor = Number(model.cursorX) || 0; }
    else { return null; }
    
    const currentCursor = Math.max(0, Math.min(bufferLen, rawCursor));
    const buf = _charBuffer;

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

            for (let i = bufferLen - 1; i >= currentCursor; i--) {
                buf[i + allowedLen] = buf[i];
            }

            for (let i = 0; i < allowedLen; i++) {
                buf[currentCursor + i] = payloadStr.charAt(i);
            }

            nextLen = bufferLen + allowedLen;
            nextCursor = currentCursor + allowedLen;
            break;

        case "BACKSPACE":
            if (currentCursor > 0 && bufferLen > 0) {
                let charsToRemove = 1;
                if (currentCursor >= 2) {
                    const codeHigh = currentBuffer.charCodeAt(currentCursor - 2);
                    const codeLow = currentBuffer.charCodeAt(currentCursor - 1);
                    if (codeHigh >= 0xD800 && codeHigh <= 0xDBFF && codeLow >= 0xDC00 && codeLow <= 0xDFFF) {
                        charsToRemove = 2;
                    }
                }

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

    for (let i = nextLen; i < bufferLen; i++) {
        buf[i] = " ";
    }

    let finalString = "";
    for (let i = 0; i < nextLen; i++) {
        finalString += buf[i];
    }

    const patch = Object.create(null);
    patch[activeKey] = finalString;
    patch[cursorKey] = nextCursor;

    Object.preventExtensions(patch);
    return patch;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/common_input_engine.js
 * Время модификации: 18.08.2026 17:48:10 MSK
 */
