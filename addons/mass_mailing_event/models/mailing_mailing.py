from odoo import models, api, _
from odoo.exceptions import UserError


class MassMailingCampaign(models.Model):
    _inherit = "mailing.mailing"

    @api.onchange('mailing_model_real', 'contact_list_ids')
    def _onchange_model_and_list(self):
        # TDE FIXME: whuuut ?
        result = super(MassMailingCampaign, self)._onchange_model_and_list()
        if self.mailing_model_name == 'event.registration' and self.mailing_domain == '[]':
            self.mailing_domain = self.env.context.get('default_mailing_domain', '[]')
        return result

    @api.constrains('mailing_model_id', 'mailing_domain')
    def _check_domain_for_event_registration(self):
        for mass_mailing in self:
            if mass_mailing.mailing_model_name == 'event.registration' and 'event_id' not in mass_mailing.mailing_domain:
                raise UserError(_('You must filter on the event to contact attendee'))
