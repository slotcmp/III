/**
 * @file src/core/layout/layout_balancer.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Балансировщик швов кадра (Presentation-контур).
 * Выстраивает нижние панели в строгую вертикальную стопку и калибрует центральные бизнес-слоты.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Калибрует швы глобальной координатной карты, предотвращая наложение растров слотов
 * @param {Object} globalGeoRegistry Глобальный плоский ОЗУ-реестр геометрии
 * @param {number} totalRowsNum Общее количество строк консоли
 * @param {number} totalColsNum Общее количество знакомест в строке
 */
export function balanceGeometryMap(globalGeoRegistry, totalRowsNum, totalColsNum) {
    if (!globalGeoRegistry) return;

    const maxW = Math.max(40, Math.floor(Number(totalColsNum) || 120));
    const maxH = Math.max(10, Math.floor(Number(totalRowsNum) || 30));

    // 1. Дашборд (101) всегда сверху от края до края
    const s101 = globalGeoRegistry["101"];
    if (s101) {
        s101.x = 0;
        s101.y = 0;
        s101.w = maxW;
        s101.h = 5; 
    }

    // 2. ВЫРАВНИВАЕМ НИЖНЮЮ СТОПКУ СЛОТОВ СНИЗУ ВВЕРХ (Исключаем наложение растров)
    // А. Логгер (108) садится на самый пол терминала
    const s108 = globalGeoRegistry["108"];
    if (s108) {
        s108.h = 6; // Жестко фиксируем высоту логгера в 6 строк
        s108.x = 0;
        s108.w = maxW;
        s108.y = maxH - s108.h; // 30 - 6 = Y:24
    }

    // Б. Командная строка (105) садится строго НАД логгером
    const s105 = globalGeoRegistry["105"];
    if (s105) {
        s105.h = 3; // Жестко фиксируем высоту CLI-строки
        s105.x = 0;
        s105.w = maxW;
        s105.y = s108 ? s108.y - s105.h : maxH - s105.h; // 24 - 3 = Y:21
    }

    // 3. Выравниваем центральное рабочее пространство (Слоты 102, 103, 106)
    const s102 = globalGeoRegistry["102"];
    const s103 = globalGeoRegistry["103"];
    const s106 = globalGeoRegistry["106"];

    if (s102) s102.x = 0;
    if (s103 && s102) s103.x = Math.floor(s102.w || 42);
    if (s106 && s103) {
        s106.x = Math.floor(s103.x || 42) + Math.floor(s103.w || 42);
        s106.w = Math.max(1, maxW - s106.x);
    }

    // Высота центральной зоны зажимается строго между Дашбордом и Командной строкой
    const topLimitY = s101 ? s101.h : 5;
    const bottomLimitY = s105 ? s105.y : 21;
    const availableWorkspaceH = Math.max(1, bottomLimitY - topLimitY); // 21 - 5 = 16 строк

    const centralSlots = ["102", "103", "106"];
    const centralCount = centralSlots.length;
    for (let i = 0; i < centralCount; i++) {
        const slotObj = globalGeoRegistry[centralSlots[i]];
        if (slotObj) {
            slotObj.y = topLimitY;
            slotObj.h = availableWorkspaceH;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/layout_balancer.js
 * Время модификации: 18.08.2026 18:03:00 MSK
 */
