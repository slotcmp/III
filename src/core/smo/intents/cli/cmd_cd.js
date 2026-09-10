/**
 * @file src/core/smo/intents/cli/cmd_cd.js
 * @version 1.0.0-RELEASE-SMO-DOD-CMD-CD
 * @description Изолированная процедура транзакционной смены директории Проводника через CLI.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { generateGpssTransaction } from "../../bus.js";

/**
 * Выполняет смену директории для активного Проводника 102
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {string} argPart Строка аргументов команды (целевой путь)
 */
export function reduceCmdCd(kernel, argPart) {
    // Извлекаем модель активной вкладки Проводника 102
    const explorerSlot = kernel.model?.logicalState?.panelRegistry["102"];
    const viewStack = explorerSlot?.viewStack;
    if (!viewStack || !Array.isArray(viewStack)) return false;

    const activeIdx = Math.max(0, Math.floor(explorerSlot.activeStackIdx || 0));
    const activeExplorerMdl = viewStack[activeIdx]?.mdl;
    if (!activeExplorerMdl) return false;

    const currentPath = String(activeExplorerMdl.currentDirectoryPath || "C:/");
    
    // Если путь не указан — по умолчанию сбрасываем в корень C:/
    let targetPath = argPart.length > 0 ? argPart : "C:/";
    
    // Разрешаем относительные пути (например, cd .., cd modules, cd ./src)
    let nextDirectoryPath = path.resolve(currentPath, targetPath);

    try {
        if (fs.existsSync(nextDirectoryPath)) {
            const stat = fs.statSync(nextDirectoryPath);
            
            if (stat.isDirectory()) {
                // Атомарно перезаписываем путь в ОЗУ-модели Проводника
                activeExplorerMdl.currentDirectoryPath = nextDirectoryPath;
                activeExplorerMdl.selectedIndex = 0; // Сбрасываем курсор выделения файлов
                activeExplorerMdl._isDirty = true;

                // Пишем транзакционный паспорт в Системный логгер 108
                const now = new Date();
                const h = String(now.getHours()).padStart(2, "0");
                const m = String(now.getMinutes()).padStart(2, "0");
                const s = String(now.getSeconds()).padStart(2, "0");
                const successLogStr = "[" + h + ":" + m + ":" + s + " Msk] [CLI_CD] Директория изменена на: '" + nextDirectoryPath + "'\n";
                generateGpssTransaction("108", "ADD_LOG_ENTRY", successLogStr, "105");

                // Пинаем воркер VFS на немедленное перечитывание физического диска
                if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
                    kernel.workerGateway.triggerDirectoryIndexing("102", nextDirectoryPath, activeIdx);
                }

                // Инвалидируем холст ядра для перерисовки нижних рамок с актуальным путем
                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                return true;
            } else {
                const notDirLogStr = "[CLI_ERROR] Ошибка cd: '" + targetPath + "' не является директорией.\n";
                generateGpssTransaction("108", "ADD_LOG_ENTRY", notDirLogStr, "4");
            }
        } else {
            const notExistLogStr = "[CLI_ERROR] Ошибка cd: Системе не удается найти указанный путь: '" + targetPath + "'\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", notExistLogStr, "4");
        }
    } catch (err) {
        const failLogStr = "[CLI_CRASH] Сбой VFS при выполнении команды cd: " + String(err.message) + "\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", failLogStr, "4");
    }
    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_cd.js
 */
