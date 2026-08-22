/**
 * @file src/modules/explorer/explorer_mdl.js
 * @version 3.0.1-RELEASE-SMO-EXPLORER-MODEL-MONOMORPHIC
 * @description Анемичная модель данных Проводника (PAC / Abstraction-контур).
 * ИСПРАВЛЕНА АДРЕСАЦИЯ: Имя регистра пути синхронизировано с системной фабрикой slot_maker.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния модели вкладки проводника
 * @returns {Object} Запечатанный struct-подобный литерал ОЗУ
 */
export function createExplorerMdlInstance() {
    const mdlState = {
        // ИСПРАВЛЕНИЕ: Переименовано в currentDirectoryPath для соответствия с slot_maker.js и explorer_ctl.js
        currentDirectoryPath: "C:/",
        
        // Fast Packed Elements массив канонического кэша файлов диска
        itemsList: [
            { name: "..", isDir: true, size: 0, ext: "" },
            { name: "src", isDir: true, size: 0, ext: "" },
            { name: "config", isDir: true, size: 0, ext: "" },
            { name: "index.js", isDir: false, size: 4096, ext: ".js" } // Приведено к единому формату расширений
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
    mdlState.currentDirectoryPath = String(newPathStr || "C:/");
    mdlState._isDirty = true;
}
