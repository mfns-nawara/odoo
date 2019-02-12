odoo.define('mail.component.EmojisButton', function (require) {
'use strict';

const Popover = require('mail.component.EmojisPopover');

const { Component } = owl;

class EmojisButton extends Component {

    /**
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.state = { isOpen: false };
        this.template = 'mail.component.EmojisButton';
        this._$popover = undefined;
        this._globalCaptureEventListener = ev => this._onClickCaptureGlobal(ev);
        this._popover = undefined;
        this._popoverId = undefined;
    }

    async mounted() {
        this._popover = new Popover(this.env);
        await this._popover.mount(document.createElement('div')).then(() => {
            const self = this;
            this._popover.el.outerHTML = this._popover.el;
            this._$popover = $(this.el).popover({
                html: true,
                boundary: 'viewport',
                placement: 'top',
                trigger: 'click',
                offset: '0, 1',
                content() {
                    const $this = $(this);
                    self._popoverId = $this.attr('aria-describedby');
                    return self._popover.el;
                }
            });
        });
        this._popover.el.addEventListener('selection', ev => this._onEmojiSelection(ev));
        document.addEventListener('click', this._globalCaptureEventListener, true);
    }

    willUnmount() {
        this._hidePopover();
        this._popover.destroy();
        document.removeEventListener('click', this._globalCaptureEventListener, true);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _hidePopover() {
        this._$popover.popover('hide');
        this._popoverId = undefined;
        this.state.isOpen = false;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        if (ev.target === this.el) {
            this.state.isOpen = true;
            return;
        }
        if (!this._popoverId) {
            return;
        }
        if (ev.target.closest(`#${this._popoverId}`)) {
            this.state.isOpen = true;
            return;
        }
        this._hidePopover();
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.unicode
     */
    _onEmojiSelection(ev) {
        this._hidePopover();
        this.trigger('emoji-selection', {
            unicode: ev.detail.unicode,
        });
    }
}

return EmojisButton;

});
