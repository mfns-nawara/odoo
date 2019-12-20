# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Adyen Onboarding',
    'version': '1.0',
    'category': '',
    'summary': 'Onboarding for Adyen MarketPay',
    'description': 'Onboarding for Adyen MarketPay',
    'data': [
        'data/adyen_marketpay_onboarding_data.xml',
        'views/onboarding_templates.xml',
        'views/onboarding_views.xml',
    ],
    'qweb': ['static/src/xml/onboarding.xml'],
    'depends': ['portal', 'adyen_marketpay'],
    'installable': True,
    'license': 'OEEL-1',
}
