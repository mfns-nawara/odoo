# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class MergeUtmCampaign(models.TransientModel):
    """
        Merger UTM campaigns together.
    """

    _name = 'utm.merge.utm.campaign'
    _description = 'Merge UTM Campaigns'

    @api.model
    def default_get(self, fields):
        """ Use active_ids from the context to fetch the UTM campaign to merge.
        """
        record_ids = self._context.get('active_ids')
        result = super(MergeUtmCampaign, self).default_get(fields)
        result['utm_campaign_ids'] = record_ids
        return result

    campaign_id = fields.Many2one('utm.campaign', string='Keeped Campaign')
    name = fields.Char(string='Campaign Name', translate=True)
    user_id = fields.Many2one('res.users', string='Responsible')
    stage_id = fields.Many2one('utm.stage', string='Stage', ondelete='restrict')
    tag_ids = fields.Many2many('utm.tag', string='Tags')
    utm_campaign_ids = fields.Many2many('utm.campaign', 'merge_utm_campaign_rel', 'merge_id', 'utm_campaign_id', string='UTM Campaigns')

    @api.onchange('campaign_id')
    def _set_default(self):
        self.name = self.campaign_id.name
        self.user_id = self.campaign_id.user_id
        self.stage_id = self.campaign_id.stage_id
        self.tag_ids = self.campaign_id.tag_ids

    def action_merge(self):
        self.ensure_one()
        merged_campaign, deactived_campaigns = self.utm_campaign_ids._merge_utm_campaigns(
            self.campaign_id, 
            self.name, 
            self.user_id, 
            self.stage_id, 
            self.tag_ids)
        return merged_campaign._redirect_utm_campaign_view()
