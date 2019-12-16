# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import base64
import re
import requests

from lxml import html

from odoo import api, fields, models, tools, _
from odoo.exceptions import ValidationError, Warning

from odoo.addons.website.tools import get_video_embed_code
from werkzeug import urls

class SurveyQuestionImage(models.Model):
    _name = 'survey.question.image'
    _description = "Survey Question Media"
    _inherit = ['image.mixin']
    _order = 'sequence, id'

    name = fields.Char("Image Name", required=True)
    sequence = fields.Integer(default=10, index=True)

    image_1920 = fields.Image(required=True)
    video_url = fields.Char('Youtube Video URL', help='URL of a video for showcasing your question.')
    embed_code = fields.Char(compute="_compute_embed_code")

    survey_question_id = fields.Many2one('survey.question', ondelete="cascade")

 
    @api.depends('video_url')
    def _compute_embed_code(self):
        for image in self:
            image.embed_code = get_video_embed_code(image.video_url)

    @api.constrains('video_url')
    def _check_valid_video_url(self):
        for image in self:
            if image.video_url and not image.embed_code:
                raise ValidationError(_("Provided video URL for '%s' is not valid. Please enter a valid video URL.") % image.name)

    @api.onchange('video_url')
    def _autofill_after_video(self):
        # url enter -> get image preview in image_1920 + get title video and actualise the name only if it was empty
        if self.video_url:
            res = self._parse_document_url(self.video_url)
            if res is not None and res.get('error'):
                raise Warning(_('Please enter valid Youtube URL'))

        else:
            self.name = ""
            self.image_1920 = None

    def _find_document_data_from_url(self, url):
        url_obj = urls.url_parse(url)
        if url_obj.ascii_host == 'youtu.be':
            return ('youtube', url_obj.path[1:] if url_obj.path else False)
        elif url_obj.ascii_host in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
            v_query_value = url_obj.decode_query().get('v')
            if v_query_value:
                return ('youtube', v_query_value)
            split_path = url_obj.path.split('/')
            if len(split_path) >= 3 and split_path[1] in ('v', 'embed'):
                return ('youtube', split_path[2])

        return (None, False)

    def _parse_document_url(self, url, only_preview_fields=False):
        document_source, document_id = self._find_document_data_from_url(url)
        if document_source and hasattr(self, '_parse_%s_document' % document_source):
            return getattr(self, '_parse_%s_document' % document_source)(document_id, url, only_preview_fields)
        return {'error': _('Unknown document')}

    def _parse_youtube_document(self, document_id, url, only_preview_fields):
        url_html = html.fromstring(requests.get(url, timeout=3).content)
        image_url = 'http://i4.ytimg.com/vi/' + document_id + '/default.jpg'
        
        video_title = url_html.xpath("//span[@id='eow-title']/@title")
        if len(video_title) < 1:
            return {'error': _('Unknown document')}
        self.name = video_title[0]
        self.image_1920 = base64.b64encode(requests.get(image_url, timeout=3, stream=True).raw.read())
