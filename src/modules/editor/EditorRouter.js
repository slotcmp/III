export class EditorRouter {
    constructor(model, hub) {
        this.model = model;
        this.hub = hub; // Ссылка на центральный медиатор Model
    }

    async dispatch(signal, payload, cmdManager) {
        switch (signal) {
            // Навигация каретки по тексту (Строки / Горизонталь / Пейджинг)
            case "LIST_UP":      this.model.move(-1); break;
            case "LIST_DOWN":    this.model.move(1);  break;
            case "CURSOR_LEFT":  this.model.move(-1, true); break;
            case "CURSOR_RIGHT": this.model.move(1, true);  break;
            case "PAGE_UP":      this.model.move(-10); break;
            case "PAGE_DOWN":    this.model.move(10); break;
            
            // Манипуляция текстовым буфером открытой вкладки
            case "TYPE_CHAR":    this.model.typeChar(payload); break;
            case "BACKSPACE":    this.model.backspace(); break;
            case "SELECT_ITEM":  this.model.handleNewLine(); break;
            
            // Сворачивание логических блоков кода { ... }
            case "FOLD_BLOCK":   
                this._log("SIG: FOLD_BLOCK arrived at EditorRouter");
                this.model.toggleFold(); 
                break; 
            
            // Дисковые операции с файловой системой
            case "SAVE_FILE":    await this.model.saveToFile(); break;
            case "REFRESH":      if (typeof this.model.reloadFromFile === 'function') {
                                     await this.model.reloadFromFile();
                                 } break;
                                 
            // Мультибуферность (Циклический обход открытых вкладок файлов)
            case "NEXT_TAB":     this.model.nextTab(); break; 
        }
    }

    /**
     * Безопасная трассировка логов через фасад ядра
     */
    _log(msg) {
        if (this.hub && typeof this.hub.pushLog === 'function') {
            this.hub.pushLog(msg);
        } else if (this.model && typeof this.model.pushLog === 'function') {
            this.model.pushLog(msg);
        } else {
            console.log(msg);
        }
    }
}
