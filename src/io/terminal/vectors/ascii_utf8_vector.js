/**
 * @file src/io/terminal/vectors/ascii_utf8_vector.js
 * @version 1.0.1-RELEASE-SMO-VECTOR-ASCII-UTF8-FIXED
 * @description Вынесенный изолированный автомат разбора базового ASCII и многобайтового UTF-8 контура.
 * ИСПРАВЛЕНО: Ликвидировано перетирание st.utf8Buffer числом. Запись переведена на накопление по индексам.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% try-catch.
 */

import { dispatchKeyToken } from "./key_dispatcher.js";

// Преаллоцированный статический буфер маршалинга для защиты кучи от Garbage Collector (0% GC)
const _staticTokenBuffer = Buffer.alloc(4);

export function reduceBasicAsciiAndUtf8(b, st, kernel) {
    if (b === 0x1B) {
        st.state = 1; 
        return;
    }

    if (st.utf8Expected === 0) {
        // Контур 1: Нативный однобайтовый ASCII-ввод (0x00 - 0x7F)
        if ((b & 0x80) === 0x00) {
            dispatchKeyToken(b, String.fromCharCode(b), kernel);
        } 
        // Контур 2: Начало 2-байтовой UTF-8 последовательности (Кириллица, байты 208/209)
        else if ((b & 0xE0) === 0xC0) {
            st.utf8Buffer[0] = b; // ИСПРАВЛЕНО: Запись строго в массив без разрушения типа данных
            st.utf8Length = 1; 
            st.utf8Expected = 2;
        } 
        // Контур 3: Начало 3-байтовой UTF-8 последовательности
        else if ((b & 0xF0) === 0xE0) {
            st.utf8Buffer[0] = b; 
            st.utf8Length = 1; 
            st.utf8Expected = 3;
        } 
        // Контур 4: Начало 4-байтовой UTF-8 последовательности
        else if ((b & 0xF8) === 0xF0) {
            st.utf8Buffer[0] = b; 
            st.utf8Length = 1; 
            st.utf8Expected = 4;
        }
    } else {
        // Накопление последующих байт UTF-8 токена в преаллоцированный ОЗУ-массив
        st.utf8Buffer[st.utf8Length++] = b;
        
        // Когда собраны абсолютно все ожидаемые байты мультибайтового символа
        if (st.utf8Length === st.utf8Expected) {
            for (let j = 0; j < st.utf8Expected; j++) {
                _staticTokenBuffer[j] = st.utf8Buffer[j];
            }
            
            // Быстрое декодирование собранного текстового растра из статического буфера
            const assembledCharStr = _staticTokenBuffer.toString("utf8", 0, st.utf8Expected);
            
            // Сбрасываем регистры автомата в исходное состояние (Zero Allocation)
            st.utf8Expected = 0; 
            st.utf8Length = 0;
            
            // Выстреливаем собранный кириллический символ дальше по конвейеру прерываний
            dispatchKeyToken(0, assembledCharStr, kernel);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/vectors/ascii_utf8_vector.js
 * Время изменения: 17.09.2026 23:01:40 MSK
 */
