/**
 * @file src/modules/db-explorer/DbExplorerRouter.js
 * @version 19.0.3
 * @description Локальный TUI-маршрутизатор подсистемы Database Explorer. Переведен на наследование от BaseRouter под Router-MVC стандарт ядра, вычищен дублирующий дребезг ui:render эмитов.
 * @revision #0529-DB-ROUTER-STABLE
 * @lines 55
 */
import { BaseRouter } from '../../core/base/BaseRouter.js';
import { globalBus } from '../../core/EventBus.js';

export class DbExplorerRouter extends BaseRouter {
    /**
     * @param {DbExplorerModel} model - Ссылка на Blackjack-модель инспектора таблиц
     * @param {AppStateModel} appState - Центральный фасад состояния ядра
     */
    constructor(model, appState) {
        // Транслируем зависимости в абстрактный суперкласс BaseRouter ядра
        super(model, appState);
        this.hub = globalBus;
    }

    /**
     * Единая точка распределения сигналов ввода для проводника баз данных
     */
    async dispatch(action, payload) {
        const targetState = this.appState || globalThis.__AppStateInstance;
        if (!this.model || !targetState) return false;

        switch (action) {
            case "LIST_UP":   
                if (typeof this.model.move === 'function') {
                    // Метод модели move() сам каскадно и безопасно вызовет notify()
                    this.model.move(-1); 
                }
                return true;

            case "LIST_DOWN": 
                if (typeof this.model.move === 'function') {
                    this.model.move(1);  
                }
                return true;

            case "SELECT_ITEM":
            case "ENTER":
                if (typeof this.model.getSelected !== 'function') return true;
                
                const selectedTable = this.model.getSelected();
                if (!selectedTable || selectedTable.startsWith("[")) return true;

                if (typeof targetState.pushLog === 'function') {
                    targetState.pushLog(`DB: Выборка строк из реляционной таблицы [${selectedTable}]...`);
                }
                
                if (typeof this.model.fetchTableData !== 'function') return true;
                const rows = this.model.fetchTableData(selectedTable);

                if (rows.length === 0) {
                    if (typeof targetState.pushLog === 'function') {
                        targetState.pushLog(`System: Таблица [${selectedTable}] пуста или база данных отсутствует.`);
                    }
                } else {
                    rows.forEach((row, i) => {
                        const jsonStr = JSON.stringify(row);
                        if (typeof targetState.pushLog === 'function') {
                            // Пушим каждую строку СУБД в глобальный реактивный контур отображения логов
                            targetState.pushLog(`IO: [${selectedTable}][Строка ${i+1}] -> ${jsonStr}`);
                        }
                    });
                }
                
                if (typeof targetState.notify === 'function') {
                    targetState.notify();
                }
                return true;
        }
        return false;
    }
}
// Путь к файлу: src/modules/db-explorer/DbExplorerRouter.js
// Время изменения: 29.05.2026 19:14:00