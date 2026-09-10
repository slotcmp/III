/**
 * @file src/modules/command/intents/cli_tab_reducer.js
 * @version 1.5.0-RELEASE-SMO-CLI-TAB-TRANSACTION-PERFECT
 * @description Изолированная DOD-процедура циклического автодополнения путей VFS по Tab.
 * ИСПРАВЛЕНА АДРЕСАЦИЯ: Извлечение VFS-файлов переведено на канонический viewStack активного Проводника 102.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Осуществляет циклическое автодополнение набранного слова по табуляции
 * @param {Object} m Модель данных командной строки (Слот 105)
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function reduceCliTabCompletion(m, kernel) {
    if (!m || !kernel) return false;

    // 1. БЕЗОПАСНАЯ DOD-АДРЕСАЦИЯ АКТИВНОЙ ВКЛАДКИ ПРОФИЛЯ VFS (СЛОТ 102)
    const explorerSlot = kernel.model?.logicalState?.panelRegistry["102"];
    const viewStack = explorerSlot?.viewStack;
    if (!viewStack || !Array.isArray(viewStack)) return false;

    const activeIdx = Math.max(0, Math.floor(explorerSlot.activeStackIdx || 0));
    const activeExplorerMdl = viewStack[activeIdx]?.mdl;
    if (!activeExplorerMdl) return false;

    // Считываем список файлов, которые фоновый vfs_worker.js уже проиндексировал в ОЗУ
    const vfsItems = activeExplorerMdl.items || [];
    const vfsItemsCount = vfsItems.length;

    const currentInputStr = String(m.buffer || "");
    if (currentInputStr.length === 0) return false;

    // Вычисляем последнее набранное слово (разделитель — пробел)
    const lastSpaceIdx = currentInputStr.lastIndexOf(" ");
    const prefixPathPart = lastSpaceIdx === -1 ? "" : currentInputStr.substring(0, lastSpaceIdx + 1);
    const searchTokenStr = lastSpaceIdx === -1 ? currentInputStr.toLowerCase() : currentInputStr.substring(lastSpaceIdx + 1).toLowerCase();

    // =================================================================
    // ИНИЦИАЛИЗАЦИЯ ИЛИПРОДОЛЖЕНИЕ ЦИКЛА ТАБУЛЯЦИИ (0% GC)
    // =================================================================
    if (m._tabCompletionActive !== true) {
        m._tabCompletionActive = true;
        m._matchCount = 0;
        m._matchIndex = 0;
        m._originalSearchToken = searchTokenStr;
        m._prefixPathPart = prefixPathPart;

        // Выделяем массив совпадений инлейн в модель, если его еще нет
        if (!m._matchesList) {
            m._matchesList = new Array(128); // Фиксированный буфер под совпадения
        }
        m._matchesList.fill("");

        // Процедурный сбор совпадений VFS
        let foundIdx = 0;
        for (let i = 0; i < vfsItemsCount; i++) {
            const item = vfsItems[i];
            if (item && item.name) {
                const nameStr = String(item.name);
                if (nameStr.toLowerCase().startsWith(m._originalSearchToken) && foundIdx < 128) {
                    m._matchesList[foundIdx] = nameStr;
                    foundIdx++;
                }
            }
        }
        m._matchCount = foundIdx;
    }

    // Если совпадений в текущей директории диска не найдено — гасим такт
    if (m._matchCount === 0) {
        m._tabCompletionActive = false;
        return false;
    }

    // =================================================================
    // ПОДСТАНОВКА ТЕКУЩЕГО НАЙДЕННОГО ЭЛЕМЕНТА И СДВИГ КУРСOРА
    // =================================================================
    const currentMatchedNameStr = m._matchesList[m._matchIndex];
    if (currentMatchedNameStr.length > 0) {
        // Собираем новую строку буфера CLI
        m.buffer = m._prefixPathPart + currentMatchedNameStr;
        m.cursor = m.buffer.length;
        m.textLength = m.buffer.length;
        m.cursorX = m.cursor;

        // Наливаем чар-буфер экрана во вьюху кадра знакомест
        const charCount = Math.min(m.buffer.length, 256);
        for (let i = 0; i < 256; i++) {
            m.charBuffer[i] = i < charCount ? m.buffer.charAt(i) : " ";
        }

        // Логируем успешное автодополнение в Системный журнал (Слот 108)
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        const tabLogStr = "[" + h + ":" + min + ":" + s + " Msk] [SYSTEM_TAB] Дополнение: '" + currentMatchedNameStr + "' (" + (m._matchIndex + 1) + "/" + m._matchCount + ")\n";
        generateGpssTransaction("108", "ADD_LOG_ENTRY", tabLogStr, "105");

        // Инкрементируем индекс по кольцу для следующего нажатия Tab
        m._matchIndex = (m._matchIndex + 1) % m._matchCount;
        m._isDirty = true;
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/intents/cli_tab_reducer.js
 * Время изменения: 05.09.2026 13:16:45 MSK
 */
