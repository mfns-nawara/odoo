odoo.define("web.test_env", async function(require) {
    "use strict";

    const config = require("web.config");
    const core = require("web.core");
    const session = require("web.session");
    const rpc = require("web.rpc");
    const OdooQWeb = require("web.OdooQWeb");

    const _t = core._t;

    let templates = null;

    async function makeTestEnvironment(env = {}) {

        function getCookie() {
            throw new Error("getCookie method not provided");
        }
        function navigate(url, params) {
            throw new Error("navigate method not provided");
        }
        function performRPC(params, options) {
            if (env.rpc) {
                const query = rpc.buildQuery(params);
                return env.rpc(query.route, query.params, options);
            }
            throw new Error("rpc method not provided");
        }
        function setCookie() {
            throw new Error("setCookie method not provided");
        }
        function test_env__t() {
            if (env._t) {
                return env._t(...arguments);
            }
            throw new Error("_t method not provided");
        }
        function blockUI(params) {
            throw new Error("blockUI method not provided");
        }
        function unblockUI() {
            throw new Error("unblockUI method not provided");
        }

        const services = Object.assign({
            setCookie,
            getCookie,
            navigate,
            blockUI,
            unblockUI,
        }, env.services);
        const fakeSession = Object.assign({}, env.session);
        // TODO: allow to use mockReadGroup,... ?

        if (!templates) {
            await session.is_bound;
            templates = session.templatesString
                .split('t-transition')
                .join('transition');
        }
        const qweb = new OdooQWeb({ translateFn: _t });
        qweb.addTemplates(templates);

        owl.config.env = {
            qweb,
            _t: test_env__t,
            // TODO: we should not always add bus
            // --> general problem: how to extend correctly the env
            // use option like useBus, useConfig,... ?
            bus: core.bus,
            // TODO: we should not always add config, services,...
            config: config,
            rpc: performRPC,
            services: services,
            session: fakeSession
        };
    }

    return makeTestEnvironment;
});
