# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class ResPartner(models.Model):
    _inherit = "res.partner"

    orgnumber = fields.Char('Organisational Number')

    @api.onchange('orgnumber')
    def onchnage_orgnumber(self):
        def _check_orgnumber(orgnumber):
            digits = [int(d) for d in re.sub(r'\D', '', orgnumber)][-10:]
            if len(digits) != 10:
                return False
            even_digitsum = sum(x if x < 5 else x - 9 for x in digits[::2])
            return 0 == sum(digits, even_digitsum) % 10
        if self.orgnumber:
            if _check_orgnumber(self.orgnumber):
                self.vat = 'SE' + self.orgnumber + '01'
            else:
                raise ValidationError('Organisational number is invalid.')
