/**
 * @file src/core/smo/gpss_blocks.js
 * @version 3.0.0-RELEASE-GPSS-DSL-SPEC
 * @description Набор чистых DOD-инструкций в строгих терминах синтаксиса имитационного языка GPSS.
 * Обеспечивает безмусорное управление регистрами занятости, очередей и продвижения приборов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Блок SEIZE: Попытка захвата прибора транзактом. Меняет статус занятости.
 * @param {Object} facility Структура СМО-прибора
 * @param {Object} tx Ссылка на текущий тактовый транзакт
 * @returns {boolean} Успешность захвата канала
 */
export function SEIZE(facility, tx) {
    if (!facility || facility.isProcessing) return false;
    facility.isProcessing = true;
    facility.currentOwnerTxId = tx ? tx.id : 0;
    return true;
}

/**
 * Блок ADVANCE: Имитирует задержку/продвижение транзакта на обслуживание.
 * Вызывает прикладной функциональный фильтр редукции данных.
 * @param {Object} facility Структура СМО-прибора
 * @param {Function} workerFn Специфический прикладной редуктор домена (_ctl.js)
 * @param {Object} tx Текущий обрабатываемый транзакт
 * @returns {boolean} Результат мутации стейта прибора
 */
export function ADVANCE(facility, workerFn, tx) {
    if (!facility || typeof workerFn !== "function" || !tx) return false;
    // Передаем паспорт транзакта напрямую в прикладной PAC-контур
    return workerFn(facility, tx.P2, tx.P3, tx);
}

/**
 * Блок RELEASE: Освобождение прибора. Снимает флаг блокировки канала.
 * @param {Object} facility Структура СМО-прибора
 */
export function RELEASE(facility) {
    if (!facility) return;
    facility.isProcessing = false;
    facility.currentOwnerTxId = 0;
}

/**
 * Блок QUEUE: Регистрирует вход транзакта в локальную FIFO-очередь прибора.
 * @param {Object} facility Структура СМО-прибора
 * @param {Object} tx Транзакт прерывания
 */
export function QUEUE(facility, tx) {
    if (!facility || !tx) return;
    facility.localQueue.push(tx);
}

/**
 * Блок DEPART: Фиксирует продвижение каретки головы чтения очереди вперед.
 * @param {Object} facility Структура СМО-прибора
 */
export function DEPART(facility) {
    if (!facility) return;
    facility._head++;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/gpss_blocks.js
 * Время модификации: 18.08.2026 22:04:15 MSK
 */
