/**
 * @file src/io/terminal/vectors/dispatcher_intents/hardware_panic_core.js
 * @version 1.0.7-RELEASE-SMO-DOD-HARDWARE-PANIC-CORE-DIRECT-INLINE-BLIT
 * @description Вынесенное изолированное паническое ядро Рубежа 1.
 * ИСПРАВЛЕНО: Интегрирован сквозной форсаж кадра через synchronizeDisplayTree и flushVirtualCanvasToTty для вывода лога в текущий тик.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { _gpssEngineState, _activeThemeState } from "../../../../core/smo/bus.js";

// Импортируем изолированные размоноличенные DOD-векторы логики вывода
import { blitFallbackMatricesInRam } from "./panic_vectors/matrix_fallback_blit.js";
import { writePanicTraceToDiskSync } from "./panic_vectors/sync_disk_flusher.js";

/**
 * Осуществляет экстренную блокировку прорыва, каскадный вызов векторов закраски, записи на диск и моментального рендера кадра
 */
export function executeHardwarePanicBypass(kernel, nameToken, targetDisplayIndex) {
    const activeKeys = _gpssEngineState.facilitiesKeysCached;
    const keysLen = activeKeys.length;
    let resolvedFocusedSlotStr = "";

    // Высокоскоростной плоский DOD-поиск прибора по его физическому displayIndex в ОЗУ
    for (let k = 0; k < keysLen; k++) {
        const currentKey = activeKeys[k];
        if (currentKey === "0" || currentKey === "1" || currentKey === "4" || currentKey === "9" || currentKey === "14") {
            continue;
        }
        const facility = _gpssEngineState.facilitiesRegistry.get(currentKey);
        if (facility && Math.floor(facility.displayIndex || 0) === targetDisplayIndex) {
            resolvedFocusedSlotStr = currentKey;
            break;
        }
    }

    if (resolvedFocusedSlotStr.length > 0) {
        // Атомарно перенаправляем указатели фокуса и синхронизируем слой Z-2 темы оформления
        kernel.model.logicalState.focusedSlotId = resolvedFocusedSlotStr;
        _activeThemeState.focusedSlotIdStr = resolvedFocusedSlotStr;

        // Метка аварийного падения Слота 105 взводится в sub-зоны шины
        _gpssEngineState.activeSubZonesRegistry["105"] = 0xDEAD;

        // Формируем текстовый паспорт паники контракта
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        const panicLogStr = 
            "[" + h + ":" + m + ":" + s + " Msk] [CONTRACT_PANIC] ОБНАРУЖЕН ПРОРЫВ НА АППАРАТНОМ РУБЕЖЕ 1! -> Компонент: 'key_dispatcher.js' | Перехвачен нелегальный токен: '" + nameToken + "'\n";

        // ТАКТ 1: Инлайновый blit-накат красной сетки и текста лога в ОЗУ-матрицы кадра (0% СМО-очередей)
        blitFallbackMatricesInRam(kernel, panicLogStr);

        // ТАКТ 2: Синхронный безаллокационный выжиг строки трейса на физический накопитель
        writePanicTraceToDiskSync(panicLogStr);

        // Аппаратный акустический зуммер Рубежа 1 (ASCII Bell \x07 — писк спикера BIOS)
        if (process.stderr) {
            process.stderr.write("\x07");
        }

        // =============================================================
        // ИСПРАВЛЕНИЕ: СКВOЗНОЙ ТAКТОВЫЙ ФOРСАЖ КАДРA (МГНОВЕННЫЙ ВЫШИБ)
        // =============================================================
        // Полностью обходим очереди СМО и принудительно собираем локальные матрицы Слотов 105 и 108 в холст
        if (typeof kernel.synchronizeDisplayTree === "function") {
            kernel.synchronizeDisplayTree();
        }

        // Атомарно выталкиваем собранную дельту кадра из virtualCanvasState напрямую в TTY дескриптор терминала
        if (typeof kernel.flushVirtualCanvasToTty === "function") {
            kernel.flushVirtualCanvasToTty();
        }
    }
}
