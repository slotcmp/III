/**
 * @file src/system/tab_menu/tab_menu_mdl.js
 * @version 5.1.1-RELEASE-SMO-SYS-TAB-MENU-MDL-6-PRIMITIVES-FIXED
 * @description Системная модель Слот 12. Выделен жесткий 6-параметрический страйд ОЗУ.
 */
export function createSystemTabMenuMdlInstance() {
    // ИСПРАВЛЕНО: 64 паспорта * 6 примитивов = 384 ячейки бинарной памяти (Защита от Out-of-Bounds)
    const passportsPool = new Int16Array(64 * 6);

    const state = {
        // Плоский векторный пул паспортов ушек (0% GC)
        tabsVectorArray: passportsPool,
        
        // Общий счетчик фактически проиндексированных вкладок в рантайме
        totalRegisteredTabsCount: 0,

        // Системный Uint8Array регистр количества ушек для 256 возможных слотов
        tabsCountRegistry: new Uint8Array(256),
        
        // Регистр текущих активных выбранных индексов ушек в разрезе слотов
        activeTabRegistry: new Uint8Array(256),
        
        _isDirty: true
    };
    
    Object.preventExtensions(state);
    return state;
}