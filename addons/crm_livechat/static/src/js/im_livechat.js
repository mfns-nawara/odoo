odoo.define('crm_livechat.im_livechat', function (require) {
"use strict";

var core = require('web.core');
var LiveChat = require('im_livechat.im_livechat');
var Timer = require('mail.model.Timer');

var _t = core._t;
var QWeb = core.qweb;

LiveChat.LivechatButton.include({
    // Timer of current user that was typing something, but
    // there is no response from the operator in 30 mins.
    // This is useful in order to create a lead for the current visitor.
    init(parent, serverURL, options) {
        this._LeadGenerationTimer = new Timer({
            duration: 30 * 60 * 1000,
            onTimeout: this._notifyNoOperator.bind(this),
        });
        this._super.apply(this, arguments);
    },
    /**
     * generate lead for visitor when operator is not available
     *
     * @private
     * @param {Object} threadwindow
     * @param {string} channel_uuid unique id
     */
    _generateLead(threadwindow, channel_uuid) {
        var self = this;
        var $content = $(QWeb.render('crm_livechat.lead_generation_form', {channel_uuid: channel_uuid}));
        threadwindow.$('.o_mail_thread').append($content);
        var form = document.getElementById('lead-form');
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            return self._rpc({
                route: event.target.action,
                params: $.deparam($(event.target).serialize()),
            }).then(function (resId) {
                self._LeadGenerationTimer.clear();
                if (channel_uuid) {
                    self.lead_id = resId;
                    threadwindow.$('.o_mail_thread_content, .o_thread_composer, #lead_create_form').toggle();
                }
           });
        });

    },
    /**
     * @override
     * @private
     */
    _notifyNoOperator() {
        var self = this;
        if (this.options.generate_lead) {
            if (this._livechat) {
                this._chatWindow.$('.o_mail_thread_content, .o_thread_composer').toggle();
                this._generateLead(this._chatWindow, this._livechat._uuid);
            }
        } else {
            this._super.apply(this, arguments);
        }
    },
    /**
     * @override
     * @private
     */
    _onPostMessageChatWindow(ev) {
        this._super.apply(this, arguments);
        if (this.options.generate_lead) {
            if (this.lead_id) {
                this._rpc({
                    route: '/livechat/generate_lead',
                    params: {
                        lead_id: this.lead_id,
                        content: ev.data.messageData.content,
                        channel_uuid: this._livechat._uuid
                    },
                });
            } else {
                this._LeadGenerationTimer.reset();
            }
        }
    },
    /**
     * @override
     * @private
     */
    _addMessage(data, options) {
        this._super.apply(this, arguments);
        if (this.options.generate_lead && this._livechat && this._messages[this._messages.length - 1].getAuthorID() === this._livechat._operatorPID[0]) {
            this._LeadGenerationTimer.clear();
        }
    },

});
});
