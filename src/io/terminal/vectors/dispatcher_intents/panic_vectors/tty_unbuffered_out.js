/**
 * @file src/io/terminal/vectors/dispatcher_intents/panic_vectors/tty_unbuffered_out.js
 * @version 1.0.0-RELEASE-SMO-DOD-TTY-UNBUFFERED-OUT
 * @description ВЫЧИСЛИТЕЛЬНОЕ ЯДРО ЛИКВИДАЦИИ ЗАПАЗДЫВАНИЯ КАДРА. Прямой вылет растра в небуферизируемый stderr.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% try-catch.
 */

import fs from "node:fs";

/**
 * Полностью игнорирует очереди СМО и выталкивает собранную ANSI-матрицу на экран инлайном
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 */
export function flushAnsiFrameToStderrUnbuffered(kernel) {
    if (!kernel || !kernel.virtualCanvasState) return;

    // Шаг А: Принудительно вызываем низкоуровневую синхронизацию дерева экранов
    if (typeof kernel.synchronizeDisplayTree === "function") {
        kernel.synchronizeDisplayTree();
    }
    
    // Шаг Б: Извлекаем готовый текстовый ANSI-снимок глобального UHD-холста
    const rawAnsiFrameStr = kernel.virtualCanvasState.lastRenderedFrameCacheStr || "";
    
    if (rawAnsiFrameStr.length > 0) {
        // ВЫСТРЕЛ: Выжигаем растр напрямую в небуферизируемый дескриптор ошибок '2' (stderr).
        // Это полностью уничтожает тактовое голодание ConPTY и выводит кадр мгновенно!
        fs.writeSync(2, rawAnsiFrameStr, null, "utf8");
        
        kernel.virtualCanvasState.isDirty = false;
    }
}
