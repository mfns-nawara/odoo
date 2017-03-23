# -*- coding: utf-8 -*-

from datetime import datetime, timedelta

from odoo import api, fields, models, SUPERUSER_ID, _
from odoo.exceptions import UserError
from odoo.addons.calendar.models.calendar import VIRTUALID_DATETIME_FORMAT

import pytz


class MaintenanceStage(models.Model):
    """ Model for case stages. This models the main stages of a Maintenance Request management flow. """

    _name = 'maintenance.stage'
    _description = 'Maintenance Stage'
    _order = 'sequence, id'

    name = fields.Char('Name', required=True, translate=True)
    sequence = fields.Integer('Sequence', default=20)
    fold = fields.Boolean('Folded in Maintenance Pipe')
    done = fields.Boolean('Request Done')


class MaintenanceEquipmentCategory(models.Model):
    _name = 'maintenance.equipment.category'
    _inherit = ['mail.alias.mixin', 'mail.thread']
    _description = 'Asset Category'

    @api.one
    @api.depends('equipment_ids')
    def _compute_fold(self):
        self.fold = False if self.equipment_count else True

    name = fields.Char('Category Name', required=True, translate=True)
    technician_user_id = fields.Many2one('res.users', 'Responsible', track_visibility='onchange', default=lambda self: self.env.uid, oldname='user_id')
    color = fields.Integer('Color Index')
    note = fields.Text('Comments', translate=True)
    equipment_ids = fields.One2many('maintenance.equipment', 'category_id', string='Equipments', copy=False)
    equipment_count = fields.Integer(string="Equipment", compute='_compute_equipment_count')
    maintenance_ids = fields.One2many('maintenance.request', 'category_id', copy=False)
    maintenance_count = fields.Integer(string="Maintenance", compute='_compute_maintenance_count')
    alias_id = fields.Many2one(
        'mail.alias', 'Alias', ondelete='restrict', required=True,
        help="Email alias for this equipment category. New emails will automatically "
        "create new maintenance request for this equipment category.")
    fold = fields.Boolean(string='Folded in Maintenance Pipe', compute='_compute_fold', store=True)

    @api.multi
    def _compute_equipment_count(self):
        equipment_data = self.env['maintenance.equipment'].read_group([('category_id', 'in', self.ids)], ['category_id'], ['category_id'])
        mapped_data = dict([(m['category_id'][0], m['category_id_count']) for m in equipment_data])
        for category in self:
            category.equipment_count = mapped_data.get(category.id, 0)

    @api.multi
    def _compute_maintenance_count(self):
        maintenance_data = self.env['maintenance.request'].read_group([('category_id', 'in', self.ids)], ['category_id'], ['category_id'])
        mapped_data = dict([(m['category_id'][0], m['category_id_count']) for m in maintenance_data])
        for category in self:
            category.maintenance_count = mapped_data.get(category.id, 0)

    @api.model
    def create(self, vals):
        self = self.with_context(alias_model_name='maintenance.request', alias_parent_model_name=self._name)
        if not vals.get('alias_name'):
            vals['alias_name'] = vals.get('name')
        category_id = super(MaintenanceEquipmentCategory, self).create(vals)
        category_id.alias_id.write({'alias_parent_thread_id': category_id.id, 'alias_defaults': {'category_id': category_id.id}})
        return category_id

    @api.multi
    def unlink(self):
        MailAlias = self.env['mail.alias']
        for category in self:
            if category.equipment_ids or category.maintenance_ids:
                raise UserError(_("You cannot delete an equipment category containing equipments or maintenance requests."))
            MailAlias += category.alias_id
        res = super(MaintenanceEquipmentCategory, self).unlink()
        MailAlias.unlink()
        return res

    def get_alias_model_name(self, vals):
        return vals.get('alias_model', 'maintenance.equipment')

    def get_alias_values(self):
        values = super(MaintenanceEquipmentCategory, self).get_alias_values()
        values['alias_defaults'] = {'category_id': self.id}
        return values


class MaintenanceEquipment(models.Model):
    _name = 'maintenance.equipment'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Equipment'

    @api.multi
    def _track_subtype(self, init_values):
        self.ensure_one()
        if 'owner_user_id' in init_values and self.owner_user_id:
            return 'maintenance.mt_mat_assign'
        return super(MaintenanceEquipment, self)._track_subtype(init_values)

    @api.multi
    def name_get(self):
        result = []
        for record in self:
            if record.name and record.serial_no:
                result.append((record.id, record.name + '/' + record.serial_no))
            if record.name and not record.serial_no:
                result.append((record.id, record.name))
        return result

    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        args = args or []
        recs = self.browse()
        if name:
            recs = self.search([('name', '=', name)] + args, limit=limit)
        if not recs:
            recs = self.search([('name', operator, name)] + args, limit=limit)
        return recs.name_get()

    name = fields.Char('Equipment Name', required=True, translate=True)
    active = fields.Boolean(default=True)
    technician_user_id = fields.Many2one('res.users', string='Technician', track_visibility='onchange', oldname='user_id')
    owner_user_id = fields.Many2one('res.users', string='Owner', track_visibility='onchange')
    category_id = fields.Many2one('maintenance.equipment.category', string='Equipment Category',
                                  track_visibility='onchange', group_expand='_read_group_category_ids')
    partner_id = fields.Many2one('res.partner', string='Vendor', domain="[('supplier', '=', 1)]")
    partner_ref = fields.Char('Vendor Reference')
    location = fields.Char('Location')
    model = fields.Char('Model')
    serial_no = fields.Char('Serial Number', copy=False)
    assign_date = fields.Date('Assigned Date', track_visibility='onchange')
    cost = fields.Float('Cost')
    note = fields.Text('Note')
    warranty = fields.Date('Warranty')
    color = fields.Integer('Color Index')
    scrap_date = fields.Date('Scrap Date')
    maintenance_ids = fields.One2many('maintenance.request', 'equipment_id')
    maintenance_count = fields.Integer(compute='_compute_maintenance_count', string="Maintenance", store=True)
    maintenance_open_count = fields.Integer(compute='_compute_maintenance_count', string="Current Maintenance", store=True)
    next_action_date = fields.Date(compute='_compute_next_maintenance', string='Date of the next preventive maintenance')
    maintenance_team_id = fields.Many2one('maintenance.team', string='Maintenance Team')

    preventive_maintenance_request_id = fields.Many2one('maintenance.request', string='Actual preventive maintenance')
    period = fields.Integer('Days between each preventive maintenance', related='preventive_maintenance_request_id.maintenance_event_id.interval')
    maintenance_duration = fields.Float(help="Maintenance Duration in hours.", related='preventive_maintenance_request_id.maintenance_event_id.duration')
    maintenance_start_date = fields.Datetime('Start date of the maintenance', related='preventive_maintenance_request_id.maintenance_event_id.start')
    maintenance_final_date = fields.Date('End date of the maintenance', related='preventive_maintenance_request_id.maintenance_event_id.final_date')

    @api.one
    def _compute_next_maintenance(self):
        " Give the next maintenance date among all maintenance request linked to this equipment. "
        maintenance_request = self.env['maintenance.request'].search([
            ('equipment_id', '=',  self.id),
            ('stage_id.done', '!=', True),
        ])
        maintenance_request = maintenance_request.filtered(lambda r: r.schedule_date is not False)
        if maintenance_request.exists():
            maintenance_request = maintenance_request.sorted(key=lambda r: r.schedule_date)
            self.next_action_date = maintenance_request[0].schedule_date

    @api.one
    @api.depends('maintenance_ids.stage_id.done', 'maintenance_ids.active')
    def _compute_maintenance_count(self):
        self.maintenance_count = len(self.maintenance_ids)
        self.maintenance_open_count = len(self.maintenance_ids.filtered(lambda x: not x.stage_id.done))

    @api.onchange('category_id')
    def _onchange_category_id(self):
        self.technician_user_id = self.category_id.technician_user_id

    _sql_constraints = [
        ('serial_no', 'unique(serial_no)', "Another asset already exists with this serial number!"),
    ]

    @api.model
    def create(self, vals):
        equipment = super(MaintenanceEquipment, self).create(vals)
        if any(vals.get(k, False) for k in ('period', 'maintenance_duration', 'maintenance_final_date', 'maintenance_start_date')):
            vals = equipment._manage_request_maintenance(vals)
            equipment.preventive_maintenance_request_id = vals['preventive_maintenance_request_id']
        if equipment.owner_user_id:
            equipment.message_subscribe_users(user_ids=[equipment.owner_user_id.id])
        return equipment

    @api.multi
    def write(self, vals):
        if vals.get('owner_user_id'):
            self.message_subscribe_users(user_ids=[vals['owner_user_id']])
        if any(k in vals for k in ('period', 'maintenance_duration', 'maintenance_final_date', 'maintenance_start_date')):
            vals = self._manage_request_maintenance(vals)
        # Clean all link between preventive maintenance request and equipment.
        if vals.get('period', True) is False or vals.get('maintenance_start_date', True) is False:
            if self.preventive_maintenance_request_id.maintenance_event_id:
                self.preventive_maintenance_request_id.maintenance_event_id.recurrency = False
            vals['preventive_maintenance_request_id'] = False
        equipment = super(MaintenanceEquipment, self).write(vals)
        return equipment

    @api.multi
    def unlink(self):
        if self.preventive_maintenance_request_id.maintenance_event_id.recurrency:
            self.preventive_maintenance_request_id.maintenance_event_id.recurrency = False
        super(MaintenanceEquipment, self).unlink()

    @api.multi
    def toggle_active(self):
        super(MaintenanceEquipment, self).toggle_active()
        if not self.active:
            if self.preventive_maintenance_request_id.maintenance_event_id.recurrency:
                self.preventive_maintenance_request_id.maintenance_event_id.recurrency = False

    @api.model
    def _read_group_category_ids(self, categories, domain, order):
        """ Read group customization in order to display all the categories in
            the kanban view, even if they are empty.
        """
        category_ids = categories._search([], order=order, access_rights_uid=SUPERUSER_ID)
        return categories.browse(category_ids)

    @api.multi
    def _manage_request_maintenance(self, vals):
        self.ensure_one()
        if not self.preventive_maintenance_request_id.exists():
            request = self.env['maintenance.request'].create({
                'name': _('Preventive Maintenance - %s') % self.name,
                'equipment_id': self.id,
                'category_id': self.category_id.id,
                'maintenance_type': 'preventive',
                'owner_user_id': self.owner_user_id.id,
                'technician_user_id': self.technician_user_id.id,
                'schedule_date': vals.get('maintenance_start_date', self.maintenance_start_date),
                'duration': vals.get('maintenance_duration', self.maintenance_duration),
                'maintenance_team_id': vals.get('maintenance_team_id', self.maintenance_team_id),
            })
            request.maintenance_event_id.write({
                'recurrency': True,
                'end_type': 'end_date',
                'rrule_type': 'daily',
                'interval': vals.get('period', self.period),
                'final_date': vals.get('maintenance_final_date', self.maintenance_final_date),
            })
            vals['preventive_maintenance_request_id'] = request.id
        return vals


class MaintenanceRequest(models.Model):
    _name = 'maintenance.request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Maintenance Requests'
    _order = "id desc"

    @api.returns('self')
    def _default_stage(self):
        return self.env['maintenance.stage'].search([], limit=1)

    @api.multi
    def _track_subtype(self, init_values):
        self.ensure_one()
        if 'stage_id' in init_values and self.stage_id.sequence <= 1:
            return 'maintenance.mt_req_created'
        elif 'stage_id' in init_values and self.stage_id.sequence > 1:
            return 'maintenance.mt_req_status'
        return super(MaintenanceRequest, self)._track_subtype(init_values)

    def _get_default_team_id(self):
        return self.env.ref('maintenance.equipment_team_maintenance', raise_if_not_found=False)

    name = fields.Char('Subjects', required=True)
    description = fields.Text('Description')
    request_date = fields.Date('Request Date', track_visibility='onchange', default=fields.Date.context_today,
                               help="Date requested for the maintenance to happen")
    owner_user_id = fields.Many2one('res.users', string='Created by', default=lambda s: s.env.uid)
    category_id = fields.Many2one('maintenance.equipment.category', related='equipment_id.category_id', string='Category', store=True, readonly=True)
    equipment_id = fields.Many2one('maintenance.equipment', string='Equipment', index=True, ondelete='restrict')
    technician_user_id = fields.Many2one('res.users', string='Owner', track_visibility='onchange', oldname='user_id')
    stage_id = fields.Many2one('maintenance.stage', string='Stage', track_visibility='onchange',
                               group_expand='_read_group_stage_ids', default=_default_stage)
    priority = fields.Selection([('0', 'Very Low'), ('1', 'Low'), ('2', 'Normal'), ('3', 'High')], string='Priority')
    color = fields.Integer('Color Index')
    close_date = fields.Date('Close Date', help="Date the maintenance was finished. ")
    kanban_state = fields.Selection([('normal', 'In Progress'), ('blocked', 'Blocked'), ('done', 'Ready for next stage')],
                                    string='Kanban State', required=True, default='normal', track_visibility='onchange')
    active = fields.Boolean(default=True, help="Set active to false to hide the maintenance request without deleting it.")
    maintenance_type = fields.Selection([('corrective', 'Corrective'), ('preventive', 'Preventive')], string='Maintenance Type', default="corrective")
    maintenance_team_id = fields.Many2one('maintenance.team', string='Team', required=True, default=_get_default_team_id)
    schedule_date_count = fields.Integer(string="Number of Meeting", compute='_compute_count_meeting')

    maintenance_event_id = fields.Many2one('maintenance.event', string='Related Maintenance event')
    schedule_date = fields.Datetime('Scheduled Date', help="Date the maintenance team plans the maintenance.  It should not differ much from the Request Date. ", related='maintenance_event_id.start')
    duration = fields.Float(related='maintenance_event_id.duration', help="Duration in minutes and seconds")

    @api.onchange('equipment_id')
    def onchange_equipment_id(self):
        if self.equipment_id:
            self.technician_user_id = self.equipment_id.technician_user_id if self.equipment_id.technician_user_id else self.equipment_id.category_id.technician_user_id
            self.category_id = self.equipment_id.category_id
            if self.equipment_id.maintenance_team_id:
                self.maintenance_team_id = self.equipment_id.maintenance_team_id.id

    @api.onchange('category_id')
    def onchange_category_id(self):
        if not self.technician_user_id or not self.equipment_id or (self.technician_user_id and not self.equipment_id.technician_user_id):
            self.technician_user_id = self.category_id.technician_user_id

    @api.multi
    def generate_next_request(self):
        """ If the linked maintenance event is recurrent. It will automatically creates a new request for the user.
        """
        if self.maintenance_event_id.exists() and self.maintenance_event_id.recurrency and fields.Datetime.now() < self.maintenance_event_id.final_date:
            timezone = pytz.timezone(self._context.get('tz') or 'UTC')
            now = datetime.now(timezone)
            event_start = pytz.UTC.localize(fields.Datetime.from_string(self.maintenance_event_id.start)).astimezone(timezone)
            for event in self.maintenance_event_id._get_recurrent_date_by_event():
                # Try to find the next maintenance date, we search for a maintenance that has a date greater than the event we finished and the actual date.
                if event > now and event > event_start:
                    # We should get the virtual id of the calendar in order to split it.
                    virtual_id = '%s-%s' % (self.maintenance_event_id.id, event.strftime(VIRTUALID_DATETIME_FORMAT))
                    virtual_event = self.env['maintenance.event'].browse(virtual_id)
                    future_calendar = virtual_event.with_context(create_request=False).get_split_recurring_event()
                    data = {
                        'maintenance_event_id': future_calendar.id,
                        'stage_id': self._default_stage().id,
                        'kanban_state': 'normal',
                    }
                    new_event = self.copy(default=data)
                    if self.equipment_id.preventive_maintenance_request_id == self:
                        self.equipment_id.preventive_maintenance_request_id = new_event.id
                    return new_event

    @api.model
    def create(self, vals):
        # context: no_log, because subtype already handle this
        self = self.with_context(mail_create_nolog=True)
        request = super(MaintenanceRequest, self).create(vals)
        if vals.get('schedule_date') and vals.get('duration') and not vals.get('maintenance_event_id', False):
            request._manage_calendar(vals)
        if request.owner_user_id or request.technician_user_id:
            request._add_followers()
        if request.equipment_id and not request.maintenance_team_id:
            request.maintenance_team_id = request.equipment_id.maintenance_team_id
        return request

    @api.multi
    def write(self, vals):
        # Overridden to reset the kanban_state to normal whenever
        # the stage (stage_id) of the Maintenance Request changes.
        if vals and 'kanban_state' not in vals and 'stage_id' in vals:
            vals['kanban_state'] = 'normal'
        res = super(MaintenanceRequest, self).write(vals)
        if all(k in vals for k in ('schedule_date', 'duration')) and 'maintenance_event_id' not in vals:
            vals = self._manage_calendar(vals)
        if vals.get('owner_user_id') or vals.get('technician_user_id', False):
            self._add_followers()
        if self.stage_id.done and 'stage_id' in vals:
            self.write({'close_date': fields.Date.today()})
            # Should create the next request if linked to a calendar recurring event
            self.generate_next_request()
        return res

    def _add_followers(self):
        for request in self:
            user_ids = (request.owner_user_id + request.technician_user_id).ids
            request.message_subscribe_users(user_ids=user_ids)

    @api.multi
    def cancel_request_and_generate_next(self):
        """ Generate the next request if it exists and delete the event linked to the current request."""
        self.generate_next_request()
        if self.maintenance_event_id.exists():
            self.maintenance_event_id.unlink()

    @api.multi
    def unlink(self):
        for request in self:
            # The only way to remove recurrency should be by the equipment maintenance section.
            request.cancel_request_and_generate_next()
            super(MaintenanceRequest, request).unlink()

    @api.multi
    def toggle_active(self):
        for request in self:
            # The only way to remove recurrency should be by the equipment maintenance section.
            if request.active:
                request.cancel_request_and_generate_next()
            return super(MaintenanceRequest, request).toggle_active()

    @api.model
    def _read_group_stage_ids(self, stages, domain, order):
        """ Read group customization in order to display all the stages in the
            kanban view, even if they are empty
        """
        stage_ids = stages._search([], order=order, access_rights_uid=SUPERUSER_ID)
        return stages.browse(stage_ids)

    def _manage_calendar(self, vals):
        """ Function called in write or create in order to manage informations related to the linked
            maintenance event.
        """
        # update calendar
        start = vals.get('schedule_date', self.schedule_date)
        # The user want to create/modify the linked event.
        if start is not False:
            name = vals.get('name', self.name)
            duration = vals.get('duration', self.duration)
            start = fields.Datetime.from_string(start)
            # Compute the mandatory stop.
            stop = fields.Datetime.to_string(start + timedelta(hours=duration))
            # Create the calendar.
            if not self.maintenance_event_id.exists():
                maintenance_event = self.env['maintenance.event'].with_context(create_request=False).create({
                    'name': name,
                    'start': start,
                    'stop': stop,
                    'duration': duration,
                    'maintenance_id': [(6, 0, [self.id])],
                })
                vals['maintenance_event_id'] = maintenance_event.id
        # The user want to remove the event and set the schedule_date to empty.
        elif self.maintenance_event_id.exists():
            self.maintenance_event_id.unlink()
        return vals

    def _compute_count_meeting(self):
        for record in self:
            if record.schedule_date is not False:
                record.schedule_date_count = 1
            else:
                record.schedule_date_count = 0


class MaintenanceTeam(models.Model):
    _name = 'maintenance.team'
    _description = 'Maintenance Teams'

    name = fields.Char(required=True)
    member_ids = fields.Many2many('res.users', 'maintenance_team_users_rel', string="Team Members")
    color = fields.Integer("Color Index", default=1)
    request_ids = fields.One2many('maintenance.request', 'maintenance_team_id', copy=False)
    equipment_ids = fields.One2many('maintenance.equipment', 'maintenance_team_id', copy=False)

    # For the dashboard only
    todo_request_ids = fields.One2many('maintenance.request', copy=False, compute='_compute_todo_requests')
    todo_request_count = fields.Integer(compute='_compute_todo_requests')
    todo_request_count_date = fields.Integer(compute='_compute_todo_requests')
    todo_request_count_high_priority = fields.Integer(compute='_compute_todo_requests')
    todo_request_count_block = fields.Integer(compute='_compute_todo_requests')
    todo_request_count_unscheduled = fields.Integer(compute='_compute_todo_requests')

    @api.one
    @api.depends('request_ids.stage_id.done')
    def _compute_todo_requests(self):
        self.todo_request_ids = self.request_ids.filtered(lambda e: e.stage_id.done is False)
        self.todo_request_count = len(self.todo_request_ids)
        self.todo_request_count_date = len(self.todo_request_ids.filtered(lambda e: e.schedule_date is not False))
        self.todo_request_count_high_priority = len(self.todo_request_ids.filtered(lambda e: e.priority == '3'))
        self.todo_request_count_block = len(self.todo_request_ids.filtered(lambda e: e.kanban_state == 'blocked'))
        self.todo_request_count_unscheduled = len(self.todo_request_ids.filtered(lambda e: not e.schedule_date))

    @api.one
    @api.depends('equipment_ids')
    def _compute_equipment(self):
        self.equipment_count = len(self.equipment_ids)
