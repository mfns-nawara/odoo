odoo.define('web.SearchMenu', function (require) {
    "use strict";

    const SearchMenuItem = require('web.SearchMenuItem');
    const { useExternalListener } = require('web.custom_hooks');

    const { Component, hooks } = owl;
    const { useGetters, useRef, useState } = hooks;

    class SearchMenu extends Component {
        constructor() {
            super(...arguments);

            this.dropdownMenu = useRef('dropdown');
            this.getters = useGetters(this.env.controlPanelStore);
            this.offset = null;
            this.state = useState({ open: false });
            this.symbol = this.env.device.isMobile ? 'fa fa-chevron-right float-right mt4' : false;

            useExternalListener(window, 'keydown', this._onWindowKeydown);
            useExternalListener(window, 'click', this._onWindowClick);
        }

        //--------------------------------------------------------------------------
        // Properties
        //--------------------------------------------------------------------------

        get items() {
            return this.getters.getFiltersOfType(this.category);
        }

        get isOpen() {
            return this.props.open;
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        _close() {
            this.trigger('close_search_menu');
        }

        _toggle() {
            this.trigger('toggle_search_menu', this.category);
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onButtonKeydown(ev) {
            switch (ev.key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    const firstItem = this.el.querySelector('.dropdown-item');
                    if (firstItem) {
                        ev.preventDefault();
                        firstItem.focus();
                    }
            }
        }

        _onRemove(item) {
            this.env.store.dispatch('removeFavorite', item);
        }

        _onWindowClick(ev) {
            if (this.isOpen && !this.el.contains(ev.target)) {
                this._close();
            }
        }

        _onWindowKeydown(ev) {
            if (this.isOpen && ev.key === 'Escape') {
                this._close();
            }
        }
    }

    SearchMenu.components = { SearchMenuItem };
    SearchMenu.defaultProps = {
        action: {},
        fields: {},
    };
    SearchMenu.props = {
        action: { type: Object, optional: 1 },
        fields: { type: Object, optional: 1 },
        open: Boolean,
    };
    SearchMenu.template = 'SearchMenu';

    return SearchMenu;
});
