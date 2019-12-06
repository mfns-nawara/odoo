# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, SUPERUSER_ID


class UtmCampaign(models.Model):
    _inherit = ['utm.campaign']
    _description = 'UTM Campaign'

    click_count = fields.Integer(string="Number of clicks generated by the campaign", compute="_compute_clicks_count")

    def _compute_clicks_count(self):
        click_data = self.env['link.tracker.click'].read_group(
            [('campaign_id', 'in', self.ids)],
            ['campaign_id'], ['campaign_id'])

        mapped_data = {datum['campaign_id'][0]: datum['campaign_id_count'] for datum in click_data}

        for campaign in self:
            campaign.click_count = mapped_data.get(campaign.id, 0)
    
    # override
    def merge_utm_campaigns(self, name=False, user_id=False, stage_id=False, tag_ids=False):
        """
            After merge the campaigns, redirect the mailing_mail that link to old campaigns to the new merged campaign.
        """
        merged_campaign, deactived_campaign_ids = super(UtmCampaign, self).merge_utm_campaigns(name, user_id, stage_id, tag_ids)
        link_tracker_ids = self.env['link.tracker'].search([('campaign_id.id', 'in', [merged_campaign.id] + deactived_campaign_ids)])
        link_tracker_ids.clean_duplicates()
        # redirect click
        click_to_redirect = self.env["link.tracker.click"].search([('campaign_id.id', 'in', deactived_campaign_ids)])
        click_to_redirect.mapped(lambda r: r.write({'campaign_id': merged_campaign}))
        # redirect campaign
        link_tracker_to_redirect = self.env["link.tracker"].search([('campaign_id.id', 'in', deactived_campaign_ids)])
        link_tracker_to_redirect.mapped(lambda r: r.write({'campaign_id': merged_campaign}))
        return merged_campaign, deactived_campaign_ids
