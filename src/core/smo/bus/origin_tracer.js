/**
 * @file src/core/smo/bus/origin_tracer.js
 * @version 1.0.0-RELEASE-SMO-BUS-ORIGIN-TRACER-STRICT
 * @description Безаллокационный менеджер кольцевого буфера истории прерываний.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

/**
 * Инициализирует плоские фиксированные регистры истории внутри структуры транзакта
 * @param {Object} tx Ссылка на аллоцируемый транзакт СМО
 */
export function initializeTransactionOrigins(tx) {
    if (!tx) return;
    tx.originsHistory = ["0", "0", "0", "0", "0", "0", "0", "0"];
    tx.originsCursor = 0;
}

/**
 * Атомарно выжигает новый источник прерывания в кольцевой буфер транзакта
 * @param {Object} tx Ссылка на транзакт СМО
 * @param {string|number} sourceSlotIdStr ID прибора, породившего или перенаправившего импульс
 */
export function pushOriginTrace(tx, sourceSlotIdStr) {
    if (!tx || !Array.isArray(tx.originsHistory)) return;

    // Высокоскоростной сдвиг каретки по бинарной маске & 7 (заменяет деление по модулю 8)
    const nextIdx = (tx.originsCursor + 1) & 7;
    
    tx.originsHistory[nextIdx] = String(sourceSlotIdStr || "0");
    tx.originsCursor = nextIdx;
}
