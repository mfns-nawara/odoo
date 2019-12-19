odoo.define('stock.PopoverStockPicking', function (require) {
"use strict";

var core = require('web.core');

var PopoverWidget = require('stock.popover_widget');
var registry = require('web.field_registry');
var _t = core._t;

var PopoverStockPicking = PopoverWidget.extend({
    title: _t('Planning Issue'),
    color: 'text-warning',
    trigger: 'focus',

    _render: function () {
        this._super();
        if (this.$popover) {
            var self = this;
            this.$popover.find('a').on('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                self.do_action({
                    type: 'ir.actions.act_window',
                    res_model: ev.currentTarget.getAttribute('element-model'),
                    res_id: parseInt(ev.currentTarget.getAttribute('element-id')),
                    views: [[false, 'form']],
                    target: 'current'
                });
            });
        }
    },

});

registry.add('popover_stock_rescheduling', PopoverStockPicking);

return PopoverStockPicking;
});
