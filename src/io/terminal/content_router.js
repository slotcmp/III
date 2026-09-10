/**
 * @file src/io/terminal/content_router.js
 * @version 5.2.1-RELEASE-SMO-ROUTER-PATH-CORRECTED
 * @description Безмусорный асинхронный роутер, завязанный на глобальный ОЗУ-реестр ядра.
 * ИСПРАВЛЕН ИМПОРТ: Скорректирован относительный путь до slot_maker.js (из src/io/terminal/ в src/core/).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// ИСПРАВЛЕНИЕ: Точный относительный путь к каноническому расположению slot_maker.js
import { _globalDynamicImportsCache } from "../../core/slot_maker.js";

const _MODULES_BASE_DIR = resolve(process.cwd(), "./src/modules");

export async function routeModuleContentRender(compType, view, mdl, activeIdx, slotId, viewStack) {
    if (!compType || !view) return false;

    const key = String(compType).trim();
    
    // Прямое чтение из общей памяти
    let renderFn = _globalDynamicImportsCache[key];

    // Ленивый асинхронный накат в выделенную ячейку (теперь без TypeError)
    if (renderFn === undefined) {
        try {
            const absoluteViewPath = resolve(_MODULES_BASE_DIR, key, key + "_view.js");
            const fileUrlStr = pathToFileURL(absoluteViewPath).href;

            const importedModule = await import(fileUrlStr);
            
            if (importedModule && typeof importedModule.renderContent === "function") {
                _globalDynamicImportsCache[key] = importedModule.renderContent;
                renderFn = importedModule.renderContent;
            } else {
                _globalDynamicImportsCache[key] = null; 
                return false;
            }
        } catch (err) {
            _globalDynamicImportsCache[key] = null;
            return false;
        }
    }

    if (renderFn === null) return false;

    const matrix = view.localBuffer ? view.localBuffer.matrix : view.matrix;
    if (!matrix) return false;

    renderFn(matrix, view.width || 40, view.height || 5, mdl, activeIdx, slotId, viewStack);
    return true;
}
