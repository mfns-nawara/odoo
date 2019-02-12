odoo.define('mail.component.ChatWindowHiddenMenu', function (require) {
"use strict";

const ChatWindowHeader = require('mail.component.ChatWindowHeader');

const { Component, connect } = owl;

const id = _.uniqueId('chat_window_hidden_menu');

class HiddenMenu extends Component {
    /**
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.components = { ChatWindowHeader };
        this.id = id;
        this.state = { toggleShow: false };
        this.template = 'mail.component.ChatWindowHiddenMenu';
        this._globalCaptureClickEventListener = ev => this._onClickCaptureGlobal(ev);
    }

    mounted() {
        this._apply();
        document.addEventListener('click', this._globalCaptureClickEventListener, true);
    }

    patched() {
        this._apply();
    }

    willUnmount() {
        document.removeEventListener('click', this._globalCaptureClickEventListener, true);
    }

    //--------------------------------------------------------------------------
    // Getter / Setter
    //--------------------------------------------------------------------------

    /**
     * @return {integer}
     */
    get unreadCounter() {
        return this.props.threads.reduce((count, thread) => {
            count += thread.message_unread_counter > 0 ? 1 : 0;
            return count;
        }, 0);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _apply() {
        this._applyListHeight();
        this._applyOffset();
    }

    /**
     * @private
     */
    _applyListHeight() {
        this.refs.list.style['max-height'] = `${this.props.GLOBAL_HEIGHT/2}px`;
    }

    /**
     * @private
     */
    _applyOffset() {
        const offsetFrom = this.props.direction === 'rtl' ? 'right' : 'left';
        const oppositeFrom = offsetFrom === 'right' ? 'left' : 'right';
        this.el.style[offsetFrom] = `${this.props.offset}px`;
        this.el.style[oppositeFrom] = 'auto';
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
            return;
        }
        if (ev.target.closest(`[data-id="${this.id}"]`)) {
            return;
        }
        this.state.toggleShow = false;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickToggle(ev) {
        this.state.toggleShow = !this.state.toggleShow;
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.chatWindowId
     */
    _onCloseChatWindow(ev) {
        this.trigger('close-chat-window', {
            chatWindowId: ev.detail.chatWindowId,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.chatWindowId
     */
    _onClickedChatWindow(ev) {
        this.trigger('select-chat-window', {
            chatWindowId: ev.detail.chatWindowId,
        });
        this.state.toggleShow = false;
    }
}

/**
 * Props validation
 */
HiddenMenu.props = {
    GLOBAL_HEIGHT: Number,
    chatWindowIds: { type: Array, element: String },
    direction: String,
    offset: Number,
    threads: { type: Array, element: Object, /* {mail.store.model.Thread} */ },
};

HiddenMenu.defaultProps = {
    direction: 'rtl',
};

return connect(
    HiddenMenu,
    /**
     * @param {Object} state
     * @param {Object} ownProps
     * @param {string[]} ownProps.chatWindowIds
     * @return {Object}
     */
    (state, ownProps) => {
        return {
            GLOBAL_HEIGHT: state.global.innerHeight,
            threads: ownProps.chatWindowIds
                .filter(chatWindowId => chatWindowId !== 'new_message')
                .map(localId => state.threads[localId]),
        };
    },
    { deep: false }
);

});
