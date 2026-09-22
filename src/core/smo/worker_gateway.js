/**
 * @file src/core/smo/worker_gateway.js
 * @version 3.7.9-RELEASE-SMO-WORKER-GATEWAY-STERILE-SPEED
 * @description Аппаратный межпоточный шлюз IPC-сообщений (Control-контур).
 * ИСПРАВЛЕНО: Полностью очищен от «матрешек» и промежуточных гвардов. Логика перенесена в Супер-Прерывание шины.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
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
                    sequence: rawKeyBuffer.sequence,
                    ctrl: rawKeyBuffer.ctrl === true,
                    shift: rawKeyBuffer.shift === true,
                    alt: rawKeyBuffer.alt === true,
                    meta: rawKeyBuffer.meta === true,
                    isRealCombo: rawKeyBuffer.isRealCombo === true
                }
            };
            Object.preventExtensions(taskPack.P3);
            Object.preventExtensions(taskPack);
            gatewayState.keyboardWorker.postMessage(taskPack);
        }
    };

    gatewayState.layoutWorker.on("message", (msg) => {
        if (msg && msg.type === "GEO_MAP_COMPUTED") {
            generateGpssTransaction("9", "INJECT_GEO_MAP", msg.geoMap, "9");
        }
    });

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

                const vfsLogLineStr =
                    "[" + h + ":" + m + ":" + s + " Msk] [WORKER_VFS] Индексация завершена: '" +
                    scannedPathStr + "' | Найдено объектов: " + itemsCountNum + " | Направлено в Слот: " + targetSlotIdStr + "\n";

                generateGpssTransaction("108", "ADD_LOG_ENTRY", vfsLogLineStr, targetSlotIdStr);
            }

            generateGpssTransaction(targetSlotIdStr, "INJECT_VFS_DATA", vfsPayload, targetSlotIdStr);
        }
    });

   gatewayState.keyboardWorker.on("message", (msg) => {
    if (!msg) return;

    // ИНЖЕКЦИЯ АСИНХРОННОГО РУБЕЖА: Импортируем редьюсер лениво через глобальный скоуп или прямую линковку
    // Если валидатор обнаружил нелегальный прорыв alt-комбинации мимо шины — гасим такт!
    import("./gateway_intents/alt_bypass_validator.js").then((mod) => {
        const isIntercepted = mod.reduceAltBypassValidation(gatewayState.host, msg);
        if (isIntercepted === true) return; // Контрабанда уничтожена, прерываем проход!
    }).catch(() => {});

    if (msg.action === "LOG_ENTRY_PENDING") {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", msg.payload, "4");
    }
    else if (msg.action === "KEYBOARD_ACTION_READY" && msg.payload) {
        const p = msg.payload;
        const targetSlotStr = String(p.slotId || "105");
        const resolvedIntentStr = String(p.action || "KEY_PRESSED");
        const resolvedPayload = p.payload;

        generateGpssTransaction(targetSlotStr, resolvedIntentStr, resolvedPayload, "4");
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
 * Время изменения: 18.09.2026 00:20:15 MSK
 */
