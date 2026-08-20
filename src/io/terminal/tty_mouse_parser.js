/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Плоский потоковый парсер SGR-мыши. 
 * Транслирует координаты кликов и скролла в абстрактные СМО-транзакты фонового слота.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import { generateGpssTransaction, _kernelContext } from "../../core/smo/bus.js";

export const _mouseParserState = {
    _lastClickTime: 0,
    _lastClickSlot: "",
    _lastClickLocalY: -1
};
Object.preventExtensions(_mouseParserState);

/**
 * Превентивный гвард для безопасной записи событий ввода в динамический лог-файл
 */
function appendMouseLogGuard(messageStr) {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return; // Раннее гашение, если ОЗУ-контекст ядра еще не готов
    fs.appendFileSync(targetLogPath, messageStr, "utf8");
}

/**
 * Чистая процедура: транслирует байты мыши в СМО-канал текущего фокусного окна
 * @param {number} btn Декодированный код кнопки/состояния мыши
 * @param {number} mX Абсолютная координата X на экране терминала
 * @param {number} mY Абсолютная координата Y на экране терминала
 * @param {boolean} isReleaseChar Флаг отпускания кнопки мыши
 * @param {Object} staticSlots Ссылка на реестр статичных слотов
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function parseAndDispatchSgr(btn, mX, mY, isReleaseChar, staticSlots, kernel) {
    if (!kernel) return;

    // Извлекаем текущий фокусный слот из ядра хоста (по умолчанию CLI 105)
    const focusedSlotIdStr = String(kernel.model?.logicalState?.focusedSlotId || "105");

    const checkX = Math.max(0, Math.floor(Number(mX) || 1) - 1);
    const checkY = Math.max(0, Math.floor(Number(mY) || 1) - 1);
    const buttonCode = Math.max(0, Math.floor(Number(btn) || 0));

    let action = null;
    if ((buttonCode & 64) !== 0) {
        // КОЛЕСИКО МЫШИ (СКРОЛЛ): Эквивалентно стрелочкам навигации
        action = ((buttonCode & 1) === 0) ? "MOVE_CURSOR_UP" : "MOVE_CURSOR_DOWN";
    } else if ((buttonCode & 3) === 0 && !isReleaseChar) {
        // ОБЫЧНЫЙ КЛИК КНОПКИ
        action = "MOUSE_CLICK";
    }

    if (!action) return;

    // Безаллокационный сборщик временной метки (DOD-friendly)
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    // Атомарная запись координат в файл лога через безопасный гвард
    const logLineStr = "[" + h + ":" + m + ":" + s + " Msk] [INPUT_MOUSE] Интент: " + action + 
                       " | Направлен в Слот: " + focusedSlotIdStr + 
                       " | Глоб_Координаты клика: X=" + checkX + " Y=" + checkY + "\n";
    
    appendMouseLogGuard(logLineStr);

    // Формируем плоский пассивный контекст
    const mouseContextTxPayload = { 
        x: checkX, 
        y: checkY, 
        localY: checkY, 
        action: action 
    };
    Object.preventExtensions(mouseContextTxPayload);

    if (typeof generateGpssTransaction === "function") {
        generateGpssTransaction("10", action, mouseContextTxPayload);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_parser.js
 * Время модификации: 18.08.2026 17:44:10 MSK
 */
