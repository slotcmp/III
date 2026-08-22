/**
 * @file src/modules/dashboard/dashboard_ctl.js
 * @version 3.3.1-RELEASE-SMO-DASHBOARD-CTL-STERILE
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 101 (Dashboard).
 * ИСПРАВЛЕНА АДРЕСАЦИЯ: Имена полей синхронизированы со статической DOD-фабрикой slot_maker.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch.
 */

/**
 * Старая фабрика сборки контроллера сохранена для совместимости автоскана V8, 
 * но рантайм GEN III использует ленивый монтаж через IoC-монтажник slot_maker.js.
 */
export function createDashboardController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "101");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Чистая процедура редукции прерываний Слота 101
 */
export function processSpecificDashboardLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const m = pack.mdl; 
    const v = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        case "UPDATE_METRICS":
            if (contextPayload) {
                // ИСПРАВЛЕНИЕ: Запись ведется строго в запечатанные регистры ОЗУ из slot_maker.js
                m._cpuPercent = Math.max(0, Math.min(100, Math.floor(Number(contextPayload.cpu) || 0)));
                
                // Рассчитываем потребление памяти относительно зафиксированного лимита
                const usedMb = Math.max(0, Math.floor(Number(contextPayload.ramMb) || 1024));
                m._ramUsedMb = usedMb;
                
                const totalMb = Math.max(1, Math.floor(m._ramTotalMb || 16384));
                m._ramPercent = Math.max(0, Math.min(100, Math.floor((usedMb * 100) / totalMb)));
                
                m.totalTransactions = Math.max(0, Math.floor(Number(contextPayload.txCount || 0)));
                
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "TOGGLE_SUBVIEW":
            // Легитимная DOD-мутация локального флага отрисовки вьюхи
            if (v._subViewTypeStr !== undefined) {
                v._subViewTypeStr = (v._subViewTypeStr === "monitor") ? "ruler" : "monitor";
                isMutated = true;
            }
            break;
            
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }
    return isMutated;
}
