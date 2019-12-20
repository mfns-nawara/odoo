odoo.define('account.ShowReseqenceRenderer', function (require) {
"use strict";

const { Component } = owl;
const { useState } = owl.hooks;
const OwlAbstractRenderer = require('web.AbstractRendererOwl');

class ChangeLine extends Component {
    static template = 'account.ResequenceChangeLine'
    static props = ["changeLine", 'ordering'];
}

class ShowReseqenceRenderer extends OwlAbstractRenderer {
    static template = 'account.ResequenceRenderer';
    data = useState({
        changeLines: [],
        ordering: 'date',
    });
    static components = { ChangeLine }
}

return ShowReseqenceRenderer;
});


odoo.define('account.ShowReseqenceWidget', function (require) {
"use strict";

var AbstractField = require('web.AbstractField');
var ShowReseqenceRenderer = require('account.ShowReseqenceRenderer');

var ShowReseqenceWidget = AbstractField.extend({
    start: function () {
        this.renderer = new ShowReseqenceRenderer();
        return this._super.apply(this, arguments);
    },
    _render: function() {
        Object.assign(this.renderer.data, JSON.parse(this.value));
        this.renderer.mount(this.$el[0]);
    }
});

require('web.field_registry').add("account_resequence_widget", ShowReseqenceWidget);
return ShowReseqenceWidget;

});
