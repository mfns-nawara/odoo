odoo.define('mail.component.ComposerTextInput', function (require) {
'use strict';

const { Component } = owl;
const { useDispatch, useGetters, useRef, useStore } = owl.hooks;

/**
 * ComposerInput relies on a minimal HTML editor in order to support mentions.
 */
class ComposerTextInput extends Component {

    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);

        /**
         * Max frequency for searching for mention suggestions. Useful to
         * limit amount of RPC while user types something that starts a mention.
         */
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, props) => {
            const composer = state.composers[props.composerLocalId]
            return {
                isMobile: state.isMobile,
                composer,
            };
        });
        /**
         * Reference of the textarea. Only useful to compute the jQuery node
         * reference of it...
         */
        this._textareaRef = useRef('textarea');
    }

    mounted() {
        this._update();
    }

    patched() {
        this._update();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    focus() {
        this._textareaRef.el.focus();
    }

    focusout() {
        this._textareaRef.el.blur();
    }

    /**
     * @return {string}
     */
    getContent() {
        return this._textareaRef.el.value;
    }

    getSelectionStart() {
        return this._textareaRef.el.selectionStart;
    }

    getSelectionEnd() {
        return this._textareaRef.el.selectionEnd;
    }

    getHeight() {
        return this._textareaRef.el.style.height;
    }

    /**
     * Determine whether the editable is empty or not.
     *
     * @return {boolean}
     */
    isEmpty() {
        return this._textareaRef.el.value === "";
    }

    reset() {
        this._textareaRef.el.value = "";
    }

    _onInputEditable(){
        this._textareaRef.el.style.height = "0px";
        this._textareaRef.el.style.overflow = "auto";
        this._textareaRef.el.style.height = (this._textareaRef.el.scrollHeight)+"px";
        this.trigger('o-input-composer-text-input');
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownEditable(ev) {
        switch (ev.key) {
            case 'Enter':
                this._onKeydownEditableEnter(ev);
                break;
            case 'Escape':
                this._onKeydownEditableEscape(ev);
                break;
            default:
                break;
        }
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownEditableEnter(ev) {
        if (ev.shiftKey) {
            return;
        }
        if (this.storeProps.isMobile) {
            return;
        }
        this.trigger('o-keydown-enter');
        ev.preventDefault();
        this._textareaRef.el.style.height = "39px";
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownEditableEscape(ev) {
        if (!this.isEmpty()) {
            return;
        }
        this.trigger('o-discard');
        ev.preventDefault();
    }

    _update() {
        this._textareaRef.el.setSelectionRange(
            this.storeProps.composer.textInputCursorStart,
            this.storeProps.composer.textInputCursorEnd,
        );
        this._textareaRef.el.style.height = this.storeProps.composer.textInputHeight;
    }
}

ComposerTextInput.defaultProps = {
    composerLocalId: 'undefined',
};

ComposerTextInput.props = {
    composerLocalId: {
        type: String,
    },
};

ComposerTextInput.template = 'mail.component.ComposerTextInput';

return ComposerTextInput;

});
