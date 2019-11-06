odoo.define('web.OwlDialog', function (require) {
"use strict";

const { qweb, _lt } = require('web.core');
const { useRef } = owl.hooks;

const SIZE_CLASSES = {
    'extra-large': 'modal-xl',
    'large': 'modal-lg',
    'small': 'modal-sm',
};

const DEFAULT_BUTTON = {
    attrs: { class: 'btn btn-primary' },
    text: _lt("Ok"),
};

/**
 * ┌─────────────┐
 * │ ⚠️ WARNING ⚠️ │
 * └─────────────┘
 *
 * The general mechanic of the dialog is NOT to reproduce: you should never manually
 * move the element of a component somewhere else in the DOM. We do this here because
 * we need the component to be located directly in the body for the proper styles to
 * be applied.
 **/
class OwlDialog extends owl.Component {

    /**
     * @param {Object} [props]
     * @param {boolean|string} [props.backdrop='static']
     *        The kind of modal backdrop to use (see BS documentation)
     * @param {Object[]} [props.buttons] List of button descriptions.
     *        Note: if no buttons, a "ok" primary button is added to allow closing
     *        the dialog
     * @param {string} [props.buttons[].attrs]
     * @param {string} [props.buttons[].classes] Default to 'btn-primary' if only
     *        one button, 'btn-secondary' otherwise
     * @param {boolean} [props.buttons[].icon]
     * @param {boolean} [props.buttons[].metadata]
     * @param {boolean} [props.buttons[].size]
     * @param {string} [props.buttons[].text]
     * @param {string} [props.dialogClass] - class to add to the modal-body
     * @param {boolean} [props.focusFirstButton] give focus to first primary button
     *        when mounted
     * @param {boolean} [props.fullscreen=false] - whether or not the dialog
     *        should be open in fullscreen mode (the main usecase is mobile)
     * @param {boolean} [props.renderFooter=true]
     *        Whether or not the dialog should be rendered with footer
     * @param {boolean} [props.renderHeader=true]
     *        Whether or not the dialog should be rendered with header
     * @param {string} [props.sizeClass=large] - 'extra-large', 'large', 'medium'
     *        or 'small'
     * @param {owl.Component} [props.subComponent]
     *        Component to include in the main body of the dialog modal
     * @param {string} [props.subtitle]
     * @param {string} [props.title=Odoo]
     * @param {boolean} [props.technical=true] If set to false, the modal will have
     *        the standard frontend style (use this for non-editor frontend features)
     * @param {string} [props.textContent]
     */
    constructor() {
        super(...arguments);

        this.footerRef = useRef('modal-footer');

        this.$modal = false;
        this.closeTriggered = false;
        this.closedByButton = false;

        this.placeholder = document.createElement('div');
        this.placeholder.className = 'o_dialog_placeholder';
    }
    mounted() {
        this._removeTooltips();
        this._toBody();

        this.closeTriggered = false;

        // Use Bootstrap modal
        this.$modal = $(this.el)
            .modal({
                show: true,
                backdrop: this.props.backdrop,
            })
            .attr('open', true)
            .on('hidden.bs.modal', () => this.close());
        this.env.bus.on('close_dialogs', this, () => this.close());

        if (this.props.focusFirstButton && this.props.renderFooter) {
            for (let btn of this.footerRef.el.querySelectorAll('.btn-primary')) {
                if (btn.offsetParent !== null) {
                    btn.focus();
                    break;
                }
            }
        }
    }
    willUnmount() {
        this._removeTooltips();
        this.$modal.modal('hide');
        const modals = [...document.getElementsByClassName('modal')];
        if (modals.length > 1) {
            modals.pop().focus();
            // Keep class modal-open (deleted by bootstrap hide function) on body to allow scrolling inside the modal
            document.body.classList.add('modal-open');
        }
        this._resetPosition();
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get sizeClass() {
        return SIZE_CLASSES[ this.props.sizeClass ];
    }
    /**
     * @returns {Object[]}
     */
    get buttons() {
        if (this.props.buttons.length) {
            const defaultClass = this.props.buttons.length > 1 ? 'btn-secondary' : 'btn-primary';
            return this.props.buttons.map(button => {
                const classList = ['btn'];
                if (button.size) {
                    classList.push('btn-' + button.size);
                }
                classList.push(button.classes || defaultClass);
                const className = classList.join(' ');
                const attrs = Object.assign({
                    type: 'button',
                }, button.attrs, {
                    class: className,
                });

                return { attrs, icon: button.icon, text: button.text };
            });
        }
        return [ DEFAULT_BUTTON ];
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Sends an event signaling that the dialog must be closed.
     * We don't want to trigger multiple close events.
     */
    close() {
        if (!this.closeTriggered) {
            this.closeTriggered = true;
            this.trigger('dialog_closed');
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Move the dialog back to its original position.
     */
    _resetPosition() {
        const parent = this.placeholder.parentNode;
        parent.insertBefore(this.el, this.placeholder);
        parent.removeChild(this.placeholder);
    }
    /**
     * Appends the dialog in the body and leaves a placeholder behind.
     */
    _toBody() {
        this.el.parentNode.insertBefore(this.placeholder, this.el);
        document.body.appendChild(this.el);
        this.closeTriggered = false;
    }
    /**
     * @private
     */
    _removeTooltips() {
        [...document.querySelectorAll('.tooltip')].forEach(tooltip => {
            tooltip.parentNode.removeChild(tooltip); // remove open tooltip if any to prevent them staying when modal is opened
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {number} button_index button index
     */
    _onButtonClick(button_index) {
        this.trigger('dialog_button_clicked', {
            button: this.props.buttons[button_index] || DEFAULT_BUTTON
        });
    }
    /**
     * Emitted by the dialog's children
     *
     * @private
     */
    _onCloseDialog() {
        this.close();
    }
    /**
     * Manages the TAB key on the buttons. If you the focus is on a primary
     * button and the user tries to tab to go to the next button, displays
     * a tooltip
     *
     * @private
     * @param {KeyboardEvent} ev
     */
    _onFooterButtonKeyDown(ev) {
        switch (ev.key) {
            case 'Tab':
                if (!ev.shiftKey && ev.target.classList.contains("btn-primary")) {
                    ev.preventDefault();
                    const primaryButton = ev.target;
                    $(primaryButton).tooltip({
                        delay: { show: 200, hide: 0 },
                        title: () => qweb.render('FormButton.tooltip', { title: primaryButton.innerText.toUpperCase() }),
                        trigger: 'manual',
                    });
                    $(primaryButton).tooltip('show');
                }
        }
    }
}

OwlDialog.defaultProps = {
    backdrop: 'static',
    buttons: [],
    dialogClass: '',
    focusFirstButton: true,
    fullscreen: false,
    renderFooter: true,
    renderHeader: true,
    sizeClass: 'large',
    subtitle: '',
    technical: true,
    title: _lt("Odoo"),
};
// TODO: uncomment when issue `https://github.com/odoo/owl/issues/440` is resolved
OwlDialog.props = {
    backdrop: { type: [Boolean, String], optional: 1 },
    buttons: {
        type: Array,
        element: {
            type: Object,
            // shape: {
            //     attrs: { type: Object, optional: 1 },
            //     classes: { type: String, optional: 1 },
            //     icon: { type: String, optional: 1 },
            //     metadata: { type: Object, optional: 1 },
            //     size: { type: String, optional: 1 },
            //     text: { type: String, optional: 1 },
            // },
        },
        optional: 1,
    },
    dialogClass: { type: String, optional: 1 },
    focusFirstButton: { type: Boolean, optional: 1 },
    fullscreen: { type: Boolean, optional: 1 },
    renderFooter: { type: Boolean, optional: 1 },
    renderHeader: { type: Boolean, optional: 1 },
    // TODO: when enum is available: sizeClass = ['extra-large', 'large', 'small']
    sizeClass: { type: String, optional: 1 },
    subComponent: {
        type: Object,
        // shape: {
        //     component: owl.Component,
        //     props: { type: Object, optional: 1 },
        // },
        optional: 1,
    },
    subtitle: { type: String, optional: 1 },
    technical: { type: Boolean, optional: 1 },
    textContent: { type: String, optional: 1 },
    title: { type: String, optional: 1 },
};
OwlDialog.template = 'OwlDialog';

return OwlDialog;

});
