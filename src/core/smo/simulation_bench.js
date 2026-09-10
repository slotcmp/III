/**
 * @file src/core/smo/simulation_bench.js
 * @path src/core/smo/simulation_bench.js
 * @version 1.0.1-RELEASE-SMO-SIMULATION-BENCH-FIXED
 * @description Стенд аппаратной имитации тактов и виртуальных приборов SLOTCMP III.
 * ИСПРАВЛЕНЫ КОЛЛИЗИИ И GC: Каналы перенесены в изолированную зону 19x, моки преаллоцированы (0% GC).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import { registerGpssFacility, generateGpssTransaction } from "./bus.js";
import { writeCoreLogMessageInline } from "./logger_io.js";

// Плоский ОЗУ-регистр метрик стенда симуляции
const _benchRegistry = {
    totalSimulatedTicks: 0,
    capturedPacketsCount: 0,
    lastCapturedItemsLength: -1,
    hiddenClassStatusMsk: "MONOMORPHIC"
};
Object.preventExtensions(_benchRegistry);

// ПРЕЦИЗИОННАЯ ПРЕАЛЛОКАЦИЯ МОКОВ ДЛЯ ПОЛНОГО ИСКЛЮЧЕНИЯ АЛЛОКАЦИЙ НА ТАКТАХ (0% GC)
const _MOCK_ITEMS_BUFFER = [
    { name: "..", isDir: true, size: 0, ext: "" },
    { name: "SIMULATED_FILE_A.DOD", isDir: false, size: 1024, ext: ".dod" },
    { name: "SIMULATED_DIR_B", isDir: true, size: 0, ext: "" }
];
Object.preventExtensions(_MOCK_ITEMS_BUFFER[0]);
Object.preventExtensions(_MOCK_ITEMS_BUFFER[1]);
Object.preventExtensions(_MOCK_ITEMS_BUFFER[2]);
Object.preventExtensions(_MOCK_ITEMS_BUFFER);

const _STATIC_MOCK_PAYLOAD = {
    currentPath: "C:/VIRTUAL_SIMULATION_ROOT",
    targetStackIdx: 0,
    items: _MOCK_ITEMS_BUFFER
};
Object.preventExtensions(_STATIC_MOCK_PAYLOAD);

/**
 * Инициализирует и монтирует виртуальные приборы на шину СМО
 */
export function initializeSimulationBench(kernelRef) {
    writeCoreLogMessageInline("\n=================================================================\n");
    writeCoreLogMessageInline("[SMO_BENCH] ЗАПУСК СТЕНДА АППАРАТНОЙ ИМИТАЦИИ ИНТЕНТОВ И ТАКТОВ...\n");
    writeCoreLogMessageInline("=================================================================\n");

    // 1. СБОРКА ВИРТУАЛЬНОГО ПРИБОРА КАНАЛА 198 (ИСТОЧНИК VFS)
    const virtualVfsSource = {
        host: kernelRef,
        slotId: "198",
        componentType: "virtual_vfs_source",
        displayIndex: 198,
        localQueue: [],
        _head: 0,
        
        dispatch: (actionStr, gpssTx) => {
            if (!gpssTx) return false;
            virtualVfsSource.localQueue.push(gpssTx);
            return true;
        },
        
        advanceFacility: () => {
            while (virtualVfsSource._head < virtualVfsSource.localQueue.length) {
                const tx = virtualVfsSource.localQueue[virtualVfsSource._head++];
                if (tx) _benchRegistry.totalSimulatedTicks++;
            }
            return false;
        }
    };
    Object.preventExtensions(virtualVfsSource);
    registerGpssFacility("198", virtualVfsSource);

    // 2. СБОРКА ВИРТУАЛЬНОГО ПРИБОРА КАНАЛА 192 (СТОК ПРОВОДНИКА ИЗОЛИРОВАННЫЙ)
    const virtualExplorerSink = {
        host: kernelRef,
        slotId: "192",
        componentType: "virtual_explorer_sink",
        displayIndex: 192,
        localQueue: [],
        _head: 0,
        
        dispatch: (actionStr, gpssTx) => {
            if (!gpssTx) return false;
            virtualExplorerSink.localQueue.push(gpssTx);
            return true;
        },
        
        advanceFacility: () => {
            let isMutated = false;
            while (virtualExplorerSink._head < virtualExplorerSink.localQueue.length) {
                const tx = virtualExplorerSink.localQueue[virtualExplorerSink._head++];
                if (!tx) continue;
                
                _benchRegistry.capturedPacketsCount++;
                const intent = String(tx.P2 || "");
                
                if (intent === "INJECT_VFS_DATA") {
                    const ctx = tx.P3;
                    if (ctx) {
                        const itemsArr = ctx.items;
                        _benchRegistry.lastCapturedItemsLength = Array.isArray(itemsArr) ? itemsArr.length : -2;
                        
                        writeCoreLogMessageInline("[SMO_BENCH_AUDIT] СТОК 192 принял транзакт #" + tx.id + " | Интент: " + intent + "\n");
                        writeCoreLogMessageInline("[SMO_BENCH_AUDIT] Результат замера ДНК данных: длина массива файлов = " + _benchRegistry.lastCapturedItemsLength + "\n");
                        
                        if (_benchRegistry.lastCapturedItemsLength === -2) {
                            _benchRegistry.hiddenClassStatusMsk = "DEOPTIMIZED_SLICED";
                            writeCoreLogMessageInline("[SMO_BENCH_ALERT] !!! ФАТАЛЬНЫЙ СРЕЗ ДАННЫХ ДЕТЕКТИРОВАН В ОЧЕРЕДИ ПРИБОРА !!!\n");
                        } else {
                            writeCoreLogMessageInline("[SMO_BENCH_SUCCESS] Структура данных доставлена в ОЗУ прибора без потерь.\n");
                        }
                    }
                    isMutated = true;
                }
            }
            return isMutated;
        }
    };
    Object.preventExtensions(virtualExplorerSink);
    
    // Исправлено: Регистрируем приборы в безопасных, не конфликтующих с WM-интерфейсом каналах
    registerGpssFacility("192", virtualExplorerSink);

    writeCoreLogMessageInline("[SMO_BENCH] Виртуальные приборы 198 and 192 успешно смонтированы на шину.\n\n");
}

/**
 * Симулирует реактивный аппаратный импульс (Такт А: Мгновенный проброс)
 */
export function runInstantSimulationStep() {
    writeCoreLogMessageInline("[SMO_BENCH] Эксперимент А: Мгновенный синхронный вброс транзакта...\n");
    generateGpssTransaction("192", "INJECT_VFS_DATA", _STATIC_MOCK_PAYLOAD, "198");
}

/**
 * Симулирует отложенный аппаратный импульс через микрозадачи (Такт Б: Асинхронный сдвиг)
 */
export function runDeferredSimulationStep() {
    writeCoreLogMessageInline("\n[SMO_BENCH] Эксперимент Б: Отложенный асинхронный вброс через process.nextTick...\n");
    process.nextTick(() => {
        writeCoreLogMessageInline("[SMO_BENCH] Срабатывание nextTick. Энергия импульса высвобождена.\n");
        generateGpssTransaction("192", "INJECT_VFS_DATA", _STATIC_MOCK_PAYLOAD, "198");
    });
}
