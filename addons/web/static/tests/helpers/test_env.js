odoo.define("web.test_env", async function (require) {
    "use strict";

    const core = require("web.core");
    const config = require("web.config");
    const session = require("web.session");
    const rpc = require("web.rpc");
    const OdooQWeb = require("web.OdooQWeb");

    const _t = core._t;

    let templates = null;

    /**
     * Creates a test environment with the given environment object.
     * Some methods will throw an error if called while not being explicitly implemented.
     * This behaviour can be override by providing the name of one of the env
     * properties in the 'using' arguments.
     *
     * @param {Object} [env={}]
     * @param  {...string} [using] keywords to use a specific service's default methods.
     *      e.g. 'useSession' will use the default 'web.services' methods.
     *      Available default properties:
     *      - bus (useBus)
     *      - config (useConfig)
     *      - session (useSession)
     */
    async function makeTestEnvironment(env = {}, ...using) {
        /**
         * Helper allowing to prevent the use of some functions if they are not implemented
         * first in the `env` object.
         *
         * @param {string} fnPath dot-separated path to parent object, that will be called from
         *      the env object (e.g. services = 'env.services')
         * @param {Function} [callback] custom callback to be called as a wrapper: it
         *      will take the implemented function as the first argument and will
         *      transmit the remaining arguments.
         */
        function _mandatory(fnPath) {
            return function () {
                const properties = fnPath.split('.');
                throw new Error(`Method "${properties.pop()}" not implemented in object "${['env', ...properties].join('.')}"`);
            };
        }

        // Bus
        // const testBus = 'useBus' in using ? bus :
        //     Object.assign({}, bus, {
        //         // mandatory bus functions
        //         // ...
        //     });

        // Config
        const testConfig = 'useConfig' in using ? config :
            Object.assign({}, config, {
                isDebug: _mandatory('config.isDebug'),
                // ...
            }, env.config);

        // RPC
        const testRPC = 'rpc' in env ?
            function (params, options) {
                const query = rpc.buildQuery(params);
                return env.rpc(query.route, query.params, options);
            } :
            _mandatory('rpc');

        // Services
        const testServices = Object.assign({
            blockUI: _mandatory('services.blockUI'),
            getCookie: _mandatory('services.getCookie'),
            navigate: _mandatory('services.navigate'),
            reloadPage: _mandatory('services.reloadPage'),
            setCookie: _mandatory('services.setCookie'),
            unblockUI: _mandatory('services.unblockUI'),
            // ...
        }, env.services);

        // Session
        const testSession = 'useSession' in using ? session :
            Object.assign({}, session, {
                // mandatory session functions
                // ...
            }, env.session);

        // Translation
        const testTranslate = '_t' in env ? env._t : _mandatory('_t');

        if (!templates) {
            await session.is_bound;
            templates = session.templatesString.replace(/t-transition/g, 'transition');
        }
        const testQweb = new OdooQWeb({ translateFn: str => str });
        testQweb.addTemplates(templates);

        // TODO: we should not always add bus
        // --> general problem: how to extend correctly the env
        // use option like useBus, useConfig,... ?
        // TODO: allow to use mockReadGroup,... ?
        owl.config.env = {
            bus: core.bus,
            config: testConfig,
            qweb: testQweb,
            rpc: testRPC,
            services: testServices,
            session: testSession,
            _t: testTranslate,
        };
    }

    return makeTestEnvironment;

});
