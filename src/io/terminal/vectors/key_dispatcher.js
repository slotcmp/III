/**
 * @file src/io/terminal/vectors/key_dispatcher.js
 * @version 1.0.9-RELEASE-SMO-KEY-DISPATCHER-STRICT-QUEUE-COMPLIANT
 * @description Изолированный пассивный шлюз трансляции токенов с датчиком Рубежа 1.
 * ИСПРАВЛЕНО: Полностью вырезан прямой процедурный вызов workerGateway. Все буквы переведены на постановку в очередь Прибора 4.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / Zero Allocation.
 */

import { generateGpssTransaction, _gpssEngineState, _activeThemeState } from "../../../core/smo/bus.js";

// Импортируем размоноличенные ядра логики из подпапки интентов
import { executeHardwarePanicBypass } from "./dispatcher_intents/hardware_panic_core.js";
import { guardSystemFacilitiesFocus } from "./dispatcher_intents/guard_focus_vector.js";

/**
 * Осуществляет прецизионный маршалинг аппаратных токенов клавиатуры ConPTY
 */
export function dispatchKeyToken(rawByteNum, charTokenStr, kernel) {
    let nameToken = charTokenStr.toLowerCase();
    let sequenceStr = charTokenStr;

    if (rawByteNum === 0x7F || nameToken === "backspace") { nameToken = "backspace"; sequenceStr = ""; }
    else if (rawByteNum === 0x0D || rawByteNum === 0x0A || nameToken === "enter" || nameToken === "return") { nameToken = "enter"; sequenceStr = "\n"; }
    else if (rawByteNum === 0x09 || nameToken === "tab") { nameToken = "tab"; sequenceStr = "\t"; }

    // =================================================================
    // ФАЗА 1: УНИВЕРСАЛЬНЫЙ ОБНАРУЖИТЕЛЬ КОНТРАБАНДЫ МИМО ШИНЫ СМО (РУБЕЖ 1)
    // =================================================================
    if (_gpssEngineState.isScanActive !== true) {
        let isSystemHotkey = false;
        let targetDisplayIndex = 0;
        const sLen = nameToken.length;

        // Посимвольный разбор строки "alt+X" без регулярных выражений (0% RegExp)
        if (sLen >= 4 && 
            nameToken.charCodeAt(0) === 0x61 && // 'a'
            nameToken.charCodeAt(1) === 0x6C && // 'l'
            nameToken.charCodeAt(2) === 0x74) { // 't'
            
            const digitCharCode = nameToken.charCodeAt(sLen - 1);
            if (digitCharCode >= 0x30 && digitCharCode <= 0x39) { // Полный ряд '0' - '9'
                isSystemHotkey = true;
                targetDisplayIndex = (digitCharCode - 0x30) | 0; // Числовой displayIndex
            }
        }

        // Если зафиксирован несанкционированный прорыв системной комбинации смены окон Window Manager
        if (isSystemHotkey === true && kernel) {
            // Вызываем размоноличенное паническое ядро Рубежа 1
            executeHardwarePanicBypass(kernel, nameToken, targetDisplayIndex);
            return; // Намертво гасим контрабанду
        }
    }

    // =================================================================
    // ФАЗА 2: ПРОВЕРКА И БЕЗОПАСНАЯ АДРЕСАЦИЯ ТЕКСТОВОГО ВВОДА ЧЕРЕЗ СМО
    // =================================================================
    const liveFocusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
    
    // Прогоняем указатель через размоноличенный гвард защиты служебных каналов 108/104
    const focusedId = guardSystemFacilitiesFocus(liveFocusedId);
    
    if (nameToken === "f5") {
        const now = new Date();
        const timeStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0") + "]";
        const msg = timeStr + " [TRACE_1_RAW_TTY] nameToken: '" + nameToken + "' | sequenceStr: '" + sequenceStr + "'\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", msg, "4");
    }

    // Аллоцируем анемичную DOD-структуру под strict Hidden Class V8
    const kbdPayload = { name: nameToken, sequence: sequenceStr };
    Object.preventExtensions(kbdPayload);
    
    // =================================================================
    // КAНОНИЧЕСКИЙ ВЫСТРЕЛ В ОЧЕРЕДЬ ПРИБОРА 4 (ПОЛНАЯ ЛИКВИДАЦИЯ БАЙПАСА)
    // =================================================================
    // Прямой вызов шлюза воркеров уничтожен. Токен буквы безусловно встаёт в localQueue Канала 4!
    generateGpssTransaction("4", "KEY_PRESSED", kbdPayload, focusedId);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/vectors/key_dispatcher.js
 * Время изменения: 18.09.2026 00:27:15 MSK
 */
