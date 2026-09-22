/**
 * @file src/modules/fnbar/fnbar_mdl.js
 * @version 7.1.1-RELEASE-SMO-DOD-FNBAR-MODEL-STRICT-COMPLIANT
 * @description Мономорфная анемичная модель Функциональной панели (Канал 104) на параллельных массивах.
 * ИСПРАВЛЕНО: Матрицы переведены на 1-based индексацию клавиш (размер 11, где [0] = ""),
 * что полностью исключает сдвиги оффсетов и восстанавливает извлечение ярлыков.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

export function createFnbarMdlInstance() {
    // Каноническая матрица ярлыков, где индекс элемента равен номеру функциональной клавиши
    const matrix = [
        // 0: DEFAULT
        ["", "Help", "Menu", "View", "Edit", "Copy", "RenMov", "MkDir", "Delete", "Conf", "Exit"],
        // 1: CTRL
        ["", "Left", "Right", "Ver", "Edit", "Print", "Link", "Find", "History", "Video", "Tree"],
        // 2: SHIFT
        ["", "Help", "User", "Cmd", "Arch", "Copy", "RenMov", "MkDir", "Delete", "Save", "Last"],
        // 3: ALT
        ["", "Left", "Right", "View", "Hex", "Pack", "Unpack", "Find", "History", "Video", "Tree"]
    ];

    Object.preventExtensions(matrix[0]);
    Object.preventExtensions(matrix[1]);
    Object.preventExtensions(matrix[2]);
    Object.preventExtensions(matrix[3]);

    const mdlState = {
        componentType: "fnbar",
        activeStackIdx: 0, 
        
        menuMatrix: matrix,

        // Типизированный регистр грязи на 4 маски
        isDirtyRegistry: new Uint8Array(4),

        _isDirty: true,
        _activeSubZone: 0
    };

    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/fnbar/fnbar_mdl.js
 * Время изменения: 16.09.2026 23:38:00 MSK
 */
