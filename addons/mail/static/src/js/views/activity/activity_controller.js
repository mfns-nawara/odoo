odoo.define('mail.ActivityController', function (require) {
"use strict";

const ControllerAdapter = require('web.ControllerAdapter');
const core = require('web.core');
const field_registry = require('web.field_registry');
const ViewDialogs = require('web.view_dialogs');

const KanbanActivity = field_registry.get('kanban_activity');
const _t = core._t;

const ActivityController = ControllerAdapter.extend({
    custom_events: _.extend({}, ControllerAdapter.prototype.custom_events, {
        reload: '_onReload',
    }),
	events: _.extend({}, ControllerAdapter.prototype.events, {
        empty_cell_clicked: '_onEmptyCell',
        send_mail_template: '_onSendMailTemplate',
        schedule_activity: '_onScheduleActivity',
        'open-record': '_onOpenRecord',
        'do-action': function (ev) {
            ev.stopPropagation();
            this.do_action(ev.detail.action, ev.detail.options);
        },
        reload: '_onReload',
    }),

    init: function () {
        this._super.apply(this, arguments);
        this.handle = this.initialState.id;
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onEmptyCell: function (ev) {
        var state = this.model.get(this.handle);
        this.do_action({
            type: 'ir.actions.act_window',
            res_model: 'mail.activity',
            view_mode: 'form',
            view_type: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: ev.detail.resId,
                default_res_model: state.model,
                default_activity_type_id: ev.detail.activityTypeId,
            },
            res_id: false,
        }, {
            on_close: this.reload.bind(this),
        });
    },
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onOpenRecord: function (ev) {
        ev.data = ev.detail;
        this._super.apply(this, arguments);
    },
    /**
     * When a reload event triggers up, we need to reload the full view.
     * For example, after a form view dialog saved some data.
     *
     * @todo: rename db_id into handle
     *
     * @param {OdooEvent} ev
     * @param {Object} ev.data
     * @param {string} [ev.data.db_id] handle of the data to reload and
     *   re-render (reload the whole form by default)
     * @param {string[]} [ev.data.fieldNames] list of the record's fields to
     *   reload
     * @param {Function} [ev.data.onSuccess] callback executed after reload is resolved
     * @param {Function} [ev.data.onFailure] callback executed when reload is rejected
     */
    _onReload: function (ev) {
        ev.stopPropagation(); // prevent other controllers from handling this request
        var data = ev && ev.data || ev.detail || {};
        var handle = data.db_id;
        var prom;
        if (handle) {
            // reload the relational field given its db_id
            prom = this.model.reload(handle).then(this._confirmSave.bind(this, handle));
        } else {
            // no db_id given, so reload the main record
            prom = this.reload({
                fieldNames: data.fieldNames,
                keepChanges: data.keepChanges || false,
            });
        }
        prom.then(data.onSuccess).guardedCatch(data.onFailure);
    },
    /**
     * @private
     */
    _onScheduleActivity: function () {
        var self = this;

        var state = this.model.get(this.handle);
        new ViewDialogs.SelectCreateDialog(this, {
            res_model: state.model,
            domain: this.model.originalDomain,
            title: _.str.sprintf(_t("Search: %s"), this.renderer.props.arch.attrs.string),
            no_create: !this.activeActions.create,
            disable_multiple_selection: true,
            context: state.context,
            on_selected: function (record) {
                var fakeRecord = state.getKanbanActivityData({}, record[0]);
                var widget = new KanbanActivity(self, 'activity_ids', fakeRecord);
                widget.scheduleActivity();
            },
        }).open();
    },
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onSendMailTemplate: function (ev) {
        var templateID = ev.detail.templateID;
        var activityTypeID = ev.detail.activityTypeID;
        var state = this.model.get(this.handle);
        var groupedActivities = state.grouped_activities;
        var resIDS = [];
        Object.keys(groupedActivities).forEach(function (resID) {
            var activityByType = groupedActivities[resID];
            var activity = activityByType[activityTypeID];
            if (activity) {
                resIDS.push(parseInt(resID));
            }
        });
        this._rpc({
            model: this.model.modelName,
            method: 'activity_send_mail',
            args: [resIDS, templateID],
        });
    },
});

return ActivityController;

});
