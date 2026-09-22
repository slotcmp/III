/**
 * @file src/modules/command/command_steps/commandHistory.js
 * @version 1.0.0-RELEASE-SMO-CLI-STEP-HISTORY
 * @description Ленивая ОЗУ-линковка персистентного буфера истории CLI.
 */
export function commandHistory(m, kernel) {
    if (!m.historyBuffer && kernel?.model?.logicalState?.appSettings) {
        const settings = kernel.model.logicalState.appSettings;
        m.historyBuffer = settings.cli_history;
        m.historyCount = Math.floor(settings.cli_history_count || 0);
        m.historyCursor = m.historyCount;
    }
}
