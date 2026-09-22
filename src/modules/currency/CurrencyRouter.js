/**
 * @file CurrencyRouter.js
 * @description Пассивный транзитный контроллер БЭМ-виджета [Currency].
 */
export class CurrencyRouter {
    constructor(model) { this.model = model; }
    async dispatch() {} // Пассивный интерфейс шины
}
