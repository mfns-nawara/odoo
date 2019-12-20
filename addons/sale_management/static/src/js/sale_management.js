odoo.define('sale_management.sale_management', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

publicWidget.registry.SaleUpdateLineButton = publicWidget.Widget.extend({
    selector: '.o_portal_sale_sidebar',
    events: {
        'click a.js_update_line_json': '_onClick',
        'click a.js_add_optional_products': '_onClickOptionalProduct',
        'change .js_quantity': '_onChangeQuantity'
    },
    /**
     * @override
     */
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            self.orderDetail = self.$el.find('table#sales_order_table').data();
            self.elems = self._getUpdatableElements();
        });
    },
    /**
     * Process the change in line quantity
     *
     * @private
     * @param {Event} ev
     */
    _onChangeQuantity: function (ev) {
        ev.preventDefault();
        var self = this;
        var $target = $(ev.currentTarget);
        var quantity = parseInt($target.val());

        this._callUpdateLineRoute(self.orderDetail.orderId, {
            'line_id': $target.data('lineId'),
            'input_quantity': quantity >= 0 ? quantity : false,
            'access_token': self.orderDetail.token
        }).then(function (data) {
            self._updateOrderLineValues($target.closest('tr'), data);
            self._updateOrderValues(data);
        });
    },
    /**
     * Reacts to the click on the -/+ buttons
     *
     * @param {Event} ev
     */
    _onClick: function (ev) {
        ev.preventDefault();
        var self = this,
            $target = $(ev.currentTarget),
            isUnlink = $target.is('[href*="unlink"]');

        this._callUpdateLineRoute(self.orderDetail.orderId, {
            'line_id': $target.data('lineId'),
            'remove': $target.is('[href*="remove"]'),
            'unlink': isUnlink,
            'access_token': self.orderDetail.token
        }).then(function (data) {
            var $saleTemplate = $(data['sale_template']);
            isUnlink = isUnlink || data['unlink'];
            if ($saleTemplate.length && isUnlink) {
                self.$('#portal_sale_content').empty().append($saleTemplate);
                self.elems = self._getUpdatableElements();
            }
            self._updateOrderLineValues($target.closest('tr'), data);
            self._updateOrderValues(data);
        });
    },
    /**
     * trigger when optional product added to order from portal.
     *
     * @private
     * @param {Event} ev
     */
    _onClickOptionalProduct: function (ev) {
        ev.preventDefault();
        var self = this;
        var $target = $(ev.currentTarget);
        // to avoid double click on link with href.
        $target.css('pointer-events', 'none');

        this._rpc({
            route: "/my/orders/" + self.orderDetail.orderId + "/add_option/" + $target.data('optionId'),
            params: {access_token: self.orderDetail.token}
        }).then(function (data) {
            if (data) {
                self.$('#portal_sale_content').empty().append($(data['sale_template']));
                self.elems = self._getUpdatableElements();
                self._updateOrderValues(data);
            }
        });
    },
    /**
     * Calls the route to get updated values of the line and order
     * when the quantity of a product has changed
     *
     * @private
     * @param {integer} order_id
     * @param {Object} params
     * @return {Deferred}
     */
    _callUpdateLineRoute: function (order_id, params) {
        var url = "/my/orders/" + order_id + "/update_line_dict";
        return this._rpc({
            route: url,
            params: params,
        });
    },
    /**
     * Processes data from the server to update the orderline UI
     *
     * @private
     * @param {Element} $orderLine: orderline element to update
     * @param {Object} data: contains order and line updated values
     */
    _updateOrderLineValues: function ($orderLine, data) {
        var linePriceTotal = data.order_line_price_total,
            linePriceSubTotal = data.order_line_price_subtotal,
            $linePriceTotal = $orderLine.find('.oe_order_line_price_total .oe_currency_value'),
            $linePriceSubTotal = $orderLine.find('.oe_order_line_price_subtotal .oe_currency_value');

        if (!$linePriceTotal.length && !$linePriceSubTotal.length) {
            $linePriceTotal = $linePriceSubTotal = $orderLine.find('.oe_currency_value').last();
        }

        $orderLine.find('.js_quantity').val(data.order_line_product_uom_qty);
        if ($linePriceTotal.length && linePriceTotal !== undefined) {
            $linePriceTotal.text(linePriceTotal);
        }
        if ($linePriceSubTotal.length && linePriceSubTotal !== undefined) {
            $linePriceSubTotal.text(linePriceSubTotal);
        }
    },
    /**
     * Processes data from the server to update the UI
     *
     * @private
     * @param {Object} data: contains order and line updated values
     */
    _updateOrderValues: function (data) {
        var orderAmountTotal = data.order_amount_total,
            orderAmountUntaxed = data.order_amount_untaxed,
            orderAmountUndiscounted = data.order_amount_undiscounted,
            $orderTotalsTable = $(data.order_totals_table);
        if (orderAmountUntaxed !== undefined) {
            this.elems.$orderAmountUntaxed.text(orderAmountUntaxed);
        }

        if (orderAmountTotal !== undefined) {
            this.elems.$orderAmountTotal.text(orderAmountTotal);
        }

        if (orderAmountUndiscounted !== undefined) {
            this.elems.$orderAmountUndiscounted.text(orderAmountUndiscounted);
        }
        if ($orderTotalsTable.length) {
            this.elems.$orderTotalsTable.find('table').replaceWith($orderTotalsTable);
        }
    },
    /**
     * Locate in the DOM the elements to update
     * Mostly for compatibility, when the module has not been upgraded
     * In that case, we need to fall back to some other elements
     *
     * @private
     * @return {Object}: Jquery elements to update
     */
    _getUpdatableElements: function () {
        var $orderAmountUntaxed = $('[data-id="total_untaxed"]').find('span, b');
        var $orderAmountTotal = $('[data-id="total_amount"]').find('span, b');
        var $orderAmountUndiscounted = $('[data-id="amount_undiscounted"]').find('span, b');

        if (!$orderAmountUntaxed.length) {
            $orderAmountUntaxed = $orderAmountTotal.eq(1);
            $orderAmountTotal = $orderAmountTotal.eq(0).add($orderAmountTotal.eq(2));
        }

        return {
            $orderAmountUntaxed: $orderAmountUntaxed,
            $orderAmountTotal: $orderAmountTotal,
            $orderTotalsTable: $('#total'),
            $orderAmountUndiscounted: $orderAmountUndiscounted,
        };
    }
});
});
