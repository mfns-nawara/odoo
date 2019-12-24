odoo.define('web.SearchBarMobile', function (require) {
    "use strict";

    const SearchBar = require('web.SearchBar');

    class SearchBarMobile extends SearchBar {

        constructor() {
            super(...arguments);

            this.state.isFiltering = false;
        }

        mounted() { }

        _onToggleIsFiltering() {
            this.state.isFiltering = !this.state.isFiltering;
            this.trigger('close_search_menus');
        }
    }

    SearchBarMobile.template = 'SearchBarMobile';
    SearchBarMobile.props = Object.assign({}, SearchBar.props, {
        isSearching: Boolean,
    });

    return SearchBarMobile;
});
