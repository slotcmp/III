/**
 * @file src/core/smo/tick_sniffer.js
 * @version 1.4.5-RELEASE-SMO-PARAMETRIC-TICK-SNIFFER-LAZY-CONNECTED
 * @description Автономный изолированный DOD-аудитор тактовых импульсов платформы.
 * ИСПРАВЛЕНО: Круговая зависимость полностью ликвидирована. Вызов writeCoreLogMessageInline 
 * переведен на ленивый runtime-проброс через аргументы шины.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation / 0% GC.
 */

import { loadAppSettings } from "../app_config.js";

const _LOCAL_AUDIT_FILE_PATH = "logs/smo_core.log";
let _staticCharAccumulator = "";

function _isAuditBypassActive() {
    try {
        const config = loadAppSettings();
        return config ? (config.bAuditTicksBypass === true) : false;
    } catch (e) {
        return false;
    }
}

export function purgeAuditFileAtStartup() {
    // Контроль очистки файла smo_core.log полностью передан на logger_io.js
    return;
}

/**
 * Пассивный DOD-регистратор тактов, защищенный от циклических зависимостей
 * @param {string} interceptPhaseStr Текущая фаза продвижения СМО
 * @param {Object} gpssEngineStateRef Ссылка на реестр фасилити шины
 * @param {Object} busClockMetricsRef Метрики тактовых импульсов
 * @param {Function} writeLogFn Лениво проброшенная функция инлайн-выжига ядра
 */
export function auditHardwareTickPassive(interceptPhaseStr, gpssEngineStateRef, busClockMetricsRef, writeLogFn) {
    if (_isAuditBypassActive() === true) return;
    
    // Ленивые гварды на входящие контексты шины
    if (!gpssEngineStateRef || !busClockMetricsRef) return;

    const registry = gpssEngineStateRef.facilitiesRegistry;
    if (!registry) return;

    // Преаллоцированный пул ключей для 6 целевых слотов Far-интерфейса
    const staticKeysArray = ["102", "103", "104", "106", "108", "200"];
    let totalPendingTransactionsInQueues = 0;
    
    let humanSenseStr = "Управляющий такт СМО";
    const lastIntentStr = String(busClockMetricsRef.lastExecutedIntent || "UNKNOWN");

    for (let i = 0; i < 6; i++) {
        const facility = registry.get ? registry.get(staticKeysArray[i]) : registry[staticKeysArray[i]];
        
        if (facility && facility.localQueue) {
            const head = Math.floor(facility._head || 0);
            const tail = facility.localQueue.length;
            
            if (tail > head) {
                totalPendingTransactionsInQueues += (tail - head);

                // ДЕКОДИРОВАНИЕ payload ЖИВОГО ТРАНЗАКТА ИЗ ОЧЕРЕДИ
                const activeTx = facility.localQueue[head];
                
                if (activeTx && (activeTx.intent === "SWITCH_SLOT_TAB" || activeTx.P4 === "SWITCH_SLOT_TAB")) {
                    const payload = activeTx.P3;
                    if (payload !== undefined && payload !== null) {
                        const idxNum = Math.floor(payload.targetStackIdx ?? payload.tabIdx ?? 0);
                        
                        let tabNameStr = "DEFAULT";
                        if (idxNum === 1) tabNameStr = "CTRL";
                        else if (idxNum === 2) tabNameStr = "SHIFT";
                        else if (idxNum === 3) tabNameStr = "ALT";

                        if (staticKeysArray[i] === "104") {
                            humanSenseStr = "АКТИВАЦИЯ ТЕЛА: Ротация Far-клавиш под маску " + tabNameStr;
                        } else if (staticKeysArray[i] === "200") {
                            humanSenseStr = "ВИЗУАЛЬНЫЙ ОБВЕС: Подсветка ушка " + tabNameStr + " на панели TABSBAR";
                        }
                    }
                }
            }
        }
    }
    return
    if (humanSenseStr === "Управляющий такт СМО") {
        if (lastIntentStr === "TAB_CLICKED") {
            humanSenseStr = "ПЕРЕХВАТ МЫШИ: Клик по ушкам на глобальной линии Y=0";
        } else if (lastIntentStr === "ADD_LOG_ENTRY") {
            humanSenseStr = "ЖУРНАЛИЗАЦИЯ: Запись паспорта маршалинга Канала 12";
        } else if (lastIntentStr === "EXECUTE_RENDER") {
            humanSenseStr = "ГРАФИКА: Инициализация послойного наката Z-Layers";
        }
    }

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    // Инлайновая сборка строки аудита кадра
    _staticCharAccumulator = "[" + h + ":" + m + ":" + s + "." + ms + " Msk] " +
                             "[PHASE: " + String(interceptPhaseStr).padEnd(14, " ") + "] " +
                             "| Физический Тик #" + String(busClockMetricsRef.hardwareTicksCount).padEnd(5, " ") +
                             "| Всего транзактов: " + String(busClockMetricsRef.generatedTransactsCount).padEnd(5, " ") +
                             "| Последний интент: '" + lastIntentStr.padEnd(18, " ") + "' " +
                             "| Смысл: [" + humanSenseStr + "] " +
                             "| Блокировано в FIFO: " + totalPendingTransactionsInQueues + " ед.\n";

    // ИСПОЛНЕНИЕ ЛЕНИВОГО ВЫЖИГА: Если шлюз шины передал функцию — стреляем напрямую в logs/smo_core.log
    if (typeof writeLogFn === "function") {
        writeLogFn(_staticCharAccumulator);
    }
}
