/**
 * @file src/core/layout/rpath/attr_collapsed.js
 * @version 1.0.0-RELEASE-SMO-DOD-ATTR-COLLAPSED
 * @description Изолированная DOD-процедура переключения схлопывания окна (collapsed).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../../smo/bus.js";

/**
 * Атомарно сворачивает слот и инициирует транзакционный пересчёт флекс-сетки
 */
export function mutateAttrCollapsed(app, node, slotNum, value) {
    node.collapsed = value;

    if (!slotNum || isNaN(slotNum)) return;
    const settings = app?.model?.logicalState?.appSettings;

    const binaryCollapseFlag = value ? 1 : 0;
    if (settings && settings.interface && settings.interface.slots_collapsed) {
        settings.interface.slots_collapsed["slot" + slotNum] = binaryCollapseFlag;
        settings._isSettingsDirty = true;
    }
    
    // Немедленно выстреливаем приказ Балансировщику Геометрии ужать окно до заголовка (3 строки)
    generateGpssTransaction("9", "FORCE_RECALCULATE_LAYOUT", {
        width: app.width || 120,
        height: app.height || 30
    }, "0");
}
