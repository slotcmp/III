/**
 * @file src/core/smo/loader_unit.js
 * @version 5.0.0-RELEASE-SMO-LOADER-PURE-PAC-DECOUPLED
 * @description IoC-прибор Канала 11 (Infrastructure).
 * ИСПРАВЛЕНА СТРУКТУРА: Логика полностью декомпозирована на шаги и интенты в папке loader_unit/.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

// Импортируем изолированный DOD-обработчик интентов загрузки дерева разметки
import { handleBootLayoutTree } from "./loader_unit/intents/boot_layout_handler.js";

const _CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const _MODULES_ROOT_DIR = path.resolve(path.dirname(_CURRENT_FILE_PATH), "../../modules");

/**
 * Главная мономорфная точка входа Control-слота Канала 11
 * @param {Object} facilityState Ссылка на анемичный паспорт загрузчика в ОЗУ
 * @param {string} intentStr Имя входящего прерывания (например, "BOOT_LAYOUT_TREE")
 * @param {Object} payload Полезная нагрузка транзакта шины СМО
 * @param {Object} currentTx Текущий обрабатываемый транзакт системных часов
 * @returns {boolean} Флаг успешности выполнения процедуры
 */
export function processSpecificLoaderLogic(facilityState, intentStr, payload, currentTx) {
    if (!facilityState) return false;
    
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr || "");

    // Распределяем прерывания по узкоспециализированным подмодулям папки intents
    if (intent === "BOOT_LAYOUT_TREE" || intent === "RELOAD_LAYOUT") {
        const freshTopologyTree = kernel.layoutTopologyTree;
        if (!freshTopologyTree) return false;

        const children = freshTopologyTree.children || [];
        
        // Передаем управление изолированному каскадному конвейеру
        return handleBootLayoutTree(kernel, children, _MODULES_ROOT_DIR);
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit.js
 * Время изменения: 10.09.2026 19:51:00 MSK
 */
