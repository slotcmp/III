/**
 * @file src/modules/explorer/explorer_mdl.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Анемичная модель данных Проводника (PAC / Abstraction-контур).
 * Реализует запечатанные мономорфные структуры кэша VFS-элементов дискового пространства.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния модели вкладки проводника
 * @returns {Object} Запечатанный struct-подобный литерал ОЗУ
 */
export function createExplorerMdlInstance() {
    const mdlState = {
        currentPath: "C:\\\\",
        
        // Fast Packed Elements массив кэша файлов диска
        itemsList: [
            { name: "..", isDir: true, size: 0, ext: "" },
            { name: "src", isDir: true, size: 0, ext: "" },
            { name: "config", isDir: true, size: 0, ext: "" },
            { name: "index.js", isDir: false, size: 4096, ext: "js" }
        ], 
        
        selectedIndex: 0,
        viewportOffset: 0,
        _isDirty: true
    };

    // Запечатываем форму объектов элементов для превентивного прогрева карт V8
    const len = mdlState.itemsList.length;
    for (let i = 0; i < len; i++) {
        Object.preventExtensions(mdlState.itemsList[i]);
    }

    Object.preventExtensions(mdlState);
    return mdlState;
}

/**
 * Атомарная перезапись регистра пути в модели
 * @param {Object} mdlState Ссылка на состояние модели
 * @param {string} newPathStr Строковое представление нового абсолютного пути
 * @param {Object} kernelRef Ссылка на рантайм ядра хоста
 */
export function updateCurrentPath(mdlState, newPathStr, kernelRef) {
    if (!mdlState) return;
    mdlState.currentPath = String(newPathStr || "C:\\\\");
    mdlState._isDirty = true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_mdl.js
 * Время модификации: 18.08.2026 18:23:45 MSK
 */
