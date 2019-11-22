odoo.define('website.content.cookiesBar', function (require) {
'use strict';

const publicWidget = require('web.public.widget');
const session = require('web.session');

publicWidget.registry.cookiesBar = publicWidget.Widget.extend({
    selector: '#website_cookies_bar',
    disabledInEditableMode: false,
    events: {
        'click .js_agree_cookies': '_onAgreeCookiesBtnClick',
    },
    /**
     * @override
     */
    start: function () {
        if (this.editableMode) {
            this.$el.removeClass('d-none');
            // Prevent overflow
            this.$el.addClass('position-relative');

            $('<o_cookies/>').insertAfter(this.$el);
            this.$el = this.$el.detach();
            if (this.$el.hasClass('fixed-top')) {
                $('#wrapwrap').prepend(this.$el);
            } else {
                this.$el.insertAfter($('o_cookies'));
            }
        } else if (localStorage.getItem('website.agree_cookies')) {
            this._removeCookiesBar();
        } else {
            setTimeout(() => {
                this.$el.removeClass('d-none');
            }, 500);
        }
        return this._super.apply(this, arguments);
    },
    /**
     * @override
     */
    destroy: function () {
        if (this.editableMode) {
            this.$el.addClass('d-none');
            $('o_cookies').replaceWith(this.$el);
            this.$el.removeClass('position-relative');
        }
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Removes the cookies bar.
     *
     * @private
     * @param {Event} ev
     */
    _removeCookiesBar: function (ev) {
        // Do not remove from DOM for editor user in case of later edit mode
        if (session.is_website_user) {
            this.$el.remove();
        } else {
            this.$el.addClass('d-none');
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onAgreeCookiesBtnClick: function (ev) {
        ev.preventDefault();
        localStorage.setItem('website.agree_cookies', true);
        this._removeCookiesBar();
    },
});
});
