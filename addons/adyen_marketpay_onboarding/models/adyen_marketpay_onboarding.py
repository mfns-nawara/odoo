# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from werkzeug import urls
import json
import requests
import uuid

from odoo import api, fields, models
from odoo.exceptions import UserError


class AdyenAccountHolder(models.Model):
    _name = 'adyen.account.holder'
    _description = 'Adyen Account Holder'

    account_holder_code = fields.Char("Account Holder Code", default=lambda s: uuid.uuid4())
    status = fields.Selection(selection=[
        ('Active', 'Active'),
        ('Inactive', 'Incative'),
        ('Suspended', 'Suspended'),
        ('Closed', 'Closed'),
    ], string='Status', required=True, readonly=True, copy=False, tracking=True, default='Active')
    kyc_verification = fields.Selection(selection=[
        ('UNCHECKED', 'Unchecked'),
        ('AWAITING_DATA', 'Awaiting Data'),
        ('DATA_PROVIDED', 'Data Provided'),
        ('PENDING', 'Pending'),
        ('INVALID_DATA', 'Invalid Data'),
        ('RETRY_LIMIT_REACHED', 'Retry Limit Reached'),
        ('PASSED', 'Passed'),
        ('FAILED', 'Failed'),
    ], string='KYC Verification', default='UNCHECKED')
    legal_entity = fields.Selection(string="Legal Entity", selection=[('Individual', 'Individual'), ('Business', 'Business')], default="Individual", required=True)
    use_payment_terminals = fields.Boolean("Use Payment Terminals")
    store_ids = fields.Many2many(string="Stores", comodel_name='adyen.store')
    email = fields.Char("Contact Email")
    country_id = fields.Many2one(string="Country", comodel_name='res.country')

    # Individual
    first_name = fields.Char("First Name")
    last_name = fields.Char("Last Name")
    gender = fields.Selection([
        ('male', 'Male'),
        ('female', 'Female'),
        ('unknown', 'Other')
    ], default="male")

    # Business
    doing_business_as = fields.Char("Doing Business As")
    legal_business_name = fields.Char("Legal Business Name")
    shareholder_ids = fields.Many2many(string="Shareholders", comodel_name='adyen.business.shareholder')

    # @api.model
    # def create(self, values):
    #     result = super(AdyenAccountHolder, self).create(values)
    #     data = {
    #         'operation': 'create',
    #         'adyen_data': result.format_data(),
    #     }
    #     response = requests.post(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data))
    #     if not response.ok:
    #         raise UserError('Adyen Exception: %s' % response.json()['invalidFields'][0]['errorDescription'])
    #     return result

    # def write(self, values):
    #     result = super(AdyenAccountHolder, self).write(values)
    #     data = {
    #         'operation': 'update',
    #         'adyen_data': self.format_data(),
    #     }
    #     response = requests.post(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data))
    #     if not response.ok:
    #         raise UserError('Adyen Exception: %s' % response.json()['invalidFields'][0]['errorDescription'])
    #     return result
    
    # def unlink(self):
    #     data = {
    #         'operation': 'close',
    #         'adyen_data': {
    #             "accountHolderCode": self.account_holder_code,
    #         },
    #     }
    #     response = requests.post(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data))
    #     return super(AdyenAccountHolder, self).unlink()

    @api.model
    def _configure_adyen_notifications(self):
        data = {
            'operation': 'get_notification_configuration',
        }
        response = requests.post(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data))
        if not response.ok or not len(response.json()['configurations']):
            # TODO ANP Change URL: base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
            base_url = "http://9aa544d4.ngrok.io/"
            data = {
                'operation': 'create_notification_configuration',
                'adyen_data': {
                    "configurationDetails": {
                        "description":"Account Holder Notifications",
                        "eventConfigs": [
                            {
                                "eventType": "ACCOUNT_HOLDER_CREATED",
                                "includeMode": "INCLUDE"
                            }, {
                                "eventType": "ACCOUNT_HOLDER_STATUS_CHANGE",
                                "includeMode": "INCLUDE"
                            }, {
                                "eventType": "ACCOUNT_HOLDER_VERIFICATION",
                                "includeMode": "INCLUDE"
                            }, {
                                "eventType": "ACCOUNT_HOLDER_PAYOUT",
                                "includeMode": "INCLUDE"
                            },
                        ],
                        "notifyURL": urls.url_join(base_url, '/adyen_marketpay_onboarding/notification'),
                    }
                }
            }
            response = requests.post(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data))

    def format_data(self):
        data = {
            "accountHolderCode": self.account_holder_code,
            "accountHolderDetails": {
                "address": {
                    "country": self.country_id.code,
                },
            },
            "legalEntity": self.legal_entity,
            "createDefaultAccount": False,
        }

        store_details = []
        for store in self.store_ids:
            store_details.append(store.format_data())
        data["accountHolderDetails"]["storeDetails"] = store_details

        if self.legal_entity == 'Individual':
            data["accountHolderDetails"]["email"] = self.email
            data["accountHolderDetails"]["individualDetails"] = {
                "name": {
                    "firstName": self.first_name,
                    "lastName": self.last_name,
                    "gender": self.gender.upper(),
                },
            }
        else:
            shareholders_details = []
            for shareholder in self.shareholder_ids:
                shareholders_details.append(shareholder.format_data())
            data["accountHolderDetails"]["businessDetails"] = {
                "doingBusinessAs": self.doing_business_as,
                "legalBusinessName": self.legal_business_name,
                "shareholders": shareholders_details,
            }
            data["accountHolderDetails"]["email"] = self.email
        return data

    def action_adyen_onboarding_page(self):
        self.ensure_one()
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        data = {
            'operation': 'get_onboarding_url',
            'adyen_data': {
                "accountHolderCode": self.account_holder_code,
                "returnUrl": urls.url_join(base_url, 'web#action=pos_adyen.adyen_onboarding_action&view_type=form&id=%s' % self.id),
            }
        }
        response = requests.get(urls.url_join(self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy'), "proxy"), data=json.dumps(data)) 
        if response.ok:
            return {
                'type': 'ir.actions.act_url',
                'target': 'self',
                'url': response.json()['redirectUrl'],
            }


class BusinessShareholder(models.Model):
    _name = 'adyen.business.shareholder'
    _description = 'Adyen Business Shareholder'

    country_id = fields.Many2one(string="Country", comodel_name='res.country')
    email = fields.Char("Email")
    first_name = fields.Char("First Name")
    last_name = fields.Char("Last Name")
    gender = fields.Selection([
        ('male', 'Male'),
        ('female', 'Female'),
        ('unknown', 'Other')
    ], default="unknown")

    def format_data(self):
        return {
            "name": {
                "firstName": self.first_name,
                "lastName": self.last_name,
                "gender": self.gender.upper(),
            },
            "address": {
                "country": self.country_id.code,
            },
            "email": self.email,
        }


class AdyenStore(models.Model):
    _name = 'adyen.store'
    _description = 'Adyen Store'

    store_reference = fields.Char("Account Holder Code", default=lambda s: uuid.uuid4())
    street = fields.Char('Street')
    house_number_or_name = fields.Char('House Number or name')
    postal_code = fields.Char('Zip')
    city = fields.Char('City')
    state_id = fields.Many2one('res.country.state', 'State', domain="[('country_id', '=', country_id)]")
    country_id = fields.Many2one(string="Country", comodel_name='res.country')

    def format_data(self):
        return {
            "storeReference": self.store_reference,
            "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
            "merchantCategoryCode": "7999",
            "address": {
                "city": self.city,
                "country": self.country_id.code,
                "houseNumberOrName": self.house_number_or_name,
                "postalCode": self.postal_code,
                "stateOrProvince": self.state_id.code,
                "street": self.street,
            },
            "fullPhoneNumber": "+31201234567"
        }
