# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
from odoo import api, models, _
from odoo.exceptions import ValidationError


class ResPartnerBank(models.Model):
    _inherit = 'res.partner.bank'

    @api.model
    def _get_supported_account_types(self):
        rslt = super(ResPartnerBank, self)._get_supported_account_types()
        rslt.append(('plusgiro', _('Plusgiro')))
        rslt.append(('bankgiro', _('Bankgiro')))
        return rslt

    @api.model
    def retrieve_acc_type(self, acc_number):
        if acc_number and re.match('\d{5,7}-\d{1}', acc_number):
            return 'plusgiro'
        elif acc_number and re.match('\d{3,4}-\d{4}', acc_number):
            return 'bankgiro'
        else:
            return super(ResPartnerBank, self).retrieve_acc_type(acc_number)

    @api.constrains('acc_number')
    def acc_number_constrains(self):
        for record in self:
            if record.acc_type in ['plusgiro', 'bankgiro']:
                if not mod10r_se(record.acc_number):
                    acc_type_values = {elem[0]: elem[1] for elem in self._fields['acc_type']._description_selection(self.env)}
                    raise ValidationError(_('The %s account is not correct.') % (acc_type_values.get(record.acc_type)))


def mod10r_se(number):
    digits = [int(d) for d in re.sub(r'\D', '', number)]
    even_digitsum = sum(x if x < 5 else x - 9 for x in digits[::2])
    return 0 == sum(digits, even_digitsum) % 10
