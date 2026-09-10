/**
 * @file src/workers/animation_worker.js
 * @path src/workers/animation_worker.js
 * @version 3.0.2-RELEASE-SMO-REACTIVE-INTERPOLATOR-CONVERGED
 * @description Фоновый DOD-аниматор. Обеспечивает безмусорную интерполяцию (Tween).
 * ИСПРАВЛЕНЫ ПОБИТОВЫЕ ГВАРДЫ: Изъяты вызовы Math.floor и parseInt для полной защиты 0% GC.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / 0% RegExp / Reactive Interrupts.
 */

import { parentPort } from "node:worker_threads";

// Статичная плоская матрица символов спиннера (Запечатанные кэшированные строки)
const SPIN_CHARS = ["│", "╱", "─", "╲"];
Object.preventExtensions(SPIN_CHARS);

// Преаллоцированный ОЗУ-кэш строковых представлений ID слотов для исключения String Allocation
const _SLOT_ID_STR_CACHE = new Array(256);
for (let i = 0; i < 256; i++) {
    _SLOT_ID_STR_CACHE[i] = String(i);
}
Object.preventExtensions(_SLOT_ID_STR_CACHE);

// Реестр состояний слотов на базе плоского типизированного массива во избежание GC
// Для каждого слота резервируем 6 ячеек: [step, currentX, targetX, currentY, targetY, progress]
const STATE_BUFFER = new Int32Array(256 * 6); 
// Массив флагов активности: 1 - анимируется, 0 - статичен
const ACTIVE_REGISTRY = new Uint8Array(256);

/**
 * Единый реактивный квант пересчета кадра анимации (Вместо setInterval)
 */
function processReactiveTick() {
    for (let slotId = 0; slotId < 256; slotId++) {
        if (ACTIVE_REGISTRY[slotId] === 0) continue;

        const offset = slotId * 6;

        // 1. Побитовый шаг спиннера
        STATE_BUFFER[offset] = (STATE_BUFFER[offset] + 1) & 3;

        // 2. Математическая интерполяция (Плавный пошаговый подплыв)
        const currentX = STATE_BUFFER[offset + 1];
        const targetX  = STATE_BUFFER[offset + 2];
        const currentY = STATE_BUFFER[offset + 3];
        const targetY  = STATE_BUFFER[offset + 4];

        if (currentX !== targetX) {
            STATE_BUFFER[offset + 1] += (targetX > currentX) ? 1 : -1;
        }
        if (currentY !== targetY) {
            STATE_BUFFER[offset + 3] += (targetY > currentY) ? 1 : -1;
        }

        // Если подплыв завершен — гасим активность этого слота
        if (STATE_BUFFER[offset + 1] === targetX && STATE_BUFFER[offset + 3] === targetY) {
            if (STATE_BUFFER[offset + 5] >= 100 || STATE_BUFFER[offset + 5] === 0) {
                ACTIVE_REGISTRY[slotId] = 0;
            }
        }

        parentPort.postMessage({
            action: "ANIMATION_FRAME_READY",
            payload: {
                slotId: _SLOT_ID_STR_CACHE[slotId],
                char: SPIN_CHARS[STATE_BUFFER[offset]],
                currentX: STATE_BUFFER[offset + 1],
                currentY: STATE_BUFFER[offset + 3],
                progress: STATE_BUFFER[offset + 5]
            }
        });
    }
}

if (parentPort) {
    parentPort.on("message", (task) => {
        if (!task || !task.action) return;

        const action = String(task.action);
        const payload = task.payload;

        if (action === "EXECUTE_TICK") {
            processReactiveTick();
            return;
        }

        if (action === "START_ANIMATION" && payload) {
            const id = (Number(payload.slotId) | 0) & 255;
            if (id === 0) return; // Запрет на затирание ОЗУ Слота 0 ядра
            const offset = id * 6;

            if (ACTIVE_REGISTRY[id] === 0) {
                STATE_BUFFER[offset]     = 0; // step
                STATE_BUFFER[offset + 1] = 3; // currentX
                STATE_BUFFER[offset + 2] = 3; // targetX
                STATE_BUFFER[offset + 3] = 1; // currentY
                STATE_BUFFER[offset + 4] = 1; // targetY
                STATE_BUFFER[offset + 5] = 0; // progress
                ACTIVE_REGISTRY[id] = 1;
            }
        } 
        
        else if (action === "UPDATE_TARGET" && payload) {
            const id = (Number(payload.slotId) | 0) & 255;
            if (id === 0) return;
            const offset = id * 6;

            if (payload.targetX !== undefined) STATE_BUFFER[offset + 2] = Number(payload.targetX) | 0;
            if (payload.targetY !== undefined) STATE_BUFFER[offset + 4] = Number(payload.targetY) | 0;
            if (payload.progress !== undefined) {
                const rawProgress = Number(payload.progress) | 0;
                // Безмусорное зажатие диапазона 0..100 на быстрых битовых гвардах
                STATE_BUFFER[offset + 5] = rawProgress > 100 ? 100 : (rawProgress < 0 ? 0 : rawProgress);
            }
            ACTIVE_REGISTRY[id] = 1;
        } 
        
        else if (action === "STOP_ANIMATION" && payload) {
            const id = (Number(payload.slotId) | 0) & 255;
            ACTIVE_REGISTRY[id] = 0;
        }
    });
}
