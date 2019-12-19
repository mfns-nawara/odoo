# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from functools import reduce

from odoo import fields, models, api, SUPERUSER_ID, _
from odoo.exceptions import UserError

class UtmMedium(models.Model):
    # OLD crm.case.channel
    _name = 'utm.medium'
    _description = 'UTM Medium'
    _order = 'name'

    name = fields.Char(string='Medium Name', required=True)
    active = fields.Boolean(default=True)


class UtmCampaign(models.Model):
    # OLD crm.case.resource.type
    _name = 'utm.campaign'
    _description = 'UTM Campaign'

    name = fields.Char(string='Campaign Name', required=True, translate=True)

    user_id = fields.Many2one(
        'res.users', string='Responsible',
        required=True, default=lambda self: self.env.uid)
    stage_id = fields.Many2one('utm.stage', string='Stage', ondelete='restrict', required=True,
        default=lambda self: self.env['utm.stage'].search([], limit=1),
        group_expand='_group_expand_stage_ids')
    tag_ids = fields.Many2many(
        'utm.tag', 'utm_tag_rel',
        'tag_id', 'campaign_id', string='Tags')

    is_website = fields.Boolean(default=False, help="Allows us to filter relevant Campaign")
    color = fields.Integer(string='Color Index')

    # After merged with other utm campaign, unneeded one should be deactived, and it should refer to 
    # the new campaign to transfer statistics collected after merge to the new one.
    active = fields.Boolean(default=True)
    reference_utm_campaign_id = fields.Many2one('utm.campaign', string="Merged Into Campaign", readonly=True)

    @api.model
    def _group_expand_stage_ids(self, stages, domain, order):
        """ Read group customization in order to display all the stages in the
            kanban view, even if they are empty
        """
        stage_ids = stages._search([], order=order, access_rights_uid=SUPERUSER_ID)
        return stages.browse(stage_ids)

    def _merge_utm_campaigns(self, campaign=False, name=False, user_id=False, stage_id=False, tag_ids=False):
        if len(self.ids) <= 1:
            raise UserError(_('Please select more than one campaign from the list.'))
        if not all(r.active for r in self):
            raise UserError(_('Only active campaigns can be merged.'))
        if campaign and campaign not in self:
            raise UserError(_('Kept campaign should be one of the merged campaign.'))

        merged_campaign = campaign or self[0]

        merged_data = self._merge_data()
        if name:
            merged_data['name'] = name
        if user_id:
            merged_data['user_id'] = user_id
        if stage_id:
            merged_data['stage_id'] = stage_id
        if tag_ids:
            merged_data['tag_ids'] = tag_ids
        merged_campaign.write(merged_data)

        # deactive uneeded campaigns, set reference to the merged campaign, and update reference of other campaigns if the reference is deactived
        deactived_campaigns = self - merged_campaign
        deactived_campaigns.write({'active': False, 'reference_utm_campaign_id': merged_campaign.id})
        self.search([('reference_utm_campaign_id', 'in', deactived_campaigns.ids)]).write({
            'reference_utm_campaign_id': merged_campaign.id
        })

        self._redirect_all_to_merged_campaign(merged_campaign, deactived_campaigns)

        return merged_campaign, deactived_campaigns

    def _redirect_all_to_merged_campaign(self, merged_campaign, deactived_campaigns):
        for field in self.env['ir.model.fields'].search([('ttype', '=', 'many2one'), ('relation', '=', 'utm.campaign')]):
            if not field.model_id.transient:
                model = self.env[field.model]
                if not field.related and model._auto and model._name not in self._get_modules_to_ignore():
                    self._redirect_to_merged_campaign(model._name, field.name, merged_campaign, deactived_campaigns)

    @api.model
    def _redirect_to_merged_campaign(self, model_name, field_name, merged_campaign, deactived_campaigns):
        model = self.env[model_name]
        record_to_redirect = model.search([(field_name, 'in', deactived_campaigns.ids)])
        for record in record_to_redirect:
            record.sudo().write({field_name: merged_campaign})

    def _merge_data(self):
        """ Prepare campaign data into a dictionary for merging:
                - user_id: choose the first one
                - stage_id: choose the first stage
                - tag_ids: union all tags in every campaign
                - is_website: true if at least one of the record is true
        """
        data = {}
        data['user_id'] = self[0].user_id
        data['stage_id'] = self.env['utm.stage'].search([], limit=1)
        data['tag_ids'] = reduce(lambda a, b: a | b, (r.tag_ids for r in self))
        data['is_website'] = any(r.is_website for r in self)
        return data

    def _redirect_utm_campaign_view(self):
        self.ensure_one()
        return {
            'name': 'ok',
            'view_mode': 'form',
            'res_model': 'utm.campaign',
            'res_id': self.id,
            'view_id': False,
            'type': 'ir.actions.act_window'
        }

    def _get_modules_to_ignore(self):
        # when module need manully take care of the campaign merge, ignore it
        return [self._name]

class UtmSource(models.Model):
    _name = 'utm.source'
    _description = 'UTM Source'

    name = fields.Char(string='Source Name', required=True, translate=True)

class UtmStage(models.Model):
    """Stage for utm campaigns. """
    _name = 'utm.stage'
    _description = 'Campaign Stage'
    _order = 'sequence'

    name = fields.Char(required=True, translate=True)
    sequence = fields.Integer()

class UtmTag(models.Model):
    """Model of categories of utm campaigns, i.e. marketing, newsletter, ... """
    _name = 'utm.tag'
    _description = 'UTM Tag'
    _order = 'name'

    name = fields.Char(required=True, translate=True)
    color = fields.Integer(string='Color Index')

    _sql_constraints = [
            ('name_uniq', 'unique (name)', "Tag name already exists !"),
    ]
