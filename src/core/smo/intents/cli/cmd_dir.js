/**
 * @file src/core/smo/intents/cli/cmd_dir.js
 * @version 1.0.0-RELEASE-SMO-DOD-CMD-DIR
 * @description Изолированная процедура принудительной переиндексации VFS.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import path from "node:path";
import { generateGpssTransaction } from "../../bus.js";

/**
 * Выстреливает асинхронный IPC-запрос на сканирование диска воркером
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {string} argPart Строка аргументов команды
 */
export function reduceCmdDir(kernel, argPart) {
    const targetScanPath = argPart.length > 0 ? path.resolve(argPart) : "C:/";
    
    const startLogStr = "[CLI_INFO] Запуск индексации VFS по запросу пользователя: '" + targetScanPath + "'\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", startLogStr, "4");

    if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
        kernel.workerGateway.triggerDirectoryIndexing("102", targetScanPath, 0);
        return true;
    }
    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_dir.js
 */
