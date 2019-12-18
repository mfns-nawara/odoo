odoo.define('website.s_table_of_content_options', function (require) {
'use strict';

var options = require('web_editor.snippets.options');

options.registry.tableOfContent = options.Class.extend({

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * Animate (or not) scrolling.
     *
     * @see this.selectClass for parameters
     */
    animateScrolling: function (previewMode, widgetValue, params) {
        var $headings = this.$target.find('.s_table_of_content_section h1, .s_table_of_content_section h2');
        if (widgetValue) {
            _.each($headings, el => el.dataset.anchor = 'true');
        } else {
            _.each($headings, el => el.dataset.anchor = '0');
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        if (methodName === 'animateScrolling') {
            var $headings = this.$target.find('.s_table_of_content_section h1, .s_table_of_content_section h2');
            return $headings[0].dataset.anchor === 'true' ? 'true' : '';
        }
        return this._super(...arguments);
    },
});
options.registry.tableOfContentSection = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        this.$target.on('content_changed', () => this._generateNav());
        return this._super(...arguments);
    },
    /**
     * @override
     */
    onBuilt: function () {
        this._generateNav();
    },
    /**
     * @override
     */
    onClone: function () {
        this._generateNav();
    },
    /**
     * @override
     */
    onCleanForSave: function () {
        this._generateNav();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _generateNav: function () {
        var activeClass = " active";
        var $nav = this.$target.closest('.container').find('#s_table_of_content_navbar');
        $nav.empty();
        _.each(this.$target.closest('.s_table_of_content_main').find('h1, h2'), el => {
            var $el = $(el);
            var id = _.uniqueId('table_of_content_section_');
            $('<a>').attr('href', "#" + id)
                    .addClass('list-group-item list-group-item-action py-2 border-0 rounded-0' + activeClass)
                    .text($($el).text())
                    .appendTo($nav);
            $($el).attr('id', id);
            activeClass = "";
        });
    },
});
options.registry.tableOfContentNavbar = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        var leftPanelEl = this.$overlay.data('$optionsSection')[0];
        leftPanelEl.querySelector('.oe_snippet_remove').classList.add('d-none'); // TODO improve the way to do that
        leftPanelEl.querySelector('.oe_snippet_clone').classList.add('d-none'); // TODO improve the way to do that
        return this._super.apply(this, arguments);
    },
    /**
    * @override
    */
    destroy: function () {
        this._super.apply(this, arguments);
    },
});
options.registry.tableOfContentMain = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        var leftPanelEl = this.$overlay.data('$optionsSection')[0];
        leftPanelEl.querySelector('.oe_snippet_remove').classList.add('d-none'); // TODO improve the way to do that
        leftPanelEl.querySelector('.oe_snippet_clone').classList.add('d-none'); // TODO improve the way to do that
        return this._super.apply(this, arguments);
    },
    /**
    * @override
    */
    destroy: function () {
        this._super.apply(this, arguments);
    },
});
});
