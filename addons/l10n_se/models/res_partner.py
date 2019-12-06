# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class ResPartner(models.Model):
    _inherit = "res.partner"

    orgnumber = fields.Char('Organisational Number', compute="compute_orgnumber")

    @api.constrains('vat')
    def check_vat_l10n_se(self):
        for partner in self:
            if partner.vat and not mod10r_se(partner.vat[2:-2]):
                raise ValidationError(_('The VAT number %s for partner %s does not seem to be valid.') % (self.vat, self.name))

    @api.model
    def compute_orgnumber(self):
        orgnumber = ""
        if self.vat and len(re.sub(r'\D', '', self.vat[2:-2])) == 10:
            orgnumber = self.vat[2:-2]
        self.orgnumber = orgnumber


def mod10r_se(number):
    digits = [int(d) for d in re.sub(r'\D', '', number)]
    even_digitsum = sum(x if x < 5 else x - 9 for x in digits[::2])
    return 0 == sum(digits, even_digitsum) % 10
