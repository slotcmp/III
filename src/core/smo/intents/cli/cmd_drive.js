/**
 * @file src/core/smo/intents/cli/cmd_drive.js
 * @version 1.0.0-RELEASE-SMO-DOD-CMD-DRIVE
 * @description Изолированная процедура транзакционной смены диска Проводника (как в Total Commander).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import fs from "node:fs";
import { generateGpssTransaction } from "../../bus.js";

/**
 * Выполняет переключение на выбранный диск для активного Проводника 102
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {string} driveLetter Буква диска в нижнем или верхнем регистре (например, "d")
 */
export function reduceCmdDrive(kernel, driveLetter) {
    // 1. DOD-АДРЕСАЦИЯ АКТИВНОЙ ВКЛАДКИ ПРОФИЛЯ VFS (СЛОТ 102)
    const explorerSlot = kernel.model?.logicalState?.panelRegistry["102"];
    const viewStack = explorerSlot?.viewStack;
    if (!viewStack || !Array.isArray(viewStack)) return false;

    const activeIdx = Math.max(0, Math.floor(explorerSlot.activeStackIdx || 0));
    const activeExplorerMdl = viewStack[activeIdx]?.mdl;
    if (!activeExplorerMdl) return false;

    // Формируем канонический корень Windows-диска (например, "D:/")
    const targetDriveRoot = String(driveLetter).toUpperCase() + ":/";

    try {
        // Проверяем, существует ли накопитель в системе (смонтирован ли диск)
        if (fs.existsSync(targetDriveRoot)) {
            // Атомарно перезаписываем путь в ОЗУ-модели Проводника
            activeExplorerMdl.currentDirectoryPath = targetDriveRoot;
            activeExplorerMdl.selectedIndex = 0; // Сбрасываем курсор выделения файлов на первую строчку
            activeExplorerMdl._isDirty = true;

            // Формируем красивый штамп для Системного логгера 108
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");
            const logStr = "[" + h + ":" + m + ":" + s + " Msk] [CLI_DRIVE] Переключение накопителя на: '" + targetDriveRoot + "'\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", logStr, "105");

            // Выстреливаем асинхронный IPC-запрос воркеру VFS на индексацию корня нового диска
            if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
                kernel.workerGateway.triggerDirectoryIndexing("102", targetDriveRoot, activeIdx);
            }

            // Инвалидируем холст ядра для перерисовки нижней рамки
            if (kernel.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }
            return true;
        } else {
            const notExistLogStr = "[CLI_ERROR] Ошибка смены диска: Накопитель '" + targetDriveRoot + "' не найден или не готов.\n";
            generateGpssTransaction("108", "ADD_LOG_ENTRY", notExistLogStr, "4");
        }
    } catch (err) {
        const failLogStr = "[CLI_CRASH] Сбой VFS при переключении диска: " + String(err.message) + "\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", failLogStr, "4");
    }
    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/intents/cli/cmd_drive.js
 */
