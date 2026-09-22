/**
 * @file src/core/smo/mouse_intents/mouse_hit_test.js
 * @version 2.0.0-RELEASE-SMO-DOD-MOUSE-HIT-TEST-STRICT-Z-ZONE
 * @description Прецизионный DOD-калькулятор координатного луча мыши.
 * ИСПРАВЛЕНО НАЛОЖЕНИЕ: Заблокирован захват служебных каналов 12/200 в зоне контента (Y >= 2).
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation / 0% GC.
 */

/**
 * Вычисляет точечное попадание луча в UHD-сетку окон с защитой от паразитных оверлеев
 */
export function calculateMouseWindowHit(globalX, globalY, geoMap, activeKeys, outRef) {
    if (!geoMap || !activeKeys || !outRef) return;

    // Стерилизация преаллоцированного ОЗУ-регистра результатов
    outRef.hitSlotIdStr = "";
    outRef.localX = 0;
    outRef.localY = 0;
    outRef.w = 0;
    outRef.h = 0;

    const len = activeKeys.length;

    for (let i = 0; i < len; i++) {
        const id = activeKeys[i];

        // АППАРАТНЫЙ ГВАРД ЗOНЫ КОНТЕНТА:
        // Если координата Y находится в зоне контента (Y >= 2), служебные каналы 
        // Window Manager (12 и 200) физически не имеют права перехватывать луч мыши!
        if (globalY >= 2 && (id === "12" || id === "200" || id === "14" || id === "0" || id === "1")) {
            continue;
        }

        // Базовые инфраструктурные каналы полностью исключены из хит-теста
        if (id === "4" || id === "9" || id === "10" || id === "11") {
            continue;
        }

        const geo = geoMap[id];
        if (!geo || geo.w === 0 || geo.h === 0) continue;

        // Строгая проверка вхождения точки в физические границы растра окна
        if (globalX >= geo.x && globalX < (geo.x + geo.w) &&
            globalY >= geo.y && globalY < (geo.y + geo.h)) {
            
            // Цель идентифицирована! Записываем Fast Properties в регистр ОЗУ
            outRef.hitSlotIdStr = id;
            outRef.localX = (globalX - geo.x) | 0;
            outRef.localY = (globalY - geo.y) | 0;
            outRef.w = geo.w;
            outRef.h = geo.h;
            break; // Обрываем проход шины, цель найдена
        }
    }
}
