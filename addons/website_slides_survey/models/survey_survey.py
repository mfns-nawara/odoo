# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


class Survey(models.Model):
    _inherit = 'survey.survey'
    slide_ids = fields.One2many('slide.slide', 'survey_id', 'Certification')
    slide_channel_ids = fields.One2many('slide.channel', compute='_compute_slide_channel_ids')
    courses_count = fields.Integer("Linked Courses", compute="_compute_slide_channel_ids")

    @api.depends('slide_ids')
    def _compute_slide_channel_ids(self):
        for survey in self:
            if survey.slide_ids:
                survey.slide_channel_ids = survey.slide_ids.mapped('channel_id')
            else:
                survey.slide_channel_ids = self.env['slide.channel']
            survey.courses_count = len(survey.slide_channel_ids)

    # ---------------------------------------------------------
    # Actions
    # ---------------------------------------------------------

    def action_survey_view_courses(self):
        action_vals = {
            'name': 'Certification Courses',
            'type': 'ir.actions.act_window',
            'res_model': 'slide.channel',
            'view_ids': [self.env.ref('website_slides.slide_channel_view_tree').id,
                         self.env.ref('website_slides.view_slide_channel_form').id],
        }
        if self.courses_count == 1:
            action_vals.update({'view_mode': 'form',
                                'res_id': self.slide_channel_ids[0].id})
        else:
            action_vals.update({'view_mode':'tree,form',
                                'domain': [('id', 'in', self.slide_channel_ids.ids)]})
        return action_vals

    # ---------------------------------------------------------
    # Business
    # ---------------------------------------------------------

    def _check_answer_creation(self, user, partner, email, test_entry=False, check_attempts=True, invite_token=False):
        """ Overridden to allow website_slides_officer to test certifications. """
        self.ensure_one()
        if test_entry and user.has_group('website_slides.group_website_slides_officer'):
            return True

        return super(Survey, self)._check_answer_creation(user, partner, email, test_entry=test_entry, check_attempts=check_attempts, invite_token=invite_token)

    def _prepare_challenge_category(self):
        slide_survey = self.env['slide.slide'].search([('survey_id', '=', self.id)])
        return 'slides' if slide_survey else 'certification'
