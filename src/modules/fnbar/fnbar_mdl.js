/**
 * @file src/modules/fnbar/fnbar_mdl.js
 * @version 1.1.0-RELEASE-SMO-DOD-FNBAR-MDL-UNIFIED
 * @description Анемичная модель данных Far-панели (PAC / Abstraction).
 * ИСПРАВЛЕНО: Функция переименована в assembleModel для глобальной унификации.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function assembleModel() {
    const mdlState = {
        _isDirty: true,
        _activeSubZone: 1,
        
        // 0 - default, 1 - ctrl, 2 - shift, 3 - alt
        activeModifierIdx: 0,

        _modifierTitles: [
            "Меню: F(n)",
            "Меню Ctrl+F(n)",
            "Меню Shift+F(n)",
            "Меню Alt+F(n)"
        ],

        menuMatrix: [
            ["Help", "Menu", "View", "Edit", "Copy", "RenMov", "MkDir", "Delete", "Conf", "Exit"],
            ["Left", "Right", "Ver", "Edit", "Print", "Link", "Find", "History", "Video", "Tree"],
            ["Help", "User", "Cmd", "Arch", "Copy", "RenMov", "MkDir", "Delete", "Save", "Last"],
            ["Left", "Right", "View", "Hex", "Pack", "Unpack", "Find", "History", "Video", "Tree"]
        ]
    };

    // Фиксируем Hidden Class для V8 TurboFan
    Object.preventExtensions(mdlState._modifierTitles);
    Object.preventExtensions(mdlState.menuMatrix);
    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/fnbar/fnbar_mdl.js
 * Время изменения: 06.09.2026 22:12:00 MSK
 */
