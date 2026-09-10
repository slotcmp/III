/**
 * @file src/workers/vfs_worker.js
 * @version 2.3.8-RELEASE-PURE-DOD-VFS-FIXED
 * @description Фоновый воркер асинхронной индексации дискового пространства Windows (VFS).
 * ИСПРАВЛЕН КРАШ IPC: Удалены вызовы preventExtensions перед postMessage для предотвращения DataCloneError.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Легитимный try-catch.
 */

import fs from "node:fs";
import { parentPort } from "node:worker_threads";

// Статические DOD-структуры ответов остаются открытыми для беспрепятственного клонирования
const _STATIC_NOT_FOUND_ITEMS = [
    { name: "..", isDir: true, size: 0, ext: "" },
    { name: "[ Директория не найдена ]", isDir: false, size: 0, ext: "" }
];

const _STATIC_ACCESS_DENIED_ITEMS = [
    { name: "..", isDir: true, size: 0, ext: "" },
    { name: "[ ОТКАЗАНО В ДОСТУПЕ ]", isDir: false, size: 0, ext: "" }
];

process.on("uncaughtException", (err) => {
    if (parentPort) {
        // Логирование фатального сбоя воркера через открытый литерал требований
        parentPort.postMessage({
            P1: "108", 
            P2: "ADD_LOG_ENTRY",
            P3: "[FATAL_VFS_WORKER_CRASH] Сбой потока: " + String(err.stack || err)
        });
    }
    process.exit(1);
});

if (parentPort) {
    parentPort.on("message", (task) => {
        if (!task || !task.P2 || !task.P3) return;
        const slotIdStr = String(task.P1 || "102");
        const targetPathStr = String(task.P3.path || "C:/");
        const targetStackIdxNum = Math.floor(task.P3.targetStackIdx || 0);
        
        try {
            if (!fs.existsSync(targetPathStr)) {
                const failPayload = {
                    P1: slotIdStr, 
                    P2: "INJECT_VFS_DATA",
                    P3: {
                        currentPath: targetPathStr, 
                        targetStackIdx: targetStackIdxNum,
                        items: _STATIC_NOT_FOUND_ITEMS 
                    }
                };
                // Исправлено: предотвращаем вызовы запечатывания на IPC-мосту воркера
                parentPort.postMessage(failPayload);
                return;
            }
            
            const rawDirItems = fs.readdirSync(targetPathStr, { withFileTypes: true }) || [];
            const totalItemsCount = rawDirItems.length;
            const resultItemsList = new Array(totalItemsCount + 1);

            resultItemsList[0] = { name: "..", isDir: true, size: 0, ext: "" };

            for (let i = 0; i < totalItemsCount; i++) {
                const entry = rawDirItems[i];
                const isDir = entry.isDirectory();
                const fileNameStr = String(entry.name || "");

                let calculatedExtStr = "";
                if (isDir === false) {
                    let dotIdx = -1;
                    let cursor = fileNameStr.length - 1;
                    
                    while (cursor > 0) {
                        if (fileNameStr.charCodeAt(cursor) === 0x2E) { // ASCII-код символа '.'
                            dotIdx = cursor;
                            break;
                        }
                        cursor--;
                    }
                    
                    if (dotIdx !== -1) {
                        calculatedExtStr = fileNameStr.substring(dotIdx).toLowerCase();
                    }
                }

                resultItemsList[i + 1] = {
                    name: fileNameStr,
                    isDir: isDir,
                    size: isDir ? 0 : 4096,
                    ext: calculatedExtStr
                };
            }
            
            const responsePayload = {
                P1: slotIdStr, 
                P2: "INJECT_VFS_DATA",
                P3: {
                    currentPath: targetPathStr,
                    targetStackIdx: targetStackIdxNum,
                    items: resultItemsList
                }
            };
            parentPort.postMessage(responsePayload);
            
        } catch (err) {
            const errorPayload = {
                P1: slotIdStr, 
                P2: "INJECT_VFS_DATA",
                P3: {
                    currentPath: targetPathStr, 
                    targetStackIdx: targetStackIdxNum,
                    items: _STATIC_ACCESS_DENIED_ITEMS 
                }
            };
            parentPort.postMessage(errorPayload);
        }
    });
}
