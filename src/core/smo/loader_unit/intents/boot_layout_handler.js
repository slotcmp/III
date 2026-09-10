/**
 * @file src/core/smo/loader_unit/intents/boot_layout_handler.js
 * @version 1.0.0-RELEASE-SMO-INTENT-BOOT-LAYOUT-HANDLER
 * @description Изолированная DOD-процедура каскадной инициализации и загрузки слотов (Канал 11).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import path from "node:path";
import { _gpssEngineState, generateGpssTransaction } from "../../bus.js";
import { writeCoreLogMessageInline } from "../../logger_io.js";
import { loadAppSettings } from "../../../app_config.js";

// Импортируем изолированные DOD-шаги конвейера сборки и загрузки
import { countActiveTopologySlots } from "../steps/node_counter.js";
import { prepareRegistryBlank } from "../steps/registry_preparer.js";
import { executeIsolatedImportChain } from "../steps/import_chain_executor.js";

const _staticBootScanNodesStack = new Array(64);
const _staticTasksCollectorArray = new Array(32);

/**
 * Процедурно раскладывает дерево топологии на плоские импорт-задачи и выполняет гидратацию
 */
export function handleBootLayoutTree(kernel, rootChildrenArr, modulesRootDirStr) {
    if (!kernel || !rootChildrenArr || !Array.isArray(rootChildrenArr)) return false;

    // 1. Считаем количество активных слотов на плоском статическом стеке (0% GC)
    const totalSlotsToLoad = countActiveTopologySlots(rootChildrenArr);

    const config = loadAppSettings();
    if (!config || config.bAuditTicksBypass !== true) {
        writeCoreLogMessageInline("[LOAD_SEQUENCE] Найдено прикладных slots для гидратации: " + totalSlotsToLoad + "\n");
    }

    // Если слотов нет — моментально завершаем транзакцию загрузки
    if (totalSlotsToLoad === 0) {
        generateGpssTransaction("0", "LOAD_SEQUENCE_COMPLETED", null, "11");
        return true;
    }

    let stackPtr = 0;
    let tasksPtr = 0;

    // Забиваем стартовые корневые узлы в стек обхода разметки
    const initialLen = rootChildrenArr.length;
    for (let i = 0; i < initialLen; i++) {
        if (rootChildrenArr[i] && stackPtr < 64) {
            _staticBootScanNodesStack[stackPtr++] = rootChildrenArr[i];
        }
    }

    // 2. БЕЗАЛЛОКАЦИОННЫЙ ОБХОД ДЕРЕВА И СБОРКА АСИНХРОННЫХ ИМПОРТОВ (O(1) Memory)
    while (stackPtr > 0) {
        const node = _staticBootScanNodesStack[--stackPtr];
        if (!node) continue;

        if (node.type === "slot" && node.id) {
            const id = String(node.id);
            _gpssEngineState.activeSubZonesRegistry[id] = 1;

            const comp = String(node.component || "text_panel").trim();
            const dIdx = Math.floor(node.displayIndex || 0);
            const ctlFilenameStr = comp + "_ctl.js";
            const viewFilenameStr = comp + "_view.js";

            const calculatedW = Math.floor(parseInt(node.width, 10) || 40);
            const calculatedH = Math.max(1, Math.floor(parseInt(node.height, 10) || 10));
            const initialActiveIdx = Math.max(0, Math.floor(node.activeStackIdx || 0));
            const tabsData = node.tabs || null;

            // Шаг А: Преаллокация бланков структур в ОЗУ
            prepareRegistryBlank(kernel, id, comp, dIdx, initialActiveIdx);

            const absoluteCtlPath = path.join(modulesRootDirStr, comp, ctlFilenameStr);

            // Шаг Б: Запускаем изолированный асинхронный импортер
            if (tasksPtr < 32) {
                _staticTasksCollectorArray[tasksPtr++] = executeIsolatedImportChain(
                    kernel, id, comp, dIdx, absoluteCtlPath, 
                    calculatedW, calculatedH, tabsData, initialActiveIdx
                );
            }
        }

        // Продвигаем каретку стека вниз по дочерним контейнерам дерева
        const children = node.children;
        if (children && children.length > 0) {
            const cLen = children.length;
            for (let k = 0; k < cLen; k++) {
                if (stackPtr < 64) _staticBootScanNodesStack[stackPtr++] = children[k];
            }
        }
    }

    // Зачищаем ОЗУ-указатели стека обхода
    while (stackPtr > 0) {
        _staticBootScanNodesStack[--stackPtr] = null;
    }

    // 3. ФИНИШНЫЙ КОНТРОЛЬ ПРОМИСОВ И ВЫСТРЕЛ СИГНАЛА ГОТОВНОСТИ
    const activeTasksSlice = _staticTasksCollectorArray.slice(0, tasksPtr);
    
    Promise.all(activeTasksSlice).then(() => {
        if (!config || config.bAuditTicksBypass !== true) {
            writeCoreLogMessageInline("[LOAD_SEQUENCE] Все бизнес-слоты успешно гидратированы в шину.\n");
        }
        
        // Очищаем массив промисов
        for (let t = 0; t < tasksPtr; t++) {
            _staticTasksCollectorArray[t] = null;
        }

        generateGpssTransaction("0", "LOAD_SEQUENCE_COMPLETED", null, "11");
    });

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit/intents/boot_layout_handler.js
 * Время изменения: 10.09.2026 19:48:50 MSK
 */
