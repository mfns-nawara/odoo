odoo.define('website_form.RunningTourActionHelper', function (require) {
"use strict";

var RunningTourActionHelper = require('web_tour.RunningTourActionHelper');

RunningTourActionHelper.include({
    text_focus_out: function (text, element) {
        this._text_focus_out(this._get_action_values(element), text);
    },
    _text_focus_out: function (values, text) {
        this._text(values, text);
        values.$element.trigger('focusout');
        values.$element.trigger('blur');
    },
});
});
