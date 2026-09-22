/**
 * @file src/core/smo/debug/tab_diagnostic_sniffer.js
 * @version 1.0.0-RELEASE-SMO-DIAGNOSTIC-TAB-SNIFFER
 * @description Прецизионный DOD-тест и глубокий ОЗУ-сниффер контура зажигания ушек.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */
import { _gpssEngineState, generateGpssTransaction } from "../bus.js";

/**
 * Снимает полный диагностический дамп регистров памяти Window Manager для Слота 102
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function executeTabLightingSniffer(kernel) {
    if (!kernel) return false;

    const facility102 = _gpssEngineState.facilitiesRegistry.get("102");
    const facility12 = _gpssEngineState.facilitiesRegistry.get("12");

    if (!facility102 || !facility12 || !facility12.mdl) {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[DIAG_FAIL] Сбой сниффера: Не найден Слот 102 или Канал 12 в ОЗУ.\n", "0");
        return false;
    }

    const m12 = facility12.mdl;
    const activeIdx = Math.floor(facility102.activeStackIdx || 0);
    const viewStack = facility102.viewStack || [];

    generateGpssTransaction("108", "ADD_LOG_ENTRY", "=== СТАРТ ДИAГНOСТИКИ СИНХРOНИЗAЦИИ ВКЛAДOК ===\n", "0");
    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[DIAG_WM] Активный индекс таба в Слоте 102 рантайма: " + activeIdx + "\n", "0");

    // 1. ФAЗA ГЕOМЕТРИИ (Сканируем X-границы плашек в ОЗУ моделей табов)
    if (Array.isArray(viewStack)) {
        for (let i = 0; i < viewStack.length; i++) {
            const triad = viewStack[i];
            const tMdl = triad?.mdl;
            if (tMdl) {
                const title = String(tMdl._localTabTitle || triad.tabTitle || "TAB");
                const sX = tMdl._tabStartX;
                const eX = tMdl._tabEndX;
                const subZone = tMdl._activeSubZone;
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[DIAG_GEO] Таб #" + i + " '" + title + "' -> ОЗУ лимиты: [" + sX + ".." + eX + ") | _activeSubZone: " + subZone + "\n", "0");
            }
        }
    }

    // 2. ФAЗA РЕЕСТРA ПОДСВЕТКИ (Проверяем ключи масок Канала 12)
    if (m12.activeTabRegistry) {
        const reg = m12.activeTabRegistry;
        const stringKey102 = reg["102"];
        const stringKey200 = reg["200"];
        const numberKey102 = reg[102];
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[DIAG_REG] activeTabRegistry -> '200': " + stringKey200 + " | '102': " + stringKey102 + " | 102(num): " + numberKey102 + "\n", "0");
    }

    // 3. ФAЗA ТЕКСТOВOГO ВЕКТOРA (Проверяем 6-параметрический страйд)
    if (m12.tabsVectorArray && m12.totalRegisteredTabsCount > 0) {
        const total = m12.totalRegisteredTabsCount;
        for (let i = 0; i < total; i++) {
            const offset = (i * 6) | 0;
            const keeper = m12.tabsVectorArray[offset];
            const owner = m12.tabsVectorArray[offset + 4];
            const currentTabVal = m12.tabsVectorArray[offset + 5];
            if (owner === 102) {
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[DIAG_VEC] Вектор страйда #" + i + " -> Keeper: " + keeper + " | Owner: " + owner + " | Активный таб: " + currentTabVal + "\n", "0");
            }
        }
    }

    generateGpssTransaction("108", "ADD_LOG_ENTRY", "=== КOНЕЦ СНИФФЕР-ПAСПOРТA ===\n", "0");
    return true;
}
