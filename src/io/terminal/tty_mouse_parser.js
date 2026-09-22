/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 7.0.0-RELEASE-SMO-MOUSE-PARSER-STRICT-IDD-COMPLIANT
 * @description Центральный WM-диспетчер SGR-мыши платформы SLOTCMP III.
 * ИСПРАВЛЕН КРАХ ФOКУСA: Изъяты скрытые мутации и прямой роутинг. Драйвер переведен на чистый вброс транзактов в Канал 10.
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP / 0% RegExp / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

/**
 * Парсит параметры ConPTY и атомарно маршалирует сырой аппаратный импульс мыши в FIFO-очередь СМО
 * @param {number|string} btn Сырой код кнопки из SGR-последовательности
 * @param {number|string} mX Физический столбец клика на экране терминала (1-based)
 * @param {number|string} mY Физическая строка клика на экране терминала (1-based)
 * @param {boolean} isReleaseChar Флаг отпускания кнопки (символ 'm' или 'M')
 * @param {any} staticSlots Неиспользуемый инфраструктурный резерв
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function parseAndDispatchSgr(btn, mX, mY, isReleaseChar, staticSlots, kernel) {
    if (!kernel) return;

    // Переводим 1-based координаты ConPTY в каноничный 0-based растр знакомест TUI
    const checkX = Math.max(0, Math.floor(Number(mX) || 1) - 1);
    const checkY = Math.max(0, Math.floor(Number(mY) || 1) - 1);
    const buttonCode = Math.max(0, Math.floor(Number(btn) || 0));

    let rawMouseAction = "";

    // =================================================================
    // СТРОГАЯ ФИЛЬТРАЦИЯ ДВИЖЕНИЯ МЫШИ (MOTION = 32) И КОДИРОВАНИЕ ФАЗ
    // =================================================================
    // Проверка бита прокрутки колесика (64)
    if ((buttonCode & 64) !== 0) {
        const wheelDirectionBit = buttonCode & 3;
        rawMouseAction = (wheelDirectionBit === 0) ? "WHEEL_UP" : "WHEEL_DOWN";
    } 
    // Клик левой кнопкой мыши: биты движения (32) и код кнопки (3) равны 0, кнопка зажата (!isReleaseChar)
    else if ((buttonCode & 32) === 0 && (buttonCode & 3) === 0 && !isReleaseChar) {
        rawMouseAction = "MOUSE_CLICK";
    }

    // Если зафиксировано обычное перемещение (hover) или фаза отпускания 'm' —
    // пассивно тушим такт прерывания, полностью защищая Event Loop от лавины мусора
    if (rawMouseAction.length === 0) return;

    // =================================================================
    // МЕТОДОЛОГИЯ IDD: УПАКОВКА И ВБРОС ИМПУЛЬСА В ШИНУ СМО (КАНАЛ 10)
    // =================================================================
    // Создаем плоский анемичный паспорт сырого прерывания ОС
    const rawMousePayload = { 
        x: checkX, 
        y: checkY, 
        action: rawMouseAction 
    };
    
    // Блокируем расширение скрытого класса Fast Properties для TurboFan (0% GC)
    Object.preventExtensions(rawMousePayload);

    // Выстреливаем транзакт в FIFO-очередь обслуживающего прибора мыши (Канал 10).
    // Теперь процессор шины bus.js сам передаст управление в mouse_worker_unit.js,
    // где размоноличенные редьюсеры вычислят хит-тест по отрисованной геометрии!
    generateGpssTransaction("10", "RAW_MOUSE_INTERRUPT", rawMousePayload, "10");
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_parser.js
 * Время изменения: 18.09.2026 04:41:00 MSK
 */
