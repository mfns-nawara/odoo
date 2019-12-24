odoo.define('web.ControlPanel', function (require) {
    "use strict";

    const Pager = require('web.Pager');
    const SearchBar = require('web.SearchBar');
    const Sidebar = require('web.Sidebar');
    const FilterMenu = require('web.FilterMenu');
    const TimeRangeMenu = require('web.TimeRangeMenu');
    const GroupByMenu = require('web.GroupByMenu');
    const FavoriteMenu = require('web.FavoriteMenu');

    const { Component, hooks } = owl;
    const { useRef, useState, useSubEnv, useStore, useGetters } = hooks;

    /**
     * @private
     * @param {*} target
     * @param {*} initial
     * @returns {*}
     */
    function deepCopy(target, initial) {
        if (Array.isArray(initial)) {
            // target = target || [];
            // return Object.assign(target, initial);
            if (!Array.isArray(target)) {
                target = [];
            }
            for (let i = 0; i < initial.length; i++) {
                target[i] = deepCopy(target[i], initial[i]);
            }
        } else if (typeof initial === 'object' && initial !== null) {
            // target = target || {};
            // return Object.assign(target, initial);
            try {
                if (typeof target !== 'object') {
                    target = initial.constructor ? new initial.constructor() : {};
                }
                for (const key in initial) {
                    if (initial.hasOwnProperty(key)) {
                        target[key] = deepCopy(target[key], initial[key]);
                    }
                }
            } catch (err) {
                if (!(err instanceof TypeError)) {
                    throw err;
                }
                target = err.message === 'Illegal constructor' ?
                    initial :
                    Object.assign({}, initial);
            }
        } else {
            target = initial;
        }
        return target;
    }

    class ControlPanel extends Component {
        constructor() {
            super(...arguments);

            useSubEnv({
                controlPanelStore: this.props.controlPanelStore,
            });

            this.state = useState(this.initialState);

            this._loadStore();

            this.buttonsRef = useRef('buttons');
            window.top.cp = this;
        }

        mounted() {
            this._appendButtons();
        }

        patched() {
            this._appendButtons();
        }

        async willUpdateProps(nextProps) {
            console.log("CP: update", nextProps);
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get initialState() {
            return {
                displaySearchMenus: true,
                openedMenu: null,
            };
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        exportState() {
            console.log("State has definitely been exported... this is not a placeholder function at all !");
        }

        importState() {
            console.log("State has definitely been imported... this is not a placeholder function at all !");
        }

        async updateProps(newProps = {}) {
            if (!Object.keys(newProps).length) {
                return;
            }
            await this.willUpdateProps(newProps);
            Object.assign(this.props, newProps);
            // deepCopy(this.props, newProps);
            // Object.assign(this.props, newProps);
            if (this.__owl__.isMounted) {
                this.render(true);
            }
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        _appendButtons() {
            if (this.buttonsRef.el) {
                const buttons = this.props.buttons();
                if (buttons) {
                    this.buttonsRef.el.innerHTML = "";
                    this.buttonsRef.el.append(...buttons);
                }
            }
        }

        _loadStore() {
            this.getters = useGetters(this.env.controlPanelStore);
            useStore(state => state, {
                store: this.env.controlPanelStore,
                onUpdate: () => this.trigger('search', this.env.controlPanelStore.getQuery()),
            });
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onUpdateQuery() {
            console.log('Query updated', ...arguments);
        }

        _onToggleSearchMenu(ev) {
            this.state.openedMenu = this.state.openedMenu === ev.detail ?
                null : ev.detail;
        }
    }

    ControlPanel.components = { Pager, SearchBar, Sidebar, FilterMenu, TimeRangeMenu, GroupByMenu, FavoriteMenu };
    ControlPanel.defaultProps = {
        breadcrumbs: [],
        views: [],
    };
    // ControlPanel.props = {};
    ControlPanel.template = 'ControlPanel';

    return ControlPanel;
});
