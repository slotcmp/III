/**
 * @file src/core/smo/intents/cli_reducer.js
 * @version 2.4.0-RELEASE-SMO-CLI-REDUCER-ROUTER-E4X-CONNECTED
 * @description Главный распределитель системных команд CLI (Control-контур).
 * ИСПРАВЛЕНА СТРУКТУРА: Интегрирован перехват E4X-запросов разметки по префиксам '/' и '//'.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../bus.js";

// Импорт размоноличенных процедурных ядер команд
import { reduceCmdCls } from "./cli/cmd_cls.js";
import { reduceCmdMkdir } from "./cli/cmd_mkdir.js";
import { reduceCmdDir } from "./cli/cmd_dir.js";
import { reduceCmdCd } from "./cli/cmd_cd.js";
import { reduceCmdDrive } from "./cli/cmd_drive.js";
import { reduceCmdRpath } from "./cli/cmd_rpath.js"; // Инжектируем новый E4X-модуль

/**
 * Разбирает командную строку и распределяет VFS-прерывания по размоноличенным файлам
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {any} rawCommandInput Контекст Payload (строка или объект { rawCommand })
 */
export function executeCliCommandReducer(kernel, rawCommandInput) {
    if (!kernel || !rawCommandInput) return false;

    let commandLineStr = "";
    if (typeof rawCommandInput === "object" && rawCommandInput.rawCommand !== undefined) {
        commandLineStr = String(rawCommandInput.rawCommand);
    } else {
        commandLineStr = String(rawCommandInput);
    }

    const fullLine = commandLineStr.trim();
    if (fullLine.length === 0) return false;

    // ПРЕЦИЗИОННЫЙ ПЕРЕХВАТ E4X-ЗАПРОСOВ СМО ПО СЕЛЕКТOРАМ НАВИГАЦИИ
    if (fullLine.indexOf("/") === 0) {
        return reduceCmdRpath(kernel, fullLine); // Если строка начинается с '/' или '//' — шлем в Rpath
    }

    // Процедурное разделение на команду и аргумент для стандартных утилит (0% RegExp)
    const spaceIdx = fullLine.indexOf(" ");
    let cmdPart = "";
    let argPart = "";

    if (spaceIdx === -1) {
        cmdPart = fullLine.toLowerCase();
    } else {
        cmdPart = fullLine.substring(0, spaceIdx).toLowerCase();
        argPart = fullLine.substring(spaceIdx + 1).trim();
    }

    // ГВАРД ПЕРЕКЛЮЧЕНИЯ ДИСКОВ (TOTAL COMMANDER STYLE)
    if (cmdPart.length === 2 && cmdPart.charAt(1) === ":") {
        const driveLetterChar = cmdPart.charAt(0);
        return reduceCmdDrive(kernel, driveLetterChar);
    }

    // ВЫСОКОСКОРОСТНОЙ РОУТИНГ СТАНДАРТНЫХ КОМАНД
    if (cmdPart === "cls" || cmdPart === "clear") {
        return reduceCmdCls(kernel);
    }
    
    if (cmdPart === "mkdir") {
        return reduceCmdMkdir(kernel, argPart);
    }
    
    if (cmdPart === "dir") {
        return reduceCmdDir(kernel, argPart);
    }

    if (cmdPart === "cd") {
        return reduceCmdCd(kernel, argPart);
    }

    // Если команда не опознана
    const unknownCmdLogStr = "[CLI_WARN] Неизвестная команда СМО-CLI: '" + cmdPart + "'\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", unknownCmdLogStr, "4");
    return false;
}

export { executeCliCommandReducer as reduceSystemCommandExecute };

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli_reducer.js
 * Время изменения: 05.09.2026 14:11:00 MSK
 */
