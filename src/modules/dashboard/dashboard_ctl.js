/**
 * @file src/modules/dashboard/dashboard_ctl.js
 * @version 3.9.0-RELEASE-SMO-DASHBOARD-CTL-PENNER-LERP-STABLE
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 101 (Dashboard).
 * ИСПРАВЛЕН ТВИННИНГ И RAM: Внедрен плавный накат LERP каретки ▲ по оси X и джиттер оперативной памяти.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
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
    if (!pack) return false;
    
    const activeIdx = Math.max(0, Math.floor(facilityState.activeStackIdx || 0));
    const currentTabNode = pack[activeIdx];
    if (!currentTabNode || !currentTabNode.mdl) return false;
    
    const m = currentTabNode.mdl; 
    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        case "SWITCH_SLOT_TAB":
            if (contextPayload && contextPayload.targetStackIdx !== undefined) {
                facilityState.activeStackIdx = Math.max(0, Math.floor(contextPayload.targetStackIdx));
                m._isDirty = true;
                isMutated = true;
            }
            break;
        case "UPDATE_METRICS":
            if (contextPayload) {
                for (let t = 0; t < pack.length; t++) {
                    const tMdl = pack[t].mdl;
                    if (!tMdl) continue;
                    tMdl._cpuPercent = Math.max(0, Math.min(100, Math.floor(Number(contextPayload.cpu) || 0)));
                    const usedMb = Math.max(0, Math.floor(Number(contextPayload.ramMb) || 1024));
                    tMdl._ramUsedMb = usedMb;
                    const totalMb = Math.max(1, Math.floor(tMdl._ramTotalMb || 16384));
                    tMdl._ramPercent = Math.max(0, Math.min(100, Math.floor((usedMb * 100) / totalMb)));
                    tMdl.totalTransactions = Math.max(0, Math.floor(Number(contextPayload.txCount || 0)));
                    tMdl._isDirty = true;
                }
                isMutated = true;
            }
            break;

        // =================================================================
        // ОБРАБОТКА КЛИКА МЫШИ: ЗАХВАТ ЦЕЛЕВОЙ АБСЦИССЫ ДЛЯ ТВИННИНГА
        // =================================================================
        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localX !== undefined && contextPayload.localY !== undefined) {
                const clickX = Math.floor(contextPayload.localX);
                const clickY = Math.floor(contextPayload.localY);

                // Если кликнули во внутреннее поле Дашборда (контент с Y >= 3)
                if (clickY >= 3) {
                    m._activeSubZone = 1; 

                    // Фиксируем цель догона для каретки ▲ (ограничиваем физической шириной линейки)
                    const limitW = Math.max(40, Math.floor(facilityState.viewStack[activeIdx]?.view?.width || 120));
                    m._targetTriangleX = Math.max(3, Math.min(clickX, limitW - 4));
                    m._isDirty = true;
                    isMutated = true;
                }
            }
            break;

        // =================================================================
        // ТАКТ СМО-ТАЙМЕРА: СИНХРОННЫЙ ТВИННИНГ И ДЖИТТЕР CPU + RAM
        // =================================================================
        case "ANIMATION_TICK":
            m._clockPrescaler++;

            // 1. ЛИНЕЙНАЯ ИНТЕРПОЛЯЦИЯ ДОГОНА ▲ (ВЫПОЛНЯЕТСЯ КАЖДЫЙ ТАКТ 100мс ДЛЯ ПЛАВНОСТИ)
            const deltaX = m._targetTriangleX - m._currentTriangleX;
            if (Math.abs(deltaX) > 0.05) {
                // Классическая Пеннер-формула плавного затухания скорости догона (коэффициент 0.3)
                m._currentTriangleX += deltaX * 0.3;
                m._isDirty = true;
                isMutated = true;
            } else {
                // Жестко защелкиваем координату в финальной точке при минимальном зазоре
                m._currentTriangleX = m._targetTriangleX;
            }

            // 2. ДЕЛИ ТАКТОВ ДЛЯ ДЫХАНИЯ ШКАЛ (Срабатывает раз в 300 мс)
            if (m._clockPrescaler >= 3) {
                m._clockPrescaler = 0;

                for (let t = 0; t < pack.length; t++) {
                    const tMdl = pack[t].mdl;
                    if (!tMdl) continue;

                    // Живой джиттер для CPU (±2%)
                    const cpuJitter = Math.floor(Math.random() * 5) - 2;
                    let nextCpu = tMdl._cpuPercent + cpuJitter;
                    if (nextCpu < 5) nextCpu = 7;
                    if (nextCpu > 95) nextCpu = 93;
                    tMdl._cpuPercent = nextCpu;

                    // ИСПРАВЛЕНИЕ: ЖИВОЙ ДЖИТТЕР ДЛЯ RAM (±1% для сохранения консистентности)
                    const ramJitter = Math.floor(Math.random() * 3) - 1;
                    let nextRam = tMdl._ramPercent + ramJitter;
                    if (nextRam < 5) nextRam = 8;
                    if (nextRam > 95) nextRam = 92;
                    tMdl._ramPercent = nextRam;

                    tMdl._isDirty = true;
                }
                isMutated = true;
            }
            break;

        case "ROTATE_SLOT_STACK":
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated && facilityState.host?.virtualCanvasState) {
        facilityState.host.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/dashboard_ctl.js
 * Время исправления: 03.09.2026 14:11:45 MSK
 * Ревизия: #0824-DASHBOARD-CTL-PENNER-LERP-STABLE
 */
