/**
 * @file src/core/layout/rpath/attr_enabled.js
 * @version 1.1.0-RELEASE-SMO-DOD-ATTR-ENABLED-RECALC-CONNECTED
 * @description Изолированная DOD-процедура изменения активности/видимости слота.
 * ИСПРАВЛЕН ПЕРЕСЧЕТ: Инжектирован веерный выстрел FORCE_RECALCULATE_LAYOUT на Канал 9 при изменении флага.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../../smo/bus.js";

/**
 * Атомарно переключает видимость слота в ОЗУ ядра и пинает Балансировщик Геометрии
 */
export function mutateAttrEnabled(app, node, slotNum, value) {
    node.enabled = value;

    if (!slotNum || isNaN(slotNum)) return;
    const settings = app?.model?.logicalState?.appSettings;

    const binaryFlag = value ? 1 : 0;
    if (settings && settings.interface && settings.interface.slots_visibility) {
        settings.interface.slots_visibility["slot" + slotNum] = binaryFlag;
        settings._isSettingsDirty = true;
    }

    // Если слот полностью погасили, а на нём стоял фокус — уводим его на базовый Проводник 102
    if (value === false && app.model?.logicalState) {
        if (String(app.model.logicalState.focusedSlotId) === String(slotNum)) {
            app.model.logicalState.focusedSlotId = "102";
        }
    }

    // =================================================================
    // ВЫСТРЕЛ ПРИКАЗА НА ЖАДНОЕ ПЕРЕРАСПРЕДЕЛЕНИЕ СВОБОДНОГО МЕСТА
    // =================================================================
    // Пинаем Канал 9 (resize_unit) пересчитать флекс-сетку без учета выключенного слота
    generateGpssTransaction("9", "FORCE_RECALCULATE_LAYOUT", {
        width: app.width || 120,
        height: app.height || 30
    }, "0");
}
/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/rpath/attr_enabled.js
 */
