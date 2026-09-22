/**
 * @file src/modules/db-explorer/DbExplorerModel.js
 * @version 19.0.3
 * @description Модель данных инспектора СУБД. ПРИНУДИТЕЛЬНЫЙ ФИКС: Ссылка переведена на канонический BaseView-совместимый суперкласс BaseModel.
 * @revision #0529-DB-MODEL-ENFORCED
 * @lines 65
 */
import { BaseModel } from '../../core/base/BaseModel.js';
import Database from 'better-sqlite3';
import path from 'node:path';
import { existsSync } from 'node:fs';

export class DbExplorerModel extends BaseModel {
    constructor(appState) {
        super(appState);
        this.dbPath = path.join(process.cwd(), 'data', 'reflex.db');
        this.tables = ['users', 'orders', 'transactions', 'system_logs'];
        this.currentIndex = 0;
    }

    /**
     * Относительное смещение указателя навигации таблиц
     */
    move(dir) {
        if (!this.tables || this.tables.length === 0) return;
        const len = this.tables.length;
        this.currentIndex = (this.currentIndex + dir + len) % len;
        
        if (this.appState && typeof this.appState.notify === 'function') {
            this.appState.notify();
        }
    }

    /**
     * Извлечение имени текущей подсвеченной реляционной таблицы
     */
    getSelected() {
        if (this.currentIndex >= 0 && this.currentIndex < this.tables.length) {
            return this.tables[this.currentIndex];
        }
        return "users";
    }

    /**
     * Нативная выборка строк из SQLite
     */
    fetchTableData(tableName) {
        if (!existsSync(this.dbPath)) return [];

        let db = null;
        try {
            db = new Database(this.dbPath, { readonly: true });
            const rows = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all();
            return rows;
        } catch (e) {
            return [{ error: e.message }];
        } finally {
            if (db) db.close();
        }
    }
}
// Путь к файлу: src/modules/db-explorer/DbExplorerModel.js
// Время изменения: 29.05.2026 19:05:00
