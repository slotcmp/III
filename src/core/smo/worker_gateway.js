/**
 * @file src/core/smo/worker_gateway.js
 * @version 3.2.7-RELEASE-SMO-WORKER-GATEWAY-STRICT
 * @description Аппаратный межпоточный шлюз IPC-сообщений (Control-контур).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateGpssTransaction } from "./bus.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerGateway(hostRef) {
    const gatewayState = {
        host: hostRef,
        layoutWorker: null,
        vfsWorker: null,

        initWorkers: () => {
            const layoutWorkerPath = path.resolve(__dirname, "../../workers/layout_worker.js");
            const vfsWorkerPath = path.resolve(__dirname, "../../workers/vfs_worker.js");

            gatewayState.layoutWorker = new Worker(layoutWorkerPath, { type: "module" });
            gatewayState.vfsWorker = new Worker(vfsWorkerPath, { type: "module" });

            gatewayState.layoutWorker.on("message", (msg) => {
                if (msg && msg.type === "GEO_MAP_COMPUTED") {
                    generateGpssTransaction("9", "INJECT_GEO_MAP", msg.geoMap);
                }
            });

            gatewayState.vfsWorker.on("message", (response) => {
                if (response && response.P2 === "INJECT_VFS_DATA") {
                    generateGpssTransaction(response.P1, "INJECT_VFS_DATA", response.P3);
                }
            });

            Object.preventExtensions(gatewayState.layoutWorker);
            Object.preventExtensions(gatewayState.vfsWorker);
        },

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
        }
    };

    Object.preventExtensions(gatewayState);
    return gatewayState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/worker_gateway.js
 * Время модификации: 18.08.2026 23:44:15 MSK
 */
