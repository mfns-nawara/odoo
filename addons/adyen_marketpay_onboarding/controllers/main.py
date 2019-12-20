# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from werkzeug import urls
import json
import requests

from odoo import http
from odoo.http import request


class AdyenMarketPayOnboardingController(http.Controller):

    @http.route('/adyen_marketpay_onboarding', type="http", auth='public', website=True)
    def adyen_marketpay_onboarding(self):
        account_holder = request.env['adyen.account.holder'].sudo().create({})
        response = request.render("adyen_marketpay_onboarding.account_holder", {
            'countries': request.env['res.country'].search([]),
            'account_holder': account_holder,
        })
        return response

    # TODO ANP: Delete
    @http.route('/adyen_marketpay_onboarding/test', type='http', auth='none', csrf=False)
    def adyen_onboarding_test(self):
        api_base_url = request.env['ir.config_parameter'].sudo().get_param('adyen.api_base_url')
        response = requests.post(urls.url_join(api_base_url, "Notification/v5/testNotificationConfiguration"), data=json.dumps({"notificationId": 20758}), headers = {
            'x-api-key': "AQEvhmfxLo7PbhVDw0exgG89s9SXSYhIQ7xOV2pl5yj9zwJ/ec/HUPnUz2zfB8PqBlsQwV1bDb7kfNy1WIxIIkxgBw==-bkjTdguRhv/vEhck2bCxRPJcaKN6O9H0YBRRQYj6zfk=-6qLM9E}[n:&6pQZ8",
            'Content-Type': 'application/json'
        })

    @http.route('/adyen_marketpay_onboarding/notification', type='json', auth='none', csrf=False)
    def adyen_onboarding_notification(self):
        data = request.jsonrequest
        if data['eventType'] == 'ACCOUNT_HOLDER_CREATED':
            request.env['adyen.onboarding.account'].create({'account_holder_code': data['content']['accountHolderCode']})
        else: 
            account = request.env['adyen.onboarding.account'].search([('account_holder_code', '=', data['content']['accountHolderCode'])])
            if account:
                if data['eventType'] == 'ACCOUNT_HOLDER_STATUS_CHANGE':
                    account.write({
                        'status': data['content']['newStatus']['status'],
                    })
                elif data['eventType'] == 'ACCOUNT_HOLDER_VERIFICATION':
                    account.write({
                        'kyc_verification': data['content']['kycCheckStatusData']['status'],
                    })

        """TODO ANP: Adyen doesn't understand the error as it is wrapped:
        {
            "jsonrpc": "2.0",
            "id": null,
            "result": {
                "notificationResponse": "[accepted]"
            }
        }
        """
        return {
            "notificationResponse" : "[accepted]"
        }