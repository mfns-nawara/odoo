# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class ResPartner(models.Model):
    _inherit = "res.partner"

    orgnumber = fields.Char('Organisational Number', compute="compute_orgnumber")

    @api.model
    def compute_orgnumber(self):
        if self.vat:
            if len(re.sub(r'\D', '', self.vat[2:-2])) == 10 and mod10r_se(self.vat[2:-2]):
                self.orgnumber = self.vat[2:-2]
            else:
                self.orgnumber = ""
                raise ValidationError('Vat number is invalid.')


def mod10r_se(number):
    n = len(number)
    digits = [int(d) for d in re.sub(r'\D', '', number)][-n:]
    even_digitsum = sum(x if x < 5 else x - 9 for x in digits[::2])
    return 0 == sum(digits, even_digitsum) % 10
