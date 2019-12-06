# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class UtmCampaign(models.Model):
    _inherit = 'utm.campaign'

    # override
    def merge_utm_campaigns(self, name=False, user_id=False, stage_id=False, tag_ids=False):
        """
            After merge the campaigns, redirect the hr.applicant records that link to old campaigns to the new merged campaign.
        """
        merged_campaign, deactived_campaign_ids = super(UtmCampaign, self).merge_utm_campaigns(name, user_id, stage_id, tag_ids)
        hr_applicant_to_redirect = self.env['hr.applicant'].search([('campaign_id.id', 'in', deactived_campaign_ids)])
        hr_applicant_to_redirect.mapped(lambda r: r.write({'campaign_id': merged_campaign}))
        return merged_campaign, deactived_campaign_ids