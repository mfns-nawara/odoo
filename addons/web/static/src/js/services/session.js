odoo.define('web.session', function (require) {
"use strict";

var Session = require('web.Session');
var modules = odoo._modules;

var session = new Session(undefined, undefined, {modules: modules, use_cors: false});
console.log(`AKU - binding session`);
session.is_bound = session.session_bind();
session.is_bound.then(() => { console.log(`AKU - session is bound`); });

return session;

});
