# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from werkzeug import urls
from werkzeug.wrappers import Response
import json
import requests

from odoo import http
from odoo.http import request

ROUTES = {
    'create': "Account/v5/createAccountHolder",
    'update': "Account/v5/updateAccountHolder",
    'close': "Account/v5/closeAccountHolder",
    'get_onboarding_url': "Hop/v1/getOnboardingUrl",
    'get_notification_configuration': "Notification/v5/getNotificationConfigurationList",
    'create_notification_configuration': "Notification/v5/createNotificationConfigurationList",
}


class AdyenMarketPayProxyController(http.Controller):

    @http.route('/adyen_marketpay/proxy', type='http', auth='none', csrf=False)
    def adyen_onboarding_proxy(self):
        data = json.loads(request.httprequest.data)
        api_base_url = request.env['ir.config_parameter'].sudo().get_param('adyen.api_base_url')
        headers = {
            'x-api-key': self.env['ir.config_parameter'].sudo().get_param('adyen.api_key'),
            'Content-Type': 'application/json'
        }
        url = urls.url_join(api_base_url, ROUTES[data['operation']])
        response = requests.post(url, data=json.dumps(data['adyen_data']), headers=headers)
        return Response(response.text, response.status_code)
