/**
 * @file src/modules/db-explorer/DbExplorerView.js
 * @version 10.7.1
 * @description Представление нижней правой панели базы данных (Панель 7). Переведено на наследование от BaseView, интегрирован реактивный контур вывода таблиц СУБД с поддержкой cursorIdx каретки.
 * @revision #0529-DB-VIEW-STABLE
 * @lines 65
 */
import { BaseView } from '../../core/base/BaseView.js';

export class DbExplorerView extends BaseView {
    constructor(id, yogaModule, model) {
        // Транслируем зависимости в абстрактный суперкласс BaseView для верификации ядра
        super(id || 'DB_EXPLORER', yogaModule, model);
        this.title = "DATABASE SCHEMAS";
    }

    /**
     * Отрисовка списка реляционных таблиц СУБД SQLite
     */
    drawComponent(appState, basePanel) {
        const layout = this.yogaNode.getComputedLayout();
        const h = Math.floor(layout.height || 0);
        const innerHeight = Math.max(1, h - 2);
        
        const globalModel = globalThis.__AppStateInstance || appState;
        const processed = [];

        // РЕАКТИВНЫЙ КОНТУР: Читаем живой реестр таблиц из подключенной модели
        if (this.model && Array.isArray(this.model.tables)) {
            this.model.tables.forEach((tableName, idx) => {
                // Если таблица сейчас подсвечена курсором, добавляем индикатор выбора
                const isSelected = (this.model.currentIndex === idx);
                const prefix = isSelected ? "  ➔ 📊 " : "     📊 ";
                processed.push(`${prefix}${tableName}`);
            });
        }

        // Если база данных пуста или отсутствует на диске
        if (processed.length === 0) {
            processed.push(" Реестр СУБД пуст");
            processed.push(" [В базе data/reflex.db нет таблиц]");
        }

        // Забиваем пустое пространство пробелами до краев рамки
        while (processed.length < innerHeight) {
            processed.push(" ");
        }

        const isFocused = (globalModel?.activePanel === 'db_explorer');

        return {
            lines: processed.slice(0, innerHeight),
            // Каноническое Blackjack-свойство фокусного курсора: если панель активна, рендерер подсветит строку оранжевым
            cursorIdx: isFocused && this.model ? this.model.currentIndex : -1,
            title: this.title
        };
    }
}
// Путь к файлу: src/modules/db-explorer/DbExplorerView.js
// Время изменения: 29.05.2026 19:15:00