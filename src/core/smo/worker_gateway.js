/**
 * @file src/core/smo/worker_gateway.js
 * @version 3.7.1-RELEASE-SMO-WORKER-GATEWAY-ORIGIN-SIGNED
 * @description Аппаратный межпоточный шлюз IPC-сообщений (Control-контур).
 * ИСПРАВЛЕН ORIGIN: Все исходящие транзакты от воркеров VFS, Layout и Keyboard строго подписаны каноническими паспортами.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateGpssTransaction, _gpssEngineState } from "./bus.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerGateway(hostRef) {
    const layoutWorkerPath = path.resolve(__dirname, "../../workers/layout_worker.js");
    const vfsWorkerPath = path.resolve(__dirname, "../../workers/vfs_worker.js");
    const kbdWorkerPath = path.resolve(__dirname, "../../workers/keyboard_worker.js");

    const gatewayState = {
        host: hostRef,
        layoutWorker: new Worker(layoutWorkerPath, { type: "module" }),
        vfsWorker: new Worker(vfsWorkerPath, { type: "module" }),
        keyboardWorker: new Worker(kbdWorkerPath, { type: "module" }),

        triggerGeometryCalculation: (layoutTree, widthNum, heightNum, appSettingsObj, txIdNum) => {
            if (!gatewayState.layoutWorker) return;
            
            const taskPack = {
                layoutTree: layoutTree,
                width: Math.floor(widthNum),
                height: Math.floor(heightNum),
                txId: txIdNum
            };
            Object.preventExtensions(taskPack);
            gatewayState.layoutWorker.postMessage(taskPack);
        },

        triggerDirectoryIndexing: (slotIdStr, targetPathStr, targetStackIdxNum) => {
            if (!gatewayState.vfsWorker) return;

            const taskPack = {
                P1: String(slotIdStr),
                P2: "PROCESS_DIRECTORY",
                P3: {
                    path: String(targetPathStr),
                    targetStackIdx: Math.floor(targetStackIdxNum || 0)
                }
            };
            gatewayState.vfsWorker.postMessage(taskPack);
        },

        triggerKeyboardBufferParsing: (focusedSlotIdStr, rawKeyBuffer) => {
            if (!gatewayState.keyboardWorker) return;

            const taskPack = {
                P1: String(focusedSlotIdStr),
                P2: "PROCESS_KEYPRESS",
                P3: {
                    name: rawKeyBuffer.name,
                    sequence: rawKeyBuffer.sequence
                }
            };
            Object.preventExtensions(taskPack.P3);
            Object.preventExtensions(taskPack);
            gatewayState.keyboardWorker.postMessage(taskPack);
        }
    };

    gatewayState.layoutWorker.on("message", (msg) => {
        if (msg && msg.type === "GEO_MAP_COMPUTED") {
            // ИСПРАВЛЕНИЕ: Подписываем кодом Канала 9 (Геометрия)
            generateGpssTransaction("9", "INJECT_GEO_MAP", msg.geoMap, "9");
        }
    });

    // ПРЕЦИЗИОННЫЙ ПРИЕМНИК VFS ОТВЕТОВ
    gatewayState.vfsWorker.on("message", (response) => {
        if (response && response.P2 === "INJECT_VFS_DATA") {
            const targetSlotIdStr = String(response.P1 || "102");
            const vfsPayload = response.P3;
            
            if (vfsPayload) {
                const scannedPathStr = String(vfsPayload.currentPath || "UNKNOWN");
                const itemsCountNum = Array.isArray(vfsPayload.items) ? vfsPayload.items.length : 0;
                
                const now = new Date();
                const h = String(now.getHours()).padStart(2, "0");
                const m = String(now.getMinutes()).padStart(2, "0");
                const s = String(now.getSeconds()).padStart(2, "0");

                const vfsLogLineStr = "[" + h + ":" + m + ":" + s + " Msk] [WORKER_VFS] Индексация завершена: '" + 
                                      scannedPathStr + "' | Найдено объектов: " + itemsCountNum + 
                                      " | Направлено в Слот: " + targetSlotIdStr + "\n";

                // ИСПРАВЛЕНИЕ: Лог подписывается Слотовым идентификатором Проводника-инициатора
                generateGpssTransaction("108", "ADD_LOG_ENTRY", vfsLogLineStr, targetSlotIdStr);
            }

            // ИСПРАВЛЕНИЕ: Пересылка транзакта в модель подписывается суверенным кодом этого же Проводника
            generateGpssTransaction(targetSlotIdStr, "INJECT_VFS_DATA", vfsPayload, targetSlotIdStr);
        }
    });

    gatewayState.keyboardWorker.on("message", (msg) => {
        if (!msg) return;
        
        if (msg.action === "LOG_ENTRY_PENDING") {
            // ИСПРАВЛЕНИЕ: Подписываем кодом Канала 4 (Клавиатура)
            generateGpssTransaction("108", "ADD_LOG_ENTRY", msg.payload, "4");
        } 
        else if (msg.action === "KEYBOARD_ACTION_READY" && msg.payload) {
            // ИСПРАВЛЕНИЕ: Подписываем кодом Канала 4 (Клавиатура)
            generateGpssTransaction("4", "EXECUTE_RESOLVED_KEY", msg.payload, "4");
        }
        else if (msg.action === "KEYBOARD_FACILITY_RELEASE_READY" || msg.action === "RELEASE_KEYBOARD_FACILITY") {
            const kbdUnit = _gpssEngineState.facilitiesRegistry.get("4");
            if (kbdUnit) {
                kbdUnit.isProcessing = false;
            }
        }
    });

    Object.preventExtensions(gatewayState);
    return gatewayState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/worker_gateway.js
 * Время исправления: 03.09.2026 17:02:00 MSK
 */
