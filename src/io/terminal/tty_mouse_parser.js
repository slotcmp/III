/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description Плоский потоковый парсер SGR-мыши. 
 * ИСПРАВЛЕНА МАРШРУТИЗАЦИЯ И I/O: Удален appendFileSync, интент унифицирован под Слот 10.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

export const _mouseParserState = {
    _lastClickTime: 0,
    _lastClickSlot: "",
    _lastClickLocalY: -1
};
Object.preventExtensions(_mouseParserState);

/**
 * Чистая процедура: транслирует байты мыши в СМО-канал системного прибора Слота 10
 * @param {number} btn Декодированный код кнопки/состояния мыши
 * @param {number} mX Абсолютная координата X на экране терминала (1-based)
 * @param {number} mY Абсолютная координата Y на экране терминала (1-based)
 * @param {boolean} isReleaseChar Флаг отпускания кнопки мыши
 * @param {Object} staticSlots Ссылка на реестр статичных слотов
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function parseAndDispatchSgr(btn, mX, mY, isReleaseChar, staticSlots, kernel) {
    if (!kernel) return;

    // Переводим 1-based координаты ConPTY в канонические 0-based индексы UHD-матрицы ОЗУ
    const checkX = Math.max(0, Math.floor(Number(mX) || 1) - 1);
    const checkY = Math.max(0, Math.floor(Number(mY) || 1) - 1);
    const buttonCode = Math.max(0, Math.floor(Number(btn) || 0));

    let mouseAction = "";

    if ((buttonCode & 64) !== 0) {
        // КОЛЕСИКО МЫШИ (СКРОЛЛ)
        mouseAction = ((buttonCode & 1) === 0) ? "MOVE_CURSOR_UP" : "MOVE_CURSOR_DOWN";
    } else if ((buttonCode & 3) === 0 && !isReleaseChar) {
        // ЛЕВАЯ КНОПКА МЫШИ (КЛИК)
        mouseAction = "MOUSE_CLICK";
    }

    // Если тип события не распознан — мгновенно гасим прерывание, не нагружая шину
    if (mouseAction.length === 0) return;

    // Формируем плоский пассивный контекст для хит-тестера
    const mouseContextTxPayload = { 
        x: checkX, 
        y: checkY, 
        action: mouseAction 
    };
    Object.preventExtensions(mouseContextTxPayload);

    // ИСПРАВЛЕНИЕ: Выстреливаем единый тактовый транзакт на Системный Слот 10.
    // Сам интент действия упакован внутрь полезной нагрузки (payload.action) 
    // для корректного разбора продвигателем advanceMouseQueueFacility.
    if (typeof generateGpssTransaction === "function") {
        generateGpssTransaction("10", "MOUSE_INTERRUPT", mouseContextTxPayload);
    }
}
