odoo.define('board.AddToBoardMenu', function (require) {
    "use strict";

    const Context = require('web.Context');
    const Domain = require('web.Domain');
    const favoritesSubmenusRegistry = require('web.favorites_submenus_registry');
    const pyUtils = require('web.py_utils');
    const SearchMenuItem = require('web.SearchMenuItem');
    const { useAutofocus } = require('web.custom_hooks');

    const { useState, useStore } = owl.hooks;

    class AddToBoardMenu extends SearchMenuItem {
        /**
         * @param {Object} props
         * @param {Object} props.action an ir.actions description
         */
        constructor() {
            super(...arguments);
            this.interactive = true;
            this.query = useStore(state => state.query, { store: this.env.controlPanelStore });
            this.state = useState({
                open: false,
                name: this.props.action.name || "",
            });

            useAutofocus();
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * This is the main function for actually saving the dashboard.  This method
         * is supposed to call the route /board/add_to_dashboard with proper
         * information.
         *
         * @private
         * @returns {Promise}
         */
        async _addToBoard() {
            const context = new Context(this.props.action.context);
            context.add(this.query.context);
            context.add({
                group_by: this.query.groupBy,
                orderedBy: this.query.orderedBy,
            });

            this.trigger('get_controller_query_params', {
                callback(params) {
                    const controllerQueryParams = Object.assign({}, params);
                    const queryContext = controllerQueryParams.context;
                    delete controllerQueryParams.context;
                    context.add(Object.assign(controllerQueryParams, queryContext));
                }
            });

            const domainArray = new Domain(this.props.action.domain || []);
            const domain = Domain.prototype.normalizeArray(domainArray.toArray().concat(this.query.domain));

            const evalutatedContext = pyUtils.eval('context', context);
            for (const key in evalutatedContext) {
                if (evalutatedContext.hasOwnProperty(key) && /^search_default_/.test(key)) {
                    delete evalutatedContext[key];
                }
            }
            evalutatedContext.dashboard_merge_domains_contexts = false;

            this.state.open = false;

            const result = await this.rpc({
                route: '/board/add_to_dashboard',
                params: {
                    action_id: this.props.action.id || false,
                    context_to_save: evalutatedContext,
                    domain: domain,
                    // TODO: include viewType in props or transmit it another way
                    view_mode: this.props.viewType,
                    name: this.state.name,
                },
            });
            if (result) {
                this._doNotify(
                    _.str.sprintf(this.env._t("'%s' added to dashboard"), this.state.name),
                    this.env._t('Please refresh your browser for the changes to take effect.')
                );
            } else {
                this._doWarn(this.env._t("Could not add filter to dashboard"));
            }
        }

        _doNotify(title, message) {
            this.env.bus.trigger('call_service', {
                data: {
                    args: [{ title, message, type: 'warning' }],
                    callback: _ => _,
                    method: 'notify',
                    service: 'notification',
                },
            });
        }

        _doWarn(title, message) {
            this.env.bus.trigger('call_service', {
                data: {
                    args: [{ title, message, type: 'danger' }],
                    callback: _ => _,
                    method: 'notify',
                    service: 'notification',
                },
            });
        }


        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onInputKeydown(ev) {
            switch (ev.key) {
                case 'Enter':
                    ev.preventDefault();
                    this._addToBoard();
                    break;
                case 'Escape':
                    // Gives the focus back to the component.
                    ev.preventDefault();
                    ev.target.blur();
                    break;
            }
        }

        /**
         * @private
         * @param {InputEvent} ev
         */
        _onInput(ev) {
            this.state.name = ev.target.value;
        }
    }

    AddToBoardMenu.template = 'AddToBoardMenu';

    favoritesSubmenusRegistry.add('add_to_board_menu', {
        actWindowOnly: true,
        component: AddToBoardMenu,
    }, 10);

    return AddToBoardMenu;
});
