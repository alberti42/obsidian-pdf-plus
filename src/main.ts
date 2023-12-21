import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, PDFPlusSettings, PDFPlusSettingTab } from 'settings';
import { patchPDF, patchWorkspace } from 'patch';
import { PDFViewerChild } from 'typings';
import { iteratePDFViews } from 'utils';
import { BacklinkManager } from 'backlinks';


export default class PDFPlus extends Plugin {
	settings: PDFPlusSettings;
	pdfViwerChildren: Map<HTMLElement, PDFViewerChild> = new Map();

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new PDFPlusSettingTab(this));

		patchWorkspace(this);

		this.app.workspace.onLayoutReady(() => {
			const success = patchPDF(this);
			if (!success) {
				const notice = new Notice(`${this.manifest.name}: Open a PDF file to enable the plugin.`, 0);

				const eventRef = this.app.workspace.on('layout-change', () => {
					const success = patchPDF(this);
					if (success) {
						this.app.workspace.offref(eventRef);
						notice.hide();
						new Notice(`${this.manifest.name}: You're ready!`, 1500);
					}
				});
				this.registerEvent(eventRef);
			}
		});

		this.registerDomEvent(document, 'wheel', (evt) => {
			if (this.settings.embedUnscrollable
				&& evt.target instanceof HTMLElement
				&& evt.target.closest('.pdf-embed[src*="#"] .pdf-viewer-container')) {
				evt.preventDefault();
			}
		}, { passive: false });

		this.registerDomEvent(window, 'click', (evt) => {
			if (evt.target instanceof HTMLElement) {
				const linktext = evt.target.closest('.pdf-embed[src]')?.getAttribute('src');
				const viewerEl = evt.target.closest<HTMLElement>('div.pdf-viewer');
				if (linktext && viewerEl) {
					const sourcePath = this.pdfViwerChildren.get(viewerEl)?.file?.path ?? '';
					this.app.workspace.openLinkText(linktext, sourcePath);
				}
			}
		})

		this.registerEvent(this.app.workspace.on('layout-change', () => {
			for (const viewerEl of this.pdfViwerChildren.keys()) {
				if (!viewerEl?.isShown()) this.pdfViwerChildren.delete(viewerEl);
			}
		}));

		this.app.workspace.onLayoutReady(() => {
			iteratePDFViews(this.app, (view) => {
				view.viewer.then((child) => {
                    if (!view.viewer.backlinkManager) {
                        view.viewer.backlinkManager = view.viewer.addChild(new BacklinkManager(this, child.pdfViewer));
                    }
					if (!child.backlinkManager) {
						child.backlinkManager = view.viewer.backlinkManager
					}
                    view.viewer.backlinkManager.file = view.file;
                    view.viewer.backlinkManager.highlightBacklinks();
                });
			});
		});

		this.registerHoverLinkSource('pdf-plus', {
			defaultMod: true,
			display: 'PDF++ backlinks'
		});

		this.registerCommands();

		(window as any).pdfPlus = this;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCommands() {
		this.addCommand({
			id: 'copy-link-to-selection',
			name: 'Copy link to selection',
			checkCallback: (checking: boolean) => {
				const selection = window.getSelection();
				if (!selection) return false;
				const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
				const pageEl = range?.startContainer.parentElement?.closest('.page');
				if (!pageEl || !(pageEl.instanceOf(HTMLElement)) || pageEl.dataset.pageNumber === undefined) return false;

				const viewerEl = pageEl.closest<HTMLElement>('.pdf-viewer');
				if (!viewerEl) return false;

				const child = this.pdfViwerChildren.get(viewerEl);
				if (!child) return false;

				if (!checking) {
					const page = parseInt(pageEl.dataset.pageNumber);
					const selectionStr = child.getTextSelectionRangeStr(pageEl);
					const linktext = child.getMarkdownLink(`#page=${page}&selection=${selectionStr}`, child.getPageLinkAlias(page));
					navigator.clipboard.writeText(linktext);
				}
				return true;
			}
		});
	}
}
