odoo.define('adyen_marketpay_onboarding', function (require) {
"use strict";

var core = require('web.core');
var publicWidget = require('web.public.widget');
var rpc = require('web.rpc');

var QWeb = core.qweb;

publicWidget.registry.AdyenMarketPayOnboardingWidget = publicWidget.Widget.extend({
    selector: '.o_adyen_onboarding_form',
    xmlDependencies: ['/adyen_marketpay_onboarding/static/src/xml/onboarding.xml'],
    events: {
        "change input[name='legal_entity']": "_onChangeLegalEntity",
        "change input[name='use_payment_terminals']": "_onChangeUsePaymentTerminals",
        "click .o_adyen_add_shareholder_button": "_addShareholder",
        "click .o_adyen_delete_shareholder_button": "_deleteListItem",
        "click .o_adyen_add_store_button": "_addStore",
        "click .o_adyen_delete_store_button": "_deleteListItem",
        "click .o_adyen_onboarding_submit": "_submit",
    },

    init: function () {
        this._super(arguments);
        this._onChangeLegalEntity();
    },

    willStart: function () {
        var self = this;
        var res = this._super(arguments);
        var countries_promise = rpc.query({
            model: 'res.country',
            method: 'search_read',
            fields: ['name'],
        }).then(function (countries) {
            self.countries = countries;
        });
        return Promise.all([res, countries_promise]);
    },

    _addShareholder: function (ev) {
        $(QWeb.render('adyen_marketpay_onboarding.business_shareholder', {
            countries: this.countries,
        })).insertBefore(ev.currentTarget);
    },

    _addStore: function (ev) {
        $(QWeb.render('adyen_marketpay_onboarding.store', {
            countries: this.countries,
        })).insertBefore(ev.currentTarget);
    },

    _deleteListItem: function (ev) {
        ev.currentTarget.parentElement.remove();
    },

    _onChangeLegalEntity: function(ev) {
        var isIndividual = ev ? ev.currentTarget.value === 'Individual' : $('input[name="legal_entity"]')[0].checked;
        if (isIndividual) {
            $('.o_adyen_onboarding_business').addClass('d-none');
            $('.o_adyen_onboarding_shareholders').addClass('d-none');
            $('input[name="legal_business_name"]').removeAttr('required');
            $('.o_adyen_onboarding_individual').removeClass('d-none');
            $('input[name="first_name"]').attr('required', '');
            $('input[name="last_name"]').attr('required', '');
        } else {
            $('.o_adyen_onboarding_individual').addClass('d-none');
            $('input[name="first_name"]').removeAttr('required');
            $('input[name="last_name"]').removeAttr('required');
            $('.o_adyen_onboarding_business').removeClass('d-none');
            $('.o_adyen_onboarding_shareholders').removeClass('d-none');
            $('input[name="legal_business_name"]').attr('required', '');
        }
    },

    _onChangeUsePaymentTerminals: function () {
        if ($('input[name="use_payment_terminals"]')[0].checked) {
            $('.o_adyen_onboarding_stores').removeClass('d-none');
        } else {
            $('.o_adyen_onboarding_stores').addClass('d-none');
        }
    },

    _getFormInfo: function () {
        var info = {};
        if ($('input[name="legal_entity"]')[0].checked) {
            info = {
                legal_entity: 'individual',
                first_name: $('input[name="first_name"]')[0].value,
                last_name: $('input[name="last_name"]')[0].value,
                gender: $('select[name="gender"]')[0].value,
            };
        } else {
            var shareholders = [];
            $('.o_adyen_business_shareholder').each(function (idx, shareholder) {
                var $shareholder = $(shareholder);
                shareholders.push({
                    first_name: $shareholder.find('input[name="first_name"]')[0].value,
                    last_name: $shareholder.find('input[name="last_name"]')[0].value,
                    gender: $shareholder.find('select[name="gender"]')[0].value,
                    email: $shareholder.find('input[name="email"]')[0].value,
                    country_id: $store.find('select[name="coutry_id"]')[0].value,
                });
            });
            info = {
                legal_entity: 'business',
                legal_name: $('input[name="legal_business_name"]')[0].value,
                doing_business_as: $('input[name="doing_business_as"]')[0].value,
                shareholders: shareholders,
            };
        }
        info.email = $('input[name="email"]')[0].value;
        info.country_id = $('select[name="country_id"]')[0].value;
        var stores = [];
        $('.o_adyen_store').each(function (idx, store) {
            var $store = $(store);
            stores.push({
                street: $store.find('input[name="street"]')[0].value,
                house_number_or_name: $store.find('input[name="house_number_or_name"]')[0].value,
                postal_code: $store.find('input[name="postal_code"]')[0].value,
                city: $store.find('input[name="city"]')[0].value,
                state: $store.find('input[name="state"]')[0].value,
                country_id: $store.find('select[name="coutry_id"]')[0].value,
            });
        });
        info.stores = stores;

        return info;
    },

    _submit: function(ev) {
        var info = this._getFormInfo();
        debugger
    },
});

return publicWidget.registry.AdyenMarketPayOnboardingWidget;

});
