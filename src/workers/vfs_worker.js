/**
 * @file src/workers/vfs_worker.js
 * @version 2.3.6-RELEASE-PURE-DOD-VFS-FIXED
 * @description Фоновый воркер асинхронной индексации дискового пространства Windows (VFS).
 * ИСПРАВЛЕН ПАРСИНГ РАСШИРЕНИЙ: Изъят path.extname для строгого соблюдения запрета 0% RegExp.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Легитимный try-catch.
 */

import fs from "node:fs";
import { parentPort } from "node:worker_threads";

// Преаллоцированные статические DOD-структуры ответов на случай сбоев для исключения аллокаций в catch
const _STATIC_NOT_FOUND_ITEMS = new Array(2);
_STATIC_NOT_FOUND_ITEMS[0] = { name: "..", isDir: true, size: 0, ext: "" };
_STATIC_NOT_FOUND_ITEMS[1] = { name: "[ Директория не найдена ]", isDir: false, size: 0, ext: "" };
Object.preventExtensions(_STATIC_NOT_FOUND_ITEMS[0]);
Object.preventExtensions(_STATIC_NOT_FOUND_ITEMS[1]);
Object.preventExtensions(_STATIC_NOT_FOUND_ITEMS);

const _STATIC_ACCESS_DENIED_ITEMS = new Array(2);
_STATIC_ACCESS_DENIED_ITEMS[0] = { name: "..", isDir: true, size: 0, ext: "" };
_STATIC_ACCESS_DENIED_ITEMS[1] = { name: "[ ОТКАЗАНО В ДОСТУПЕ ]", isDir: false, size: 0, ext: "" };
Object.preventExtensions(_STATIC_ACCESS_DENIED_ITEMS[0]);
Object.preventExtensions(_STATIC_ACCESS_DENIED_ITEMS[1]);
Object.preventExtensions(_STATIC_ACCESS_DENIED_ITEMS);

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
        const targetPathStr = String(task.P3.path || "C:/");
        const targetStackIdxNum = Math.floor(task.P3.targetStackIdx || 0);
        
        // Единственное легитимное исключение из Манифеста для изоляции сбоев файловой системы ОС Windows
        try {
            if (!fs.existsSync(targetPathStr)) {
                const failPayload = {
                    P1: slotIdStr, 
                    P2: "INJECT_VFS_DATA",
                    P3: {
                        currentPath: targetPathStr, 
                        targetStackIdx: targetStackIdxNum,
                        items: _STATIC_NOT_FOUND_ITEMS // Используем преаллоцированный буфер
                    }
                };
                Object.preventExtensions(failPayload.P3); 
                Object.preventExtensions(failPayload);
                parentPort.postMessage(failPayload);
                return;
            }
            
            const rawDirItems = fs.readdirSync(targetPathStr, { withFileTypes: true }) || [];
            const totalItemsCount = rawDirItems.length;
            const resultItemsList = new Array(totalItemsCount + 1);

            resultItemsList[0] = { name: "..", isDir: true, size: 0, ext: "" };
            Object.preventExtensions(resultItemsList[0]);

            for (let i = 0; i < totalItemsCount; i++) {
                const entry = rawDirItems[i];
                const isDir = entry.isDirectory();
                const fileNameStr = String(entry.name || "");

                // ИСПРАВЛЕНИЕ 0% RegExp: Посимвольный инлайн-расчет расширения без использования модуля path
                let calculatedExtStr = "";
                if (isDir === false) {
                    const dotIdx = fileNameStr.lastIndexOf(".");
                    if (dotIdx !== -1 && dotIdx > 0) {
                        calculatedExtStr = fileNameStr.substring(dotIdx).toLowerCase();
                    }
                }

                resultItemsList[i + 1] = {
                    name: fileNameStr,
                    isDir: isDir,
                    size: isDir ? 0 : 4096,
                    ext: calculatedExtStr
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
                    items: _STATIC_ACCESS_DENIED_ITEMS // Защита ОЗУ от генерации мусора при сбоях
                }
            };
            Object.preventExtensions(errorPayload.P3); 
            Object.preventExtensions(errorPayload);
            parentPort.postMessage(errorPayload);
        }
    });
}
