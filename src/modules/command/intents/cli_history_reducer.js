/**
 * @file src/modules/command/intents/cli_history_reducer.js
 * @version 1.0.0-RELEASE-SMO-CLI-HISTORY-REDUCER
 * @description Изолированная DOD-процедура перемещения по кольцевому буферу истории.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function reduceCliHistoryNavigation(m, directionStr) {
    if (!m.historyBuffer || m.historyCount === 0) return false;

    if (directionStr === "MOVE_CURSOR_UP") {
        if (m.historyCursor > 0) {
            if (m.historyCursor === m.historyCount) {
                m.stashBuffer = m.buffer; // Прячем текущую строку
            }
            m.historyCursor--;
            _syncBufferWithStr(m, m.historyBuffer[m.historyCursor]);
            return true;
        }
    } else {
        if (m.historyCursor < m.historyCount) {
            m.historyCursor++;
            if (m.historyCursor === m.historyCount) {
                _syncBufferWithStr(m, m.stashBuffer); // Возвращаем stash
            } else {
                _syncBufferWithStr(m, m.historyBuffer[m.historyCursor]);
            }
            return true;
        }
    }
    return false;
}

function _syncBufferWithStr(m, srcStr) {
    m.buffer = String(srcStr || "");
    m.cursor = m.buffer.length;
    const charCount = Math.min(m.buffer.length, 256);
    m.textLength = charCount;
    m.cursorX = m.cursor;
    for (let i = 0; i < 256; i++) {
        m.charBuffer[i] = i < charCount ? m.buffer.charAt(i) : " ";
    }
    m._isDirty = true;
}
