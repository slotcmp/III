/**
 * @file src/system/tab_menu/tab_menu_mdl.js
 * @version 1.0.0-RELEASE-SMO-SYS-TAB-MENU-MDL
 * @description Системный регистр ОЗУ координат вкладок Window Manager (Infrastructure).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function createSystemTabMenuMdlInstance() {
    const state = {
        // [Индекс: (slotIdNum * 32) + (tabIdx * 2)] -> startX, +1 -> endX
        coordinatesBuffer: new Int16Array(256 * 16 * 2),
        tabsCountRegistry: new Uint8Array(256),
        activeTabRegistry: new Uint8Array(256)
    };
    Object.preventExtensions(state);
    return state;
}
