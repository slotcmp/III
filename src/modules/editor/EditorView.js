import { Component } from '../../view/components/Component.js';
import { ANSI } from '../../view/ansi-codes.js';
import { GutterComponent } from '../../view/components/GutterComponent.js';
import { ScrollbarComponent } from '../../view/components/ScrollbarComponent.js';
import { LineComponent } from '../../view/components/LineComponent.js';

export class EditorView extends Component {
    constructor(id, yogaModule, model) {
        super(id, yogaModule, 'tui-editor');
        this.model = model;
        this.c = {}; 
    }

    /**
     * Унифицированный полиморфный метод рендеринга редактора в матрицу ячеек
     */
    render(grid, rect) {
        if (!this.model) return;

        const { code, cursor, mods } = this.model.getState();
        const isFocused = this.hasModifier('focused');

        // Вычисляем полезные внутренние границы вьюпорта
        const maxRows = rect.h - 2;
        const maxCols = rect.w - 2;

        // Эмуляция вьюпорта: нарезаем строки от текущего смещения курсора
        // Если GridEngine не подключен к ХАБу, выполняем безопасный фоллбек-срез
        const startLineNum = Math.max(0, cursor.line - Math.floor(maxRows / 2));
        const visibleLines = code.slice(startLineNum, startLineNum + maxRows);

        for (let i = 0; i < maxRows; i++) {
            const currentY = rect.y + 1 + i;
            if (currentY >= grid.length - 1) break;

            const lineData = visibleLines[i];
            const currentLineNum = startLineNum + i;
            const isCurrentRow = (currentLineNum === cursor.line && isFocused);

            // Рендеринг атомарных БЭМ-компонентов строки редактора
            const gutter = GutterComponent.render(currentLineNum, isCurrentRow, this.c);
            const scrollbar = ScrollbarComponent.render(i, maxRows, code.length, startLineNum, this.c)
                .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

            let rawLine = lineData !== undefined ? lineData : "";
            
            // Сборка контента: [Гаттер][Текст файла][Скроллбар]
            const rawRowLayout = `${gutter}${rawLine}${scrollbar}`;

            const finalizedRow = LineComponent.render(rawRowLayout, {
                width: rect.w - 2,
                isSelected: isCurrentRow,
                isFocused: isFocused,
                colors: this.c
            });

            let visualX = 0;
            const tokenRegex = /(?:)/g; // ОБЕЗВРЕЖЕНО ОТ OOM КРАША V8
            // Очищено

            for (const token of tokens) {
                const currentX = rect.x + 1 + visualX;
                if (currentX >= rect.x + rect.w - 1 || currentX >= grid[currentY].length - 1) break;

                if (token.startsWith('\x1b')) {
                    grid[currentY][currentX].color = token;
                } else {
                    grid[currentY][currentX].char = token;
                    grid[currentY][currentX].widgetRef = this;
                    visualX++;
                }
            }
        }
    }
}
