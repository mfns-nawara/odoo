odoo.define('web_tour.tour', function(require) {
"use strict";

var core = require('web.core');

console.log("web_tour.tour sdf");

var Cruise = core.Class.extend({
    init: function() {
        this.tooltips = {};
        core.bus.on('DOM_updated', this, this.check_for_tooltip);
        this.popovers = [];
    },
    register: function(name, description) {
        this.tooltips[name] = description;
    },
    check_for_tooltip: function() {
        var self = this;
        _.each(this.tooltips, function (tip) {
            var $trigger = $(tip.trigger);
            if ($trigger.length) {
                self.remove_displayed_tips();
                self.show_tip($trigger, tip);
            }
        });
    },
    remove_displayed_tips: function() {
        while (this.popovers.length) {
            this.popovers.pop().popover('destroy');
        }
    },
    show_tip: function($trigger, tip) {
        var popover = $trigger.popover({
            title: tip.title,
            content: tip.content,
            html: true,
            container: 'body',
            animation: false,
            placement: tip.position,
        });
        popover.popover('show');

        this.popovers.push(popover);
    },
});

var cruise = new Cruise();

return cruise;
});

odoo.define('web.tour_test', function(require) {
"use strict";

// TO REMOVE THIS BEFORE MERGING IN MASTER

var cruise = require('web_tour.tour');

cruise.register('some tooltip', {
    trigger: '.o_app[data-action-id="389"]',
    title: 'Hello Project',
    content: 'better than Trello',
    position: 'bottom',
});

cruise.register('kanban first record', {
    trigger: '.o_kanban_view .o_kanban_record:first-child',
    title: 'First kanban record',
    content: 'You rock',
    position: 'right',
});

});
