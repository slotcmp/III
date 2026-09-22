/**
 * @file src/io/terminal/content_router.js
 * @version 6.0.1-RELEASE-SMO-ROUTER-VTABLE-FIXED
 * @description Безмусорный асинхронный роутер. Исправлено раздельное кэширование VTABLE контроллера и вьюхи.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { _globalDynamicImportsCache } from "../../core/slot_maker.js";

const _MODULES_BASE_DIR = resolve(process.cwd(), "./src/modules");

export async function routeModuleContentRender(compType, view, mdl, activeIdx, slotId, viewStack) {
    if (!compType || !view) return false;

    const key = String(compType).trim();
    let loadedModule = _globalDynamicImportsCache[key];

    if (loadedModule === undefined) {
        try {
            const absoluteViewPath = resolve(_MODULES_BASE_DIR, key, key + "_view.js");
            const viewUrlStr = pathToFileURL(absoluteViewPath).href;
            const importedView = await import(viewUrlStr);

            // ИСПРАВЛЕНО: Вытягиваем и подмешиваем процесс интентов из файла контроллера (_ctl.js)
            const absoluteCtlPath = resolve(_MODULES_BASE_DIR, key, key + "_ctl.js");
            const ctlUrlStr = pathToFileURL(absoluteCtlPath).href;
            const importedCtl = await import(ctlUrlStr);
            
            if (importedView && typeof importedView.renderContent === "function") {
                // Конструируем мономорфный vtable-объект в ОЗУ кэша
                const unifiedModulePack = {
                    renderContent: importedView.renderContent,
                    processIntent: (importedCtl && typeof importedCtl.processIntent === "function") 
                        ? importedCtl.processIntent 
                        : (() => false) // Безопасная no-op заглушка
                };
                Object.preventExtensions(unifiedModulePack);

                _globalDynamicImportsCache[key] = unifiedModulePack;
                loadedModule = unifiedModulePack;
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

    loadedModule.renderContent(matrix, view.width || 40, view.height || 5, mdl, activeIdx, slotId, viewStack);
    return true;
}