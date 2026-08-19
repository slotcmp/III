/**
 * @file src/workers/vfs_worker.js
 * @version 2.3.5-RELEASE-PURE-DOD-VFS-FIXED
 * @description Фоновый воркер асинхронной индексации дискового пространства Windows (VFS).
 * Исправлена фатальная TypeError преаллокации массива, приводившая к падению потока ввода-вывода.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import path from "node:path";
import { parentPort } from "node:worker_threads";

process.on("uncaughtException", (err) => {
    if (parentPort) {
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
        const targetPathStr = String(task.P3.path || "C:\\\\");
        const targetStackIdxNum = Math.floor(task.P3.targetStackIdx || 0);
        
        try {
            if (!fs.existsSync(targetPathStr)) {
                const failPayload = {
                    P1: slotIdStr, 
                    P2: "INJECT_VFS_DATA",
                    P3: {
                        currentPath: targetPathStr, 
                        targetStackIdx: targetStackIdxNum,
                        items: [
                            { name: "..", isDir: true, size: 0, ext: "" },
                            { name: "[ Директория не найдена ]", isDir: false, size: 0, ext: "" }
                        ]
                    }
                };
                Object.preventExtensions(failPayload.P3.items[0]);
                Object.preventExtensions(failPayload.P3.items[1]);
                Object.preventExtensions(failPayload.P3); 
                Object.preventExtensions(failPayload);
                parentPort.postMessage(failPayload);
                return;
            }
            
            const rawDirItems = fs.readdirSync(targetPathStr, { withFileTypes: true }) || [];
            const totalItemsCount = rawDirItems.length;
            const resultItemsList = new Array(totalItemsCount + 1);

            // ПРЕЦИЗИОННОЕ ИСПРАВЛЕНИЕ: Запись строго в нулевую ячейку массива без разрушения ссылки!
            resultItemsList[0] = { name: "..", isDir: true, size: 0, ext: "" };
            Object.preventExtensions(resultItemsList[0]);

            for (let i = 0; i < totalItemsCount; i++) {
                const entry = rawDirItems[i];
                const isDir = entry.isDirectory();
                resultItemsList[i + 1] = {
                    name: String(entry.name || ""),
                    isDir: isDir,
                    size: isDir ? 0 : 4096,
                    ext: isDir ? "" : path.extname(entry.name).toLowerCase()
                };
                Object.preventExtensions(resultItemsList[i + 1]);
            }
            Object.preventExtensions(resultItemsList);
            
            const responsePayload = {
                P1: slotIdStr, 
                P2: "INJECT_VFS_DATA",
                P3: {
                    currentPath: targetPathStr,
                    targetStackIdx: targetStackIdxNum,
                    items: resultItemsList
                }
            };
            Object.preventExtensions(responsePayload.P3); 
            Object.preventExtensions(responsePayload);
            parentPort.postMessage(responsePayload);
            
        } catch (err) {
            const errorPayload = {
                P1: slotIdStr, 
                P2: "INJECT_VFS_DATA",
                P3: {
                    currentPath: targetPathStr, 
                    targetStackIdx: targetStackIdxNum,
                    items: [
                        { name: "..", isDir: true, size: 0, ext: "" },
                        { name: "[ ОТКАЗАНО В ДОСТУПЕ ]", isDir: false, size: 0, ext: "" }
                    ]
                }
            };
            Object.preventExtensions(errorPayload.P3.items[0]);
            Object.preventExtensions(errorPayload.P3.items[1]);
            Object.preventExtensions(errorPayload.P3); 
            Object.preventExtensions(errorPayload);
            parentPort.postMessage(errorPayload);
        }
    });
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/workers/vfs_worker.js
 * Время модификации: 18.08.2026 19:33:00 MSK
 */
