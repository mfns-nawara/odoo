# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http, tools, SUPERUSER_ID
from odoo.http import request

from odoo.addons.im_livechat.controllers.main import LivechatController


class LivechatController(LivechatController):

    @http.route('/im_livechat/load_templates', type='json', auth='none', cors="*")
    def load_templates(self, **kwargs):
        res = super(LivechatController, self).load_templates(**kwargs)
        if request.env['res.users'].with_user(SUPERUSER_ID).has_group('crm_livechat.group_generate_lead'):
            res.append(tools.file_open('crm_livechat/static/src/xml/im_livechat.xml', 'rb').read())
        return res


class CrmController(http.Controller):

    @http.route('/livechat/generate_lead', type='json', auth="public")
    def generate_lead(self, name=False, email_from=False, content=False, lead_id=False, channel_uuid=False):
        channel = request.env['mail.channel'].with_user(SUPERUSER_ID).search([('uuid', '=', channel_uuid)])
        if channel:
            return channel.generate_lead(name=name, email_from=email_from, content=content, lead_id=lead_id)
