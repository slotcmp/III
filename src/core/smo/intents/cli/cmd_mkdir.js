/**
 * @file src/core/smo/intents/cli/cmd_mkdir.js
 * @version 1.0.0-RELEASE-SMO-DOD-CMD-MKDIR
 * @description Изолированная процедура создания директорий VFS на физическом диске.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { generateGpssTransaction } from "../../bus.js";

/**
 * Выполняет процедурную сборку и создание папки
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {string} argPart Строка аргументов команды
 */
export function reduceCmdMkdir(kernel, argPart) {
    if (argPart.length === 0) {
        const errLogStr = "[CLI_ERROR] Ошибка команды mkdir: Не указано имя директории.\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", errLogStr, "4");
        return false;
    }

    // Линкуемся к текущей активной модели Проводника 102
    const activeExplorerMdl = kernel.model?.logicalState?.panelRegistry["102"]?.viewStack?.[0]?.mdl;
    const basePath = String(activeExplorerMdl?.currentDirectoryPath || "C:/");
    const targetDirectoryFullPath = path.resolve(basePath, argPart);

    try {
        if (!fs.existsSync(targetDirectoryFullPath)) {
            fs.mkdirSync(targetDirectoryFullPath, { recursive: true });
            
            const successLogStr = "[CLI_INFO] Директория успешно создана: '" + targetDirectoryFullPath + "'\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", successLogStr, "4");

            // Реактивно пинаем фоновый воркер VFS для обновления растра файлов
            if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
                kernel.workerGateway.triggerDirectoryIndexing("102", basePath, 0);
            }
            return true;
        } else {
            const existLogStr = "[CLI_WARN] Ошибка mkdir: Директория '" + argPart + "' уже существует.\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", existLogStr, "4");
        }
    } catch (err) {
        const failLogStr = "[CLI_CRASH] Сбой файловой системы при mkdir: " + String(err.message) + "\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", failLogStr, "4");
    }
    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_mkdir.js
 */
