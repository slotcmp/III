/**
 * @file src/core/smo/mouse_intents/mouse_hit_test.js
 * @version 1.0.0-RELEASE-SMO-MOUSE-HIT-TEST
 * @description Изолированный DOD-калькулятор координатного пересечения мыши с TUI-окнами.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Вычисляет, по какому прибору был совершен клик, и формирует локальные координаты знакомест
 * @param {number} globalX Абсцисса клика на терминале
 * @param {number} globalY Ордината клика на терминале
 * @param {Object} geoMap Плоское ОЗУ-зеркало рассчитанных геометрий окон
 * @param {string[]} activeKeys Набор кэшированных строковых ключей активных приборов
 * @param {Object} outResultRef Мономорфный ссылочный регистр для записи выходных параметров (0% GC)
 */
export function calculateMouseWindowHit(globalX, globalY, geoMap, activeKeys, outResultRef) {
    if (!geoMap || !activeKeys || !outResultRef) return;

    const len = activeKeys.length;

    for (let i = 0; i < len; i++) {
        const slotId = activeKeys[i];
        
        // Инфраструктурные скрытые каналы ядра мышь пассивно игнорирует
        const slotIdNum = parseInt(slotId, 10);
        if (isNaN(slotIdNum) || slotIdNum < 100) continue;

        const geo = geoMap[slotId];
        if (!geo) continue;

        const xStart = Math.floor(geo.x || 0);
        const yStart = Math.floor(geo.y || 0);
        const wWidth = Math.floor(geo.w || 0);
        const hHeight = Math.floor(geo.h || 0);

        // Попиксельная проверка вхождения луча в прямоугольник
        if (globalX >= xStart && globalX < xStart + wWidth &&
            globalY >= yStart && globalY < yStart + hHeight) {
            
            outResultRef.hitSlotIdStr = slotId;
            outResultRef.localX = (globalX - xStart) | 0;
            outResultRef.localY = (globalY - yStart) | 0;
            break;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/mouse_intents/mouse_hit_test.js
 * Время создания: 09.09.2026 14:48:15 MSK
 */
