odoo.define('web.TimeRangeMenu', function (require) {
"use strict";

const config = require('web.config');
const { COMPARISON_TIME_RANGE_OPTIONS, PERIOD_OPTIONS } = require('web.controlPanelParameters');
const Widget = require('web.Widget');
const SearchMenu = require('web.SearchMenu');

const { useDispatch, useState } = owl.hooks;
let timeRangeCount = 0;

class TimeRangeMenu extends SearchMenu {
    constructor() {
        super(...arguments);

        this.category = 'timeRange';
        this.comparisonTimeRangeOptions = COMPARISON_TIME_RANGE_OPTIONS;
        this.dispatch = useDispatch(this.env.controlPanelStore);
        this.icon = 'fa fa-calendar';
        this.periodOptions = PERIOD_OPTIONS;
        this.periodGroups = this.periodOptions.reduce((acc, o) => {
            if (!acc.includes(o.groupNumber)) {
                acc.push(o.groupNumber);
            }
            return acc;
        }, []);
        this.title = this.env._t("Time Ranges");

        const { comparisonTimeRangeId, id, timeRangeId } = this.items.find(timeRange => timeRange.isActive) || this.items[0];
        const uniqueId = timeRangeCount ++;

        this.state = useState({
            isComparing: Boolean(comparisonTimeRangeId),
            id: id,
            comparisonTimeRangeId: comparisonTimeRangeId || false,
            timeRangeId: timeRangeId,
        });

        this.idSelectId = `id_select_${uniqueId}`;
        this.rangeSelectId = `range_select_${uniqueId}`;
        this.rangeCheckboxId = `range_checkbox_${uniqueId}`;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onApply() {
        this.dispatch('activateTimeRange',
            this.state.id, // Filter id
            this.state.timeRangeId, // Time range id
            (this.state.isComparing && this.state.comparisonTimeRangeId) || false // Comparison time range id
        );
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onCheckboxChanged(ev) {
        this.state.isComparing = ev.target.checked;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onComparisonTimeRangedChanged(ev) {
        this.state.comparisonTimeRangeId = ev.target.value;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onIdChanged(ev) {
        this.state.id = ev.target.value;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTimeRangeChanged(ev) {
        this.state.timeRangeId = ev.target.value;
    }
}

TimeRangeMenu.template = 'TimeRangeMenu';

const _TimeRangeMenu = Widget.extend({
    template: 'web.TimeRangeMenu',
    events: {
        'click .o_apply_range': '_onApplyButtonClick',
        'click .o_comparison_checkbox': '_onCheckBoxClick',
    },
    /**
     * @override
     * @param {Widget} parent
     * @param {Object[]} timeRanges
     *
     */
    init: function (parent, timeRanges) {
        this._super.apply(this, arguments);
        // determine header style
        this.isMobile = config.device.isMobile;
        this.symbol = this.isMobile ? 'fa fa-chevron-right float-right mt4' : 'caret';
        // fixed parameters
        this.periodOptions = PERIOD_OPTIONS;
        this.comparisonTimeRangeOptions = COMPARISON_TIME_RANGE_OPTIONS;
        this.periodGroups = _.uniq(PERIOD_OPTIONS.map(function (option) {
            return option.groupId;
        }));
        // constiable parameters
        this.timeRanges = timeRanges;
        this.configuration = {
            comparison: false,
            range: false,
            id: false,
            timeRangeId: false,
        };
        this._configure();
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {Object[]} timeRanges
     */
    update: function (timeRanges) {
        this.timeRanges = timeRanges;
        this._configure();
        this.renderElement();
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _configure: function () {
        const active = this.timeRanges.find(timeRange => timeRange.isActive);
        if (active) {
            this.configuration = active;
        }
        this.configuration.comparison = Boolean(this.configuration.range);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onApplyButtonClick: function () {
        const id = this.$('.o_date_field_selector').val();
        const timeRangeId = this.$('.o_time_range_selector').val();
        let range = false;
        if (this.configuration.comparison) {
            range = this.$('.o_comparison_time_range_selector').val();
        }
        this.trigger_up('activate_time_range', {
            id: id,
            timeRangeId: timeRangeId,
            range: range
        });
    },
    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onCheckBoxClick: function (ev) {
        ev.stopPropagation();
        this.configuration.comparison = this.$('.o_comparison_checkbox').prop('checked');
        this.$('.o_comparison_time_range_selector').toggleClass('o_hidden');
        this.$el.addClass('open');
    }
});

return TimeRangeMenu;

});
