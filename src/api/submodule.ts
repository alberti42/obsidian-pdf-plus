import { App } from 'obsidian';

import PDFPlus from 'main';
import { PDFPlusAPI } from 'api';


export class PDFPlusAPISubmodule {
    app: App;
    plugin: PDFPlus;

    constructor(plugin: PDFPlus) {
        this.app = plugin.app;
        this.plugin = plugin;
    }

    get api(): PDFPlusAPI {
        return this.plugin.api;
    }
}
