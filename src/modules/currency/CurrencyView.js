/**
 * @file CurrencyView.js
 * @version 1.0.3
 * @description Компонент отображения курсов валют БЭМ-виджета [Currency] с принудительным дебаг-выводом состояния.
 */
import { ANSI } from '../../view/ansi-codes.js';

export class CurrencyView {
    constructor() {
        this.euroSymbol = "\u20AC";
    }

    render(model) {
        // Безопасно извлекаем стейт
        const state = model && typeof model.getState === 'function' ? model.getState() : null;
        const txRes = '\x1b[0m';
        
        // ФОЛБЭК: Если модель не передана или стейт пустой
        if (!state) {
            return { text: `${ANSI.fg.red}⚙️ CURR: NO STATE${txRes}`, visualLength: 14 };
        }

        const usdVal = state.usd || "...";
        const eurVal = state.eur || "...";
        const euro = this && this.euroSymbol ? this.euroSymbol : "\u20AC";

        const fgGreen = ANSI && ANSI.fg && ANSI.fg.green ? ANSI.fg.green : '\x1b[32m';
        const fgBlue = ANSI && ANSI.fg && ANSI.fg.lightBlue ? ANSI.fg.lightBlue : '\x1b[94m';

        // Формируем ANSI-текст
        const ansiText = `${fgGreen}💵 USD:${txRes} ${usdVal} ${fgBlue}${euro} EUR:${txRes} ${eurVal}`;
        const cleanText = ansiText.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
        
        return {
            text: ansiText,
            visualLength: cleanText.length + 1 // Коррекция на эмодзи 💵
        };
    }
}
// Путь к файлу: src/widgets/currency/CurrencyView.js
// Время модификации: 16.05.2026 21:12:05
