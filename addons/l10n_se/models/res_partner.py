# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    orgnumber = fields.Char('Organisational Number', compute="compute_orgnumber")

    @api.model
    def compute_orgnumber(self):
        orgnumber = ""
        if self.vat and len(re.sub(r'\D', '', self.vat[2:-2])) == 10 and self.country_id.code == 'SE':
            orgnumber = self.vat[2:-2]
        self.orgnumber = orgnumber
