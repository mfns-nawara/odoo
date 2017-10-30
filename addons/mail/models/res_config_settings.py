# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime

from werkzeug import urls

from odoo import api, fields, models, tools, _


class ResConfigSettings(models.TransientModel):
    """ Inherit the base settings to add a counter of failed email + configure
    the alias domain. """
    _inherit = 'res.config.settings'

    fail_counter = fields.Integer('Fail Mail', readonly=True)
    alias_domain = fields.Char('Alias Domain', help="If you have setup a catch-all email domain redirected to "
                               "the Odoo server, enter the domain name here.")
    catchall_name = fields.Char('Reply-to Catchall', help="When a contact replies to an email sent from Odoo, the default reply-to address is this generic address. This is used to route the message to the right discussion thread in Odoo and to the inbox of all its followers. The reply-to address can be also be changed for specific emails from the configuration of the email templates.")
    catchall_domain = fields.Char(string="Catchall Domain", related='alias_domain')

    @api.onchange('alias_domain')
    def _onchange_alias_domain(self):
        warning = {}
        result = {}
        if self.default_external_email_server:
            if self.alias_domain:
                warning = {
                    'title': _('Warning!'),
                    'message': _('Please make sure the address "%s@%s" is correctly set in your email server Otherwise you won`t receive any email reply in Odoo' % (self.catchall_name, self.alias_domain)),
                }
        if warning:
            result['warning'] = warning
        return result

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        IrConfigParameter = self.env["ir.config_parameter"]

        previous_date = datetime.datetime.now() - datetime.timedelta(days=30)

        alias_domain = IrConfigParameter.get_param("mail.catchall.domain", default=None)
        catchall_name = IrConfigParameter.get_param("mail.catchall.alias", default='catchall')
        if alias_domain is None:
            domain = IrConfigParameter.get_param("web.base.url")
            try:
                alias_domain = urls.url_parse(domain).host
            except Exception:
                pass

        res.update(
            fail_counter=self.env['mail.mail'].sudo().search_count([
                ('date', '>=', previous_date.strftime(tools.DEFAULT_SERVER_DATETIME_FORMAT)),
                ('state', '=', 'exception')]),
            alias_domain=alias_domain or False,
            catchall_name=catchall_name

        )

        return res

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        IrConfigParameter = self.env["ir.config_parameter"]
        IrConfigParameter.set_param("mail.catchall.domain", self.alias_domain or '')
        IrConfigParameter.set_param("mail.catchall.alias", self.catchall_name)
