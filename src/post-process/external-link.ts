import { HoverParent, HoverPopover } from 'obsidian';

import PDFPlus from 'main';
import { PDFPlusComponent } from 'lib/component';
import { AnnotationElement, PDFViewerChild } from 'typings';


export class PDFExternalLinkPostProcessor extends PDFPlusComponent implements HoverParent {
    child: PDFViewerChild;
    annot: AnnotationElement;

    constructor(plugin: PDFPlus, child: PDFViewerChild, annot: AnnotationElement) {
        super(plugin);
        this.child = child;
        this.annot = annot;
    }

    get hoverPopover() {
        return this.child.hoverPopover;
    }

    set hoverPopover(hoverPopover: HoverPopover | null) {
        this.child.hoverPopover = hoverPopover;
    }

    onload() {
        if (this.settings.popoverPreviewOnExternalLinkHover) {
            this.registerDomEvent(this.annot.container, 'mouseover', (event) => {
                const url: string | undefined = this.annot.data.url;
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                    this.app.workspace.trigger('hover-link', {
                        event,
                        source: 'pdf-plus',
                        hoverParent: this,
                        targetEl: this.annot.container,
                        linktext: url
                    });
                }
            });    
        }
    }

    static registerEvents(plugin: PDFPlus, child: PDFViewerChild, annot: AnnotationElement) {
        if (annot.data.subtype === 'Link' && annot.data.url) {
            return child.component?.addChild(new PDFExternalLinkPostProcessor(plugin, child, annot));
        }
        return null;
    }
}
