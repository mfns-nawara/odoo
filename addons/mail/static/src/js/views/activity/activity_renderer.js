odoo.define('mail.ActivityRenderer', function (require) {
"use strict";

const OwlAbstractRenderer = require('web.AbstractRendererOwl');
var ActivityRecord = require('mail.ActivityRecord');
var config = require('web.config');
var core = require('web.core');
var field_registry = require('web.field_registry');
var KanbanColumnProgressBar = require('web.KanbanColumnProgressBar');
var qweb = require('web.QWeb');
var session = require('web.session');
var utils = require('web.utils');

var KanbanActivity = field_registry.get('kanban_activity');
var _t = core._t;
var QWeb = core.qweb;

const { useState } = owl.hooks;

const AdapterComponent = require('web.AdapterComponent');

/**
 * Owl Component Adapter for KanbanColumnProgressBar (Odoo Widget)
 * TODO: Remove this adapter when KanbanColumnProgressBar is a Component
 */
class KanbanColumnProgressBarAdapter extends AdapterComponent {
    constructor(parent, props) {
        props.Component = KanbanColumnProgressBar;
        super(...arguments);
    }

    get widgetArgs() {
        return [this.props.options, this.props.columnState];
    }

    willUpdateProps(props) {
        if (!props.activeFilter) {
            this.widget.removeFilter();
        }
        this.widget.reset(props.columnState);
    }
}

/**
 * Owl Component Adapter for ActivityRecord which is KanbanRecord (Odoo Widget)
 * TODO: Remove this adapter when ActivityRecord is a Component
 */
class ActivityRecordAdapter extends AdapterComponent {
    constructor(parent, props) {
        props.Component = ActivityRecord;
        super(...arguments);
    }

    get widgetArgs() {
        return [this.props.state, this.props.options];
    }
}

/**
 * Owl Component Adapter for KanbanActivity which is BasicActivity (AbstractField)
 * TODO: Remove this adapter when KanbanActivity is a Component
 */
class KanbanActivityAdapter extends AdapterComponent {
    constructor(parent, props) {
        props.Component = KanbanActivity;
        super(...arguments);
    }

    get widgetArgs() {
        return [this.props.name, this.props.record];
    }

    willStart() {
        let parent = super.willStart();
        if (parent) {
            return parent.then(() => {
                this.patchWidget();
            });
        }
    }

    patched() {
        this.patchWidget();
        this.widget._reset(this.props.record);
        this.widget._renderDropdown();
    }

    patchWidget() {
        // replace clock by closest deadline
        var $date = $('<div class="o_closest_deadline">');
        var date = new Date(this.props.record.data.closest_deadline);
        // To remove year only if current year
        if (moment().year() === moment(date).year()) {
            $date.text(date.toLocaleDateString(moment().locale(), { day: 'numeric', month: 'short' }));
        } else {
            $date.text(moment(date).format('ll'));
        }
        this.widget.$el.find('a').html($date);
        if (this.props.record.data.activity_ids.res_ids.length > 1) {
            this.widget.$el.find('a').append($('<span>', {
                class: 'badge badge-light badge-pill border-0 ' + this.props.record.data.activity_state,
                text: this.props.record.data.activity_ids.res_ids.length,
            }));
        }
    }
}

class ActivityRenderer extends OwlAbstractRenderer {
	constructor(parent, props) {
        super(...arguments);
        this.qweb = new qweb(config.isDebug(), {_s: session.origin});
        this.qweb.add_template(utils.json_node_to_xml(props.templates));
        this.activeFilter = useState({
            state: null,
            activityTypeId: null,
            resIds: []
        });
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    get activityResIds() {
        return this.activeFilter.resIds.concat(this.props.activity_res_ids.filter(x => !this.activeFilter.resIds.includes(x)));
    }

	get activityTypeIds() {
        return Array.from(new Set(Object.values(this.props.grouped_activities).flatMap(Object.keys))).map(Number);
	}

    getKanbanColumnProgressBarColumnState(typeId) {
        const counts = { planned: 0, today: 0, overdue: 0 };
        for (let activities of Object.values(this.props.grouped_activities)) {
            if (typeId in activities) {
                counts[activities[typeId].state] += 1;
            }
        }
        return {
            count: Object.values(counts).reduce((x, y) => x + y),
            fields: {
                activity_state: {
                    type: 'selection',
                    selection: [
                        ['planned', _t('Planned')],
                        ['today', _t('Today')],
                        ['overdue', _t('Overdue')],
                    ],
                },
            },
            progressBarValues: {
                field: 'activity_state',
                colors: { planned: 'success', today: 'warning', overdue: 'danger' },
                counts: counts,
            },
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------
    
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onEmptyCell(ev) {
        this.trigger('empty_cell_clicked', {
            resId: parseInt(ev.currentTarget.dataset.resId),
            activityTypeId: parseInt(ev.currentTarget.dataset.activityTypeId),
        });
    }
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onRecordSelector(ev) {
        this.trigger('schedule_activity');
    }
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onSendMailTemplateClicked(ev) {
        this.trigger('send_mail_template', {
            activityTypeID: parseInt(ev.currentTarget.dataset.activityTypeId),
            templateID: parseInt(ev.currentTarget.dataset.templateId),
        });
    }
    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onSetProgressBarState(ev) {
        if (ev.detail.values.activeFilter) {
            this.activeFilter.state = ev.detail.values.activeFilter;
            this.activeFilter.activityTypeId = ev.detail.columnID;
            this.activeFilter.resIds = Object.entries(this.props.grouped_activities)
                    .filter(([, resIds]) => ev.detail.columnID in resIds && resIds[ev.detail.columnID].state === ev.detail.values.activeFilter)
                    .map(([key]) => parseInt(key));
        }
        else {
            this.activeFilter.state = null;
            this.activeFilter.activityTypeId = null;
            this.activeFilter.resIds = [];
        }
    }
}

ActivityRenderer.components = { ActivityRecordAdapter, KanbanActivityAdapter, KanbanColumnProgressBarAdapter };
ActivityRenderer.template = 'mail.ActivityRenderer';

return ActivityRenderer;

});
