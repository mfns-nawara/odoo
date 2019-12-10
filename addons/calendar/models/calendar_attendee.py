# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import uuid
import base64
from collections import defaultdict

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class Attendee(models.Model):
    """ Calendar Attendee Information """

    _name = 'calendar.attendee'
    _rec_name = 'common_name'
    _description = 'Calendar Attendee Information'

    def _default_access_token(self):
        return uuid.uuid4().hex

    STATE_SELECTION = [
        ('needsAction', 'Needs Action'),
        ('tentative', 'Uncertain'),
        ('declined', 'Declined'),
        ('accepted', 'Accepted'),
    ]

    state = fields.Selection(STATE_SELECTION, string='Status', readonly=True, default='needsAction',
                             help="Status of the attendee's participation")
    common_name = fields.Char('Common name', compute='_compute_common_name', store=True)
    partner_id = fields.Many2one('res.partner', 'Contact', required=True, readonly=True)
    email = fields.Char('Email', related='partner_id.email', help="Email of Invited Person")
    availability = fields.Selection([('free', 'Free'), ('busy', 'Busy')], 'Free/Busy', readonly=True)
    access_token = fields.Char('Invitation Token', default=_default_access_token)
    event_id = fields.Many2one('calendar.event', 'Meeting linked', required=True, ondelete='cascade')

    @api.depends('partner_id', 'partner_id.name', 'email')
    def _compute_common_name(self):
        for attendee in self:
            attendee.common_name = attendee.partner_id.name or attendee.email

    @api.model_create_multi
    def create(self, vals_list):
        for values in vals_list:
            if values.get('partner_id') == self.env.user.partner_id.id:
                values['state'] = 'accepted'
            if not values.get("email") and values.get("common_name"):
                common_nameval = values.get("common_name").split(':')
                email = [x for x in common_nameval if '@' in x] # TODO JEM : should be refactored
                values['email'] = email and email[0] or ''
                values['common_name'] = values.get("common_name")
        attendees = super(Attendee, self).create(vals_list)
        attendees.filtered(lambda a: a.partner_id != self.env.user.partner_id)._send_mail_to_attendees('calendar.calendar_template_meeting_invitation')
        attendees._subscribe_partner()
        return attendees

    def unlink(self):
        self._unsubscribe_partner()
        return super().unlink()

    def _subscribe_partner(self):
        for event in self.event_id:
            partners = (event.attendee_ids & self).partner_id - event.message_partner_ids
            partners -= self.env.user.partner_id  # current user is automatically added as followers, don't add it twice.
            event.message_subscribe(partner_ids=partners.ids)

    def _unsubscribe_partner(self):
        for event in self.event_id:
            partners = (event.attendee_ids & self).partner_id & event.message_partner_ids
            event.message_unsubscribe(partner_ids=partners.ids)

    @api.returns('self', lambda value: value.id)
    def copy(self, default=None):
        raise UserError(_('You cannot duplicate a calendar attendee.'))

    def _send_mail_to_attendees(self, template_xmlid, force_send=False, force_event_id=None):
        """ Send mail for event invitation to event attendees.
            :param template_xmlid: xml id of the email template to use to send the invitation
            :param force_send: if set to True, the mail(s) will be sent immediately (instead of the next queue processing)
        """
        res = False

        if self.env['ir.config_parameter'].sudo().get_param('calendar.block_mail') or self._context.get("no_mail_to_attendees"):
            return res

        calendar_view = self.env.ref('calendar.view_calendar_event_calendar')
        invitation_template = self.env.ref(template_xmlid)

        # get ics file for all meetings
        ics_files = force_event_id._get_ics_file() if force_event_id else self.mapped('event_id')._get_ics_file()

        # prepare rendering context for mail template
        colors = {
            'needsAction': 'grey',
            'accepted': 'green',
            'tentative': '#FFFF00',
            'declined': 'red'
        }
        rendering_context = dict(self._context)
        rendering_context.update({
            'color': colors,
            'action_id': self.env['ir.actions.act_window'].search([('view_id', '=', calendar_view.id)], limit=1).id,
            'dbname': self._cr.dbname,
            'base_url': self.env['ir.config_parameter'].sudo().get_param('web.base.url', default='http://localhost:8069'),
            'force_event_id': force_event_id,
        })
        invitation_template = invitation_template.with_context(rendering_context)

        # send email with attachments

        # events_by_recurrence = defaultdict(lambda: self.browse())
        # notify = self.browse()
        # for attendee in self:
        #     if attendee.event_id.recurrence_id:
        #         events_by_recurrence[attendee.partner_id, attendee.event_id.recurrence_id] |= attendee
        #     else:
        #         notify |= attendee
        # notify |= {attendee for attendee in}
        for attendee in self:
            if attendee.email:
                # FIXME: is ics_file text or bytes?
                event_id = force_event_id.id if force_event_id else attendee.event_id.id
                ics_file = ics_files.get(event_id)

                if ics_file:
                    attachment_values = [
                        (0, 0, {'name': 'invitation.ics',
                                'mimetype': 'text/calendar',
                                'datas': base64.b64encode(ics_file)})
                    ]
                body = self.env['mail.template']._render_template(
                    invitation_template.body_html,
                    self._name,
                    attendee.id)
                subject = self.env['mail.template']._render_template(
                    invitation_template.subject,
                    self._name,
                    attendee.id)
                attendee.event_id.message_notify(
                    body=body,
                    subject=subject,
                    partner_ids=attendee.partner_id.ids,
                    email_layout_xmlid='mail.mail_notification_light',
                    attachment_ids=attachment_values,
                    force_send=force_send)

    def do_tentative(self):
        """ Makes event invitation as Tentative. """
        return self.write({'state': 'tentative'})

    def do_accept(self):
        """ Marks event invitation as Accepted. """
        result = self.write({'state': 'accepted'})
        for attendee in self:
            if attendee.event_id:
                attendee.event_id.message_post(body=_("%s has accepted invitation") % (attendee.common_name), subtype_xmlid="calendar.subtype_invitation")
        return result

    def do_decline(self):
        """ Marks event invitation as Declined. """
        res = self.write({'state': 'declined'})
        for attendee in self:
            if attendee.event_id:
                attendee.event_id.message_post(body=_("%s has declined invitation") % (attendee.common_name), subtype_xmlid="calendar.subtype_invitation")
        return res

