odoo.define('mail.component.Chatter', function (require) {
'use strict';

const AttachmentBox = require('mail.component.AttachmentBox');
const ChatterTopbar = require('mail.component.ChatterTopbar');
const Composer = require('mail.component.Composer');
const Thread = require('mail.component.Thread');

const { Component, useState } = owl;
const { useDispatch, useGetters, useRef, useStore } = owl.hooks;

class Chatter extends Component {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            isComposerLog: false,
            isAttachmentBoxVisible: false,
            isComposerVisible: false,
        });
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, { chatterLocalId }) => {
            const chatter = state.chatters[chatterLocalId];
            const thread = state.threads[chatter.threadLocalId];
            return {
                composerLocalId: thread ? thread.composerLocalId : undefined,
                threadLocalId: thread ? thread.localId : undefined,
            };
        });
        this._threadRef = useRef('thread');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------a

    _onComposerMessagePosted() {
        this.storeDispatch('loadNewMessagesOnThread', this.storeProps.threadLocalId);
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarSelectAttachment(ev) {
        this.state.isAttachmentBoxVisible = !this.state.isAttachmentBoxVisible;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarLogNote(ev) {
        const wasComposerLog = this.state.isComposerLog;
        this.state.isComposerLog = true;
        this.state.isComposerVisible = !(wasComposerLog && this.state.isComposerVisible);
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarSendMessage(ev) {
        const wasComposerLog = this.state.isComposerLog;
        this.state.isComposerLog = false;
        this.state.isComposerVisible = !(!wasComposerLog && this.state.isComposerVisible);
    }
}

Chatter.components = { AttachmentBox, ChatterTopbar, Composer, Thread };

Chatter.props = {
    chatterLocalId: String,
};

Chatter.template = 'mail.component.Chatter';

return Chatter;

});
