# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api


class EventTypeMail(models.Model):
    _inherit = 'event.type.mail'

    notification_type = fields.Selection(selection_add=[('sms', 'SMS')])
    sms_template_id = fields.Many2one(
        'sms.template', string='SMS Template',
        domain=[('model', '=', 'event.registration')], ondelete='restrict',
        help='This field contains the template of the SMS that will be automatically sent')

    def _get_event_mail_values(self):
        """
        When changing the ``event.type``, we will automatically create ``event.mail``
        This function returns the value for the ``event.mail`` that will be created
        """
        self.ensure_one()
        values = super()._get_event_mail_values()
        if self.sms_template_id:
            values.update({'sms_template_id': self.sms_template_id})
        return values


class EventMailScheduler(models.Model):
    _inherit = 'event.mail'

    notification_type = fields.Selection(selection_add=[('sms', 'SMS')])
    sms_template_id = fields.Many2one(
        'sms.template', string='SMS Template',
        domain=[('model', '=', 'event.registration')], ondelete='restrict',
        help='This field contains the template of the SMS that will be automatically sent')

    def execute(self):
        for mail in self:
            now = fields.Datetime.now()
            if mail.interval_type != 'after_sub':
                # Do not send SMS if the communication was scheduled before the event but the event is over
                if not mail.mail_sent and (mail.interval_type != 'before_event' or mail.event_id.date_end > now) and mail.notification_type == 'sms' and mail.sms_template_id:
                    self.env['event.registration']._message_sms_schedule_mass(
                        template=mail.sms_template_id,
                        active_domain=[('event_id', '=', mail.event_id.id), ('state', '!=', 'cancel')],
                        mass_keep_log=True
                    )
                    mail.write({'mail_sent': True})
        return super(EventMailScheduler, self).execute()

    @api.constrains('notification_type')
    def _check_notification_type(self):
        super()._check_notification_type()
        for event_type_mail in self:
            if event_type_mail.notification_type != 'sms':
                event_type_mail.sms_template_id = False


class EventMailRegistration(models.Model):
    _inherit = 'event.mail.registration'

    def execute(self):
        for record in self:
            if record.registration_id.state in ['open', 'done'] and not record.mail_sent and record.scheduler_id.notification_type == 'sms':
                record.registration_id._message_sms_schedule_mass(template=record.scheduler_id.sms_template_id, mass_keep_log=True)
                record.write({'mail_sent': True})
        return super(EventMailRegistration, self).execute()
