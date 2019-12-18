odoo.define('mail.component.ChatterTopbar', function (require) {
'use strict';

const { Component } = owl;
const { useStore } = owl.hooks;

class ChatterTopbar extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeProps = useStore((state, props) => {
            const thread = state.threads[props.threadLocalId];
            return {
                attachmentsAmount: thread && thread.attachmentLocalIds
                    ? thread.attachmentLocalIds.length
                    : 0,
                followersAmount: 0
            };
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onClickAttachments(ev) {
        this.trigger('o-chatter-topbar-select-attachment');
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onClickFollow(ev) {
        this.trigger('o-chatter-topbar-follow');
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onClickFollowers(ev) {
        this.trigger('o-chatter-topbar-show-followers');
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onClickLogNote(ev) {
        this.trigger('o-chatter-topbar-log-note');
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onClickScheduleActivity(ev) {
        this.trigger('o-chatter-topbar-schedule-activity');
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onClickSendMessage(ev) {
        this.trigger('o-chatter-topbar-send-message');
    }
}

ChatterTopbar.props = {
    threadLocalId: String,
};

ChatterTopbar.template = 'mail.component.ChatterTopbar';

return ChatterTopbar;

});
