# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, SUPERUSER_ID


class ImLivechatChannel(models.Model):
    _inherit = 'im_livechat.channel'

    def get_livechat_info(self):
        res = super(ImLivechatChannel, self).get_livechat_info()
        has_generate_lead_group = self.with_user(SUPERUSER_ID).env['res.users'].has_group('crm_livechat.group_generate_lead')
        if has_generate_lead_group:
            res['options']['generate_lead'] = has_generate_lead_group
        return res
