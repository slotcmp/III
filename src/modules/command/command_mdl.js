/**
 * @file src/modules/command/command_mdl.js
 * @version 5.0.0-RELEASE-SMO-COMMAND-MDL-TOTALCMD-COMPLIANT
 * @description Стерильная модель командной строки с регистрами Totalcmd-дополнения и истории.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function createCommandMdlInstance() {
    const mdlState = {
        _isDirty: true,
        textLength: 0,
        cursorX: 0,
        charBuffer: new Array(256),
        buffer: "",
        cursor: 0,

        // РЕГИСТРЫ ИСТОРИИ КОМАНД (32 СТРОКИ)
        historyBuffer: null, // Ссылка на преаллоцированный массив из app_config
        historyCount: 0,
        historyCursor: 0,
        stashBuffer: "",     // Буфер для сохранения недописанной строки при прокрутке истории

        // РЕГИСТРЫ TOTALCMD-АВТОДОПОЛНЕНИЯ (ROUND ROBIN ПО Tab)
        _tabCompletionActive: false,
        _matchEntriesArray: new Array(64), // Буфер ссылок на совпавшие имена файлов/директорий
        _matchCount: 0,
        _matchCurrentIdx: 0,
        _completionBaseLen: 0 // Длина недописанного слова до нажатия Tab
    };

    for (let i = 0; i < 256; i++) {
        mdlState.charBuffer[i] = " ";
    }
    for (let i = 0; i < 64; i++) {
        mdlState._matchEntriesArray[i] = "";
    }

    return mdlState;
}
