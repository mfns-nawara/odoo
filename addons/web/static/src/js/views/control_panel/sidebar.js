odoo.define('web.Sidebar', function (require) {
    "use strict";

    const { _t } = require('web.core');
    const Context = require('web.Context');
    const CustomFileInput = require('web.CustomFileInput');
    const pyUtils = require('web.py_utils');
    const SearchMenu = require('web.SearchMenu');

    const { useState } = owl;

    class Sidebar extends SearchMenu {
        constructor() {
            super(...arguments);
            this.state = useState({ open: false });
        }

        mounted() {
            this._addTooltips();
        }

        patched() {
            this._addTooltips();
        }

        //--------------------------------------------------------------------------
        // Properties
        //--------------------------------------------------------------------------

        get sections() {
            const items = this.items;
            return this.props.sections.filter(
                s => items[s.name].length || (s.name === 'files' && this.props.editable)
            );
        }

        get isOpen() {
            return this.state.open;
        }

        get items() {
            const actions = this.props.actions;
            const items = {};
            if (Object.keys(actions).length) {
                ['print', 'action', 'relate'].forEach(type => {
                    if (actions[type] && actions[type].length) {
                        const section = type === 'print' ? 'print' : 'other';
                        const newItems = actions[type].map(action => {
                            return { label: action.name, action };
                        });
                        if (!items[section]) {
                            items[section] = [];
                        }
                        items[section].unshift(...newItems);
                    }
                });
                if ('other' in actions) {
                    if (!items.other) {
                        items.other = [];
                    }
                    items.other.unshift(...actions.other);
                }
            }
            return Object.assign({}, this.props.items, items);
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Add teh tooltips to the items
         * @private
         */
        _addTooltips() {
            $(this.el.querySelectorAll('[title]')).tooltip({
                delay: { show: 500, hide: 0 }
            });
        }

        /**
         * @override
         * @private
         */
        _close() {
            this.state.open = false;
        }

        /**
         * Performs the action for the item clicked after getting the data
         * necessary with a trigger up
         * @private
         * @param  {Object} item
         */
        async _itemAction(item) {
            const activeIdsContext = {
                active_id: this.props.activeIds[0],
                active_ids: this.props.activeIds,
                active_model: this.props.model,
            };
            if (this.props.domain) {
                activeIdsContext.active_domain = this.props.domain;
            }

            const context = pyUtils.eval('context', new Context(this.props.context, activeIdsContext));
            const result = await this.rpc({
                route: '/web/action/load',
                params: {
                    action_id: item.action.id,
                    context: context,
                },
            });
            result.context = new Context(result.context || {}, activeIdsContext)
                .set_eval_context(context);
            result.flags = result.flags || {};
            result.flags.new_window = true;
            this.trigger('do_action', { action: result });
        }

        /**
         * @override
         * @private
         */
        _toggle() {
            this.state.open = !this.state.open;
        }


        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Method triggered when the user clicks on a toolbar dropdown
         * @private
         * @param {Object} item
         * @param {MouseEvent} ev
         */
        _onItemClicked(item, ev) {
            if (item.callback) {
                item.callback([item]);
            } else if (item.action) {
                this._itemAction(item);
            } else if (item.url) {
                return;
            }
            ev.preventDefault();
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onItemKeydown(ev) {
            if (ev.key === 'Escape') {
                ev.target.blur();
            }
        }
    }

    Sidebar.components = { CustomFileInput };
    Sidebar.defaultProps = {
        actions: {},
        editable: true,
        items: {
            print: [],
            other: [],
        },
        sections: [
            { name: 'print', label: _t('Print') },
            { name: 'other', label: _t('Action') },
        ],
    };
    Sidebar.props = null;
    Sidebar.template = 'Sidebar';

    return Sidebar;
});
