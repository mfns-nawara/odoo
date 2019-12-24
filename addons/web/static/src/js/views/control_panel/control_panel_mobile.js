odoo.define('web.ControlPanelMobile', function (require) {
    "use strict";

    const config = require('web.config');
    const ControlPanel = require('web.ControlPanel');
    const SearchBarMobile = require('web.SearchBarMobile');
    const utils = require('web.utils');

    if (!config.device.isMobile) {
        return;
    }

    ControlPanel.template = 'ControlPanelMobile';
    ControlPanel.components.SearchBarMobile = SearchBarMobile;

    utils.patch(ControlPanel, 'web_mobile.ControlPanel', {

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get initialState() {
            return Object.assign(this._super(), {
                isSearching: false,
                viewSwitcherOpen: false,
            });
        },

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Overridden to correctly place submenu inside the mobile section.
         * @private
         * @override
         */
        _getSubMenusPlace() {
            return this.$('.o_mobile_search_filter');
        },

        /**
         * @private
         * @override
         */
        _render() {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self.$('.o_mobile_search_clear_facets')
                    .toggleClass('o_hidden', !self.state.query.length);
            });
        },

        /**
         * @private
         * @override
         */
        _renderSearchBar() {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._renderSearchviewInput();
            });
        },

        /**
         * @private
         */
        _renderSearchviewInput() {
            if (this.$('.o_toggle_searchview_full').is(':visible') && !this.$('.o_mobile_search').is(':visible')) {
                this.$('.o_toggle_searchview_full').toggleClass('btn-secondary', !!this.state.query.length);
                this.searchBar.$el.detach().insertAfter(this.$('.o_mobile_search'));
            } else {
                this.searchBar.$el.detach().insertAfter(this.$('.o_mobile_search_header'));
            }
        },

        /**
         * Toggles mobile search view screen.
         * @private
         */
        _toggleMobileSearchView() {
            this.$('.o_mobile_search').toggleClass('o_hidden');
            this._renderSearchviewInput();
        },

        /**
         * Toggles mobile quick search view on screen.
         * @private
         */
        _toggleMobileQuickSearchView() {
            this.$('.o_cp_searchview').toggleClass('o_searchview_quick');
            this.$('.breadcrumb').toggleClass('o_hidden',
                this.$('.o_cp_searchview').hasClass('o_searchview_quick'));
            this.$('.o_toggle_searchview_full')
                .toggleClass('o_hidden')
                .toggleClass('btn-secondary', !!this.state.query.length);
            this._renderSearchviewInput();
            this.$('.o_enable_searchview').toggleClass("fa-search").toggleClass("fa-close");
        },

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Toggles the little arrow in main buttons.
         * @private
         * @param {BootstrapEvent} ev
         */
        _onDropdownToggle(ev) {
            ev.currentTarget.closest('.fa-chevron-right').classList.toggle('fa-chevron-down');
        },

        /**
         * Clears all filters from the search view.
         * @private
         */
        _onEmptyAll() {
            this.trigger_up('search_bar_cleared');
        },

        /**
         * Opens the mobile search view screen.
         * @private
         * @param {MouseEvent} ev
         */
        _onOpenMobileSearchView(ev) {
            if (ev.target === this.el) {
                this._toggleMobileSearchView();
            }
        },

    });

    // ControlPanelRenderer.include({
    //     events: _.extend({}, ControlPanelRenderer.prototype.events, {
    //         'click .o_mobile_search_close, .o_mobile_search_show_result, .o_toggle_searchview_full': '_toggleMobileSearchView',
    //         'click .o_enable_searchview': '_toggleMobileQuickSearchView',
    //         'click .o_toggle_searchview_full': '_onOpenMobileSearchView',
    //         'click .o_mobile_search_clear_facets': '_onEmptyAll',
    //         'show.bs.dropdown .o_mobile_search_filter .o_dropdown': '_onDropdownToggle',
    //         'hide.bs.dropdown .o_mobile_search_filter .o_dropdown': '_onDropdownToggle',
    //     }),
    // });
});
