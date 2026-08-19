/**
 * @file src/workers/animation_worker.js
 * @path src/workers/animation_worker.js
 * @version 3.0.0-RELEASE-SMO-REACTIVE-INTERPOLATOR-FIXED
 * @description Фоновый DOD-аниматор. Обеспечивает безмусорную интерполяцию (Tween) 
 * координат для горизонтальных и вертикальных шкал Дашборда. Ликвидирован холостой setInterval.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / 0% RegExp / Reactive Interrupts.
 */

import { parentPort } from "node:worker_threads";

// Статичная плоская матрица символов спиннера (Zero Allocation)
const SPIN_CHARS = ["│", "╱", "─", "╲"];

// Реестр состояний слотов на базе плоского типизированного массива во избежание GC
// Для каждого слота резервируем 6 ячеек: [step, currentX, targetX, currentY, targetY, progress]
// Индекс слота вычисляется напрямую из slotId (приводим к целому числу)
const STATE_BUFFER = new Int32Array(256 * 6); 
// Массив флагов активности: 1 - анимируется, 0 - статичен
const ACTIVE_REGISTRY = new Uint8Array(256);

/**
 * Единый реактивный квант пересчета кадра анимации (Вместо setInterval)
 * Вызывается СМО-импульсом EXECUTE_TICK из основного потока.
 */
function processReactiveTick() {
    let activeCount = 0;

    for (let slotId = 0; slotId < 256; slotId++) {
        if (ACTIVE_REGISTRY[slotId] === 0) continue;

        activeCount++;
        const offset = slotId * 6;

        // 1. Побитовый шаг спиннера
        STATE_BUFFER[offset] = (STATE_BUFFER[offset] + 1) & 3;

        // 2. Математическая интерполяция (Плавный пошаговый подплыв)
        let coordMutated = false;
        
        const currentX = STATE_BUFFER[offset + 1];
        const targetX  = STATE_BUFFER[offset + 2];
        const currentY = STATE_BUFFER[offset + 3];
        const targetY  = STATE_BUFFER[offset + 4];

        if (currentX !== targetX) {
            STATE_BUFFER[offset + 1] += (targetX > currentX) ? 1 : -1;
            coordMutated = true;
        }
        if (currentY !== targetY) {
            STATE_BUFFER[offset + 3] += (targetY > currentY) ? 1 : -1;
            coordMutated = true;
        }

        // Если подплыв завершен — гасим активность этого слота
        if (STATE_BUFFER[offset + 1] === targetX && STATE_BUFFER[offset + 3] === targetY) {
            // Если прогресс дошел до конца или не инициализирован — усыпляем
            if (STATE_BUFFER[offset + 5] >= 100 || STATE_BUFFER[offset + 5] === 0) {
                ACTIVE_REGISTRY[slotId] = 0;
            }
        }

        // Отгружаем СМО-импульс в основной поток через мономорфный плоский пакет
        parentPort.postMessage({
            action: "ANIMATION_FRAME_READY",
            payload: {
                slotId: String(slotId),
                char: String(SPIN_CHARS[STATE_BUFFER[offset]]),
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

        // Системное аппаратное прерывание кадра от tty_byte_scanner / bus.js
        if (action === "EXECUTE_TICK") {
            processReactiveTick();
            return;
        }

        if (action === "START_ANIMATION" && payload) {
            const id = parseInt(payload.slotId, 10) | 0;
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
            const id = parseInt(payload.slotId, 10) | 0;
            const offset = id * 6;

            if (payload.targetX !== undefined) STATE_BUFFER[offset + 2] = Math.floor(payload.targetX);
            if (payload.targetY !== undefined) STATE_BUFFER[offset + 4] = Math.floor(payload.targetY);
            if (payload.progress !== undefined) {
                const rawProgress = Math.floor(payload.progress);
                const validatedProgress = isNaN(rawProgress) ? 0 : Math.min(100, Math.max(0, rawProgress));
                STATE_BUFFER[offset + 5] = validatedProgress;
            }
            // Гарантируем пробуждение слота при обновлении координат
            ACTIVE_REGISTRY[id] = 1;
        } 
        
        else if (action === "STOP_ANIMATION" && payload) {
            const id = parseInt(payload.slotId, 10) | 0;
            ACTIVE_REGISTRY[id] = 0;
        }
    });
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/workers/animation_worker.js
 * Время модификации: 19-08-2026 13:46:00 MSK
 * Ревизия: #0819-REACTIVE-WORKER-UPGRADE
 */
