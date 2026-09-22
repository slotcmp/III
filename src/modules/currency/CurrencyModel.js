/**
 * @file CurrencyModel.js
 * @version 1.2.0
 * @description Изолированный сервис данных [Currency]. Конфигурация внутри виджета с автообновлением «на лету».
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export class CurrencyModel {
    constructor(hub) {
        this.hub = hub;
        this.data = { usd: "...", eur: "..." };
        this.fetchIntervalId = null;
        
        // Вычисляем абсолютный путь к локальному файлу настроек currency.json
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.configPath = path.resolve(__dirname, 'currency.json');

        // Загружаем конфигурацию и запускаем получение данных
        this.config = this._loadConfig();
        this._startCurrencyFetcher();
        this._initConfigWatcher();
    }

    getState() { 
        return this.data; 
    }

    // Чтение локального JSON-файла
    _loadConfig() {
        try {
            const fileData = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(fileData);
        } catch (e) {
            // Фолбэк-конфигурация при сбое чтения
            return {
                active_provider: "frankfurter",
                providers: {
                    frankfurter: { url: "https://frankfurter.dev" }
                }
            };
        }
    }

    // Слежение за изменением файла конфигурации для динамического переключения провайдера
    _initConfigWatcher() {
        try {
            fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    // Небольшая задержка, чтобы операционная система успела полностью записать файл
                    setTimeout(() => {
                        this.config = this._loadConfig();
                        this._startCurrencyFetcher();
                    }, 100);
                }
            });
        } catch (e) {
            // Игнорируем ошибки вотчера, если ОС не поддерживает fs.watch
        }
    }

    _startCurrencyFetcher() {
        // Если сервис уже работал, очищаем старый таймер перед перезапуском
        if (this.fetchIntervalId) {
            clearInterval(this.fetchIntervalId);
        }

        const providerKey = this.config.active_provider || 'frankfurter';
        const providerUrl = this.config.providers[providerKey]?.url;

        if (!providerUrl) return;

        const fetchRates = () => {
            https.get(providerUrl, (res) => {
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(rawData);
                        this._parseByProvider(providerKey, json);
                    } catch (e) {
                        // Ошибка парсинга API
                    }
                });
            }).on('error', () => {
                // Ошибка сети
            });
        };

        fetchRates();
        // Каждые 10 минут запрашиваем свежие котировки
        this.fetchIntervalId = setInterval(fetchRates, 600000);
    }

    _parseByProvider(provider, json) {
        let hasChanges = false;

        if (provider === 'frankfurter' && json && json.rates) {
            this.data.usd = (1 / json.rates.USD).toFixed(2);
            this.data.eur = (1 / json.rates.EUR).toFixed(2);
            hasChanges = true;
        } 
        else if (provider === 'floatrates' && json && json.rub && json.eur) {
            const rubPerUsd = json.rub.rate;
            const rubPerEur = rubPerUsd / json.eur.rate;
            this.data.usd = rubPerUsd.toFixed(2);
            this.data.eur = rubPerEur.toFixed(2);
            hasChanges = true;
        } 
        else if (provider === 'cbr' && json && json.Valute) {
            this.data.usd = (json.Valute.USD?.Value || 0).toFixed(2);
            this.data.eur = (json.Valute.EUR?.Value || 0).toFixed(2);
            hasChanges = true;
        }

        // Вызываем событие обновления экрана воркспейса
        if (hasChanges && this.hub && typeof this.hub.notify === 'function') {
            this.hub.notify();
        }
    }
}
