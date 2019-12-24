odoo.define('web.SearchBar', function (require) {
    "use strict";

    const AutoComplete = require('web.AutoComplete');
    const searchBarAutocompleteRegistry = require('web.search_bar_autocomplete_sources_registry');
    const SearchFacet = require('web.SearchFacet');
    const { useAutofocus } = require('web.custom_hooks');

    const { Component, hooks } = owl;
    const { useGetters, useState, useStore, useDispatch } = hooks;

    class SearchBar extends Component {
        /**
         * @override
         * @param {Object} [props]
         * @param {Object} [props.context]
         * @param {Object} [props.fields]
         */
        constructor() {
            super(...arguments);

            useAutofocus();
            this.dispatch = useDispatch(this.env.controlPanelStore);
            this.filters = useStore(state => state.filters, { store: this.env.controlPanelStore });
            this.getters = useGetters(this.env.controlPanelStore);
            this.groups = useStore(state => state.groups, { store: this.env.controlPanelStore });
            this.query = useStore(state => state.query, { store: this.env.controlPanelStore });
            this.state = useState({ inputValue: "" });

            this.autoCompleteWidgets = this._setupAutoCompletionWidgets();
            this.wasInputVisible = false;
        }

        mounted() {
            const input = this.el.querySelector('.o_searchview_input');
            if (input) {
                this.autoComplete = new AutoComplete(this, {
                    $input: $(input),
                    source: this._getAutoCompleteSources.bind(this, this.autoCompleteWidgets),
                    select: this._onAutoCompleteSelected.bind(this),
                    get_search_string: () => this.state.inputValue.trim(),
                });
                this.autoComplete.appendTo($(this.el.querySelector('.o_searchview_input_container')));
            }
            this.wasInputVisible = Boolean(input);
        }

        patched() {
            const input = this.el.querySelector('.o_searchview_input');
            if (!this.wasInputVisible && input) {
                this.autoComplete = new AutoComplete(this, {
                    $input: $(input),
                    source: this._getAutoCompleteSources.bind(this, this.autoCompleteWidgets),
                    select: this._onAutoCompleteSelected.bind(this),
                    get_search_string: () => this.state.inputValue.trim(),
                });
                this.autoComplete.appendTo($(this.el.querySelector('.o_searchview_input_container')));
            }
            this.wasInputVisible = Boolean(input);
        }

        //--------------------------------------------------------------------------
        // Properties
        //--------------------------------------------------------------------------


        get facets() {
            return this.query.map(groupId => {
                const group = this.groups[groupId];
                return {
                    group: group,
                    filters: group.activeFilterIds.map(({ filterId }) => this.filters[filterId])
                };
            });
        }

        /**
         * @private
         * @returns {number}
         */
        get focusedIndex() {
            const facets = this.el.querySelectorAll('.o_searchview_facet');
            return (facets.length && [...facets].indexOf(document.activeElement)) || null;
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Provide auto-completion result for `request.term`.
         * @private
         * @param {Widgets[]} widgets Array of source widgets.
         * @param {Object} request Rrequest to complete.
         * @param {string} request.term Searched term to complete.
         * @param {Function} callback
         */
        async _getAutoCompleteSources(widgets, request, callback) {
            const defs = widgets.map(widget => widget.getAutocompletionValues(request.term));
            const results = await Promise.all(defs);
            const cleanedResult = results
                .filter(r => Boolean(r)) // Remove falsy elements
                .reduce((flat, res) => flat.concat(res), []); // Flatten the results
            callback(cleanedResult);
        }

        /**
         * @private
         */
        _getKeyNavElements() {
            return [
                ...this.el.getElementsByClassName('o_searchview_facet'),
                this.el.querySelector('.o_searchview_input'),
            ];
        }

        /**
         * @private
         */
        _setupAutoCompletionWidgets() {
            const registry = searchBarAutocompleteRegistry;
            return this.getters.getFiltersOfType('field').reduce(
                (widgets, filter) => {
                    const field = this.props.fields[filter.attrs.name];
                    const constructor = registry.getAny([filter.attrs.widget, field.type]);
                    if (constructor) {
                        widgets.push(new constructor(this, filter, field, this.props.context));
                    }
                    return widgets;
                },
                []
            );
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {Event} e
         * @param {Object} ui
         * @param {Object} ui.item selected completion item
         */
        _onAutoCompleteSelected(ev, ui) {
            ev.preventDefault();
            const facet = ui.item.facet;
            if (!facet) {
                // this happens when selecting "(no result)" item
                this.trigger('reset');
                return;
            }
            const filter = facet.filter;
            if (filter.type === 'field') {
                const values = filter.autoCompleteValues;
                values.push(facet.values[0]);
                this.dispatch('toggleAutoCompletionFilter', filter.id, values);
            } else {
                this.dispatch('toggleAutoCompletionFilter', filter.id);
            }
            this.state.inputValue = "";
        }

        /**
         * @private
         * @param {Event} ev
         */
        _onInputSearch(ev) {
            this.state.inputValue = ev.target.value;
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onKeydown(ev) {
            if (
                ev.target.tagName === 'INPUT' &&
                (
                    ev.target.selectionStart > 0 ||
                    ev.target.selectionEnd < ev.target.value
                )
            ) {
                return;
            }
            const keyNavElements = this._getKeyNavElements();
            const keyNavIndex = keyNavElements.indexOf(ev.target);
            let newIndex;
            switch (ev.key) {
                case 'ArrowLeft':
                    if (
                        keyNavIndex < 0 || (ev.target.tagName === 'INPUT' &&
                        ev.target.selectionStart > 0)
                    ) {
                        return;
                    }
                    newIndex = keyNavIndex - 1;
                    if (newIndex < 0) {
                        newIndex = keyNavElements.length - 1;
                    }
                    ev.preventDefault();
                    keyNavElements[newIndex].focus();
                    break;
                case 'ArrowRight':
                    if (
                        keyNavIndex < 0 || (ev.target.tagName === 'INPUT' &&
                        ev.target.selectionEnd < this.state.inputValue.length)
                    ) {
                        return;
                    }
                    newIndex = keyNavIndex + 1;
                    if (newIndex >= keyNavElements.length) {
                        newIndex = 0;
                    }
                    ev.preventDefault();
                    keyNavElements[newIndex].focus();
                    break;
                case 'ArrowDown':
                    // if the searchbar dropdown is closed, try to focus the renderer
                    const dropdown = this.el.querySelector('.o_searchview_autocomplete');
                    if (!dropdown) {
                        this.trigger('navigation_move', { direction: 'down' });
                        ev.preventDefault();
                    }
                    break;
                case 'Backspace':
                    if (!this.state.inputValue.length && this.query.length) {
                        this.dispatch('deactivateGroup', this.query[this.query.length -1]);
                    }
                    break;
                case 'Enter':
                    if (!this.state.inputValue.length) {
                        this.trigger('reload');
                    }
                    break;
            }
        }
    }
    SearchBar.components = { SearchFacet };
    SearchBar.defaultProps = {
        fields: {},
    };
    SearchBar.props = {
        fields: Object,
    };
    SearchBar.template = 'SearchBar';

    return SearchBar;
});
