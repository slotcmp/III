/**
 * @file src/io/terminal/content_router.js
 * @version 6.0.0-RELEASE-SMO-ROUTER-PURE-PAC-TRIAD
 * @description Безмусорный асинхронный роутер, завязанный на глобальный ОЗУ-реестр ядра.
 * ИСПРАВЛЕНО: Кэширует весь импортированный модуль для обеспечения работы VTABLE абстрактных триад.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { _globalDynamicImportsCache } from "../../core/slot_maker.js";

const _MODULES_BASE_DIR = resolve(process.cwd(), "./src/modules");

/**
 * Асинхронно подгружает прикладной модуль в кэш ядра, если он еще не инициализирован
 * @returns {Promise<boolean>} Флаг успешности готовности модуля в ОЗУ
 */
export async function routeModuleContentRender(compType, view, mdl, activeIdx, slotId, viewStack) {
    if (!compType || !view) return false;

    const key = String(compType).trim();
    let loadedModule = _globalDynamicImportsCache[key];

    // Ленивый асинхронный накат ВСЕГO модуля в выделенную ячейку (0% Switch)
    if (loadedModule === undefined) {
        try {
            // Формируем путь до вьюхи (она же точка сборки приклада)
            const absoluteViewPath = resolve(_MODULES_BASE_DIR, key, key + "_view.js");
            const fileUrlStr = pathToFileURL(absoluteViewPath).href;

            const importedModule = await import(fileUrlStr);
            
            if (importedModule && typeof importedModule.renderContent === "function") {
                // ИСПРАВЛЕНИЕ: Кэшируем ВЕСЬ модуль целиком! Теперь прокси-шлюзы ctl.processIntent 
                // и ctl.renderContent в steps/triad_assembler.js мгновенно увидят методы.
                _globalDynamicImportsCache[key] = importedModule;
                loadedModule = importedModule;
            } else {
                _globalDynamicImportsCache[key] = null; 
                return false;
            }
        } catch (err) {
            _globalDynamicImportsCache[key] = null;
            return false;
        }
    }

    if (loadedModule === null) return false;

    const matrix = view.localBuffer ? view.localBuffer.matrix : view.matrix;
    if (!matrix) return false;

    // Прямой мономорфный вызов функции рендеринга
    loadedModule.renderContent(matrix, view.width || 40, view.height || 5, mdl, activeIdx, slotId, viewStack);
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/content_router.js
 * Время изменения: 10.09.2026 18:55:00 MSK
 */
