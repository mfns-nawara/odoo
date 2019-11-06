odoo.define('web.owl_dialog_tests', function (require) {
"use strict";

const OwlDialog = require('web.OwlDialog');

const makeTestEnvironment = require("web.test_env");
const testUtils = require("web.test_utils");

const { Component, tags, useState } = owl;
const { xml } = tags;

QUnit.module('core', {
    beforeEach() {
        testUtils.mock.patchRequestAnimationFrame();
    },
    afterEach() {
        testUtils.cleanTarget();
        testUtils.mock.unpatchRequestAnimationFrame();
    }
},
function () {
    QUnit.module('OwlDialog');

    QUnit.test("Dialog DOM movement", async function (assert) {
        assert.expect(11);

        await makeTestEnvironment({ _t: str => str });
        class Parent extends Component {
            constructor() {
                super(...arguments);
                this.state = useState({
                    first: false,
                    second: false,
                });
            }
        }
        Parent.components = { OwlDialog };
        Parent.template = xml`
            <div>
                <OwlDialog t-if="state.first"/>
                <OwlDialog t-if="state.second"/>
            </div>`;

        const parent = new Parent();
        await parent.mount(testUtils.prepareTarget());

        assert.containsNone(document.body, '.modal',
            "There should be no modal at first");

        parent.state.first = true;
        await testUtils.nextTick();

        assert.hasClass(document.body, 'modal-open',
            "Body should be aware that a modal is open");
        assert.ok([...document.body.children].find(child => child.classList.contains('modal')),
            "Modal should be a direct child of the document body");
        assert.containsOnce(parent, '.o_dialog_placeholder',
            "A placeholder should have been left behind the dialog when mounted");

        parent.state.second = true;
        await testUtils.nextTick();

        assert.containsN(document.body, '.modal', 2,
            "There should be two modals");
        assert.containsN(parent, '.o_dialog_placeholder', 2,
            "There should be 2 placeholders");

        parent.state.first = false;
        await testUtils.nextTick();

        assert.containsOnce(document.body, '.modal',
            "There should be one modal remaining");
        assert.hasClass(document.body, 'modal-open',
            "Body should still be aware that a modal is open");
        assert.hasClass(document.activeElement, 'modal',
            "Second modal should be the focused element");

        parent.unmount();

        assert.containsNone(document.body, '.modal',
            "There should be no modal left");
        assert.containsNone(parent, '.o_dialog_placeholder',
            "There should be no dialog placeholder left");

        parent.destroy();
    });

    QUnit.test("Rendering dialog content", async function (assert) {
        assert.expect(3);

        await makeTestEnvironment({ _t: str => str });
        class Parent extends Component {
            constructor() {
                super(...arguments);
                this.state = useState({
                    textContent: null,
                    subComponent: null,
                });
            }
        }
        Parent.components = { OwlDialog };
        Parent.template = xml`
            <div>
                <OwlDialog textContent="state.textContent" subComponent="state.subComponent"/>
            </div>`;

        class SubComponent extends Component {}
        SubComponent.template = xml`<div id="the_sub_component" t-esc="props.value"/>`;

        const parent = new Parent();
        await parent.mount(testUtils.prepareTarget());

        assert.strictEqual(document.querySelector('.modal .modal-body').innerHTML, "",
            "There should be no initial content");

        parent.state.textContent = "Oui";
        await testUtils.nextTick();

        assert.strictEqual(document.querySelector('.modal .modal-body').innerHTML, "Oui",
            "Text content should be set");

        parent.state.subComponent = {
            component: SubComponent,
            props: { value: "Non" },
        };
        await testUtils.nextTick();

        assert.strictEqual(document.getElementById('the_sub_component').innerHTML, "Non",
            "Subcomponent should override text content and be rendered");

        parent.destroy();
    });

    QUnit.test("Clicking on dialog button (no button set)", async function (assert) {
        assert.expect(8);

        await makeTestEnvironment({ _t: str => str });
        const testPromise = testUtils.makeTestPromiseWithAssert(assert, 'dialog closed');
        class Parent extends Component {
            constructor() {
                super(...arguments);
                this.state = useState({ dialog: true });
            }
            // Handlers
            _onDialogButtonClicked(ev) {
                assert.step('dialog_button_clicked');
                assert.strictEqual(ev.detail.button.attrs.class, 'btn btn-primary',
                    "button should be the default one");
                this.state.dialog = false;
            }
            _onDialogClosed() {
                assert.step('dialog_closed');
                testPromise.resolve();
            }
        }
        Parent.components = { OwlDialog };
        Parent.template = xml`
            <div>
                <OwlDialog t-if="state.dialog"
                    t-on-dialog_button_clicked.stop.prevent="_onDialogButtonClicked"
                    t-on-dialog_closed.stop.prevent="_onDialogClosed"
                />
            </div>`;

        const parent = new Parent();
        await parent.mount(testUtils.prepareTarget());

        assert.verifySteps([]);

        assert.isVisible(document.querySelector('.modal'),
            "Modal should be opened and visible");

        await testUtils.dom.click(document.querySelector('div.modal button.btn-primary'));
        await testPromise;

        assert.containsNone(document.body, '.modal',
            "Modal should be closed");

        assert.verifySteps(['dialog_button_clicked', 'dialog_closed', 'ok dialog closed']);

        parent.destroy();
    });

    QUnit.test("Clicking on dialog button (buttons set)", async function (assert) {
        assert.expect(8);

        await makeTestEnvironment({ _t: str => str });
        const testPromise = testUtils.makeTestPromiseWithAssert(assert, 'dialog closed');
        class Parent extends Component {
            constructor() {
                super(...arguments);
                this.state = useState({ dialog: true });
            }
            // Handlers
            _onDialogButtonClicked(ev) {
                assert.step('dialog_button_clicked');
                assert.deepEqual(ev.detail.button, { text: "Close" },
                    "button should be the default one");
                this.state.dialog = false;
            }
            _onDialogClosed() {
                assert.step('dialog_closed');
                testPromise.resolve();
            }
        }
        Parent.components = { OwlDialog };
        Parent.template = xml`
            <div>
                <OwlDialog t-if="state.dialog"
                    buttons="[{ text: 'Close' }]"
                    t-on-dialog_button_clicked.stop.prevent="_onDialogButtonClicked"
                    t-on-dialog_closed.stop.prevent="_onDialogClosed"
                />
            </div>`;

        const parent = new Parent();
        await parent.mount(testUtils.prepareTarget());

        assert.verifySteps([]);

        assert.isVisible(document.querySelector('.modal'),
            "Modal should be opened and visible");

        await testUtils.dom.click(document.querySelector('div.modal button.btn-primary'));
        await testPromise;

        assert.containsNone(document.body, '.modal',
            "Modal should be closed");

        assert.verifySteps(['dialog_button_clicked', 'dialog_closed', 'ok dialog closed']);

        parent.destroy();
    });

    QUnit.test("Closing dialog without clicking on buttons", async function (assert) {
        assert.expect(4);

        await makeTestEnvironment({ _t: str => str });
        const testPromise = testUtils.makeTestPromiseWithAssert(assert, 'dialog closed');
        class Parent extends Component {
            constructor() {
                super(...arguments);
            }
            // Handlers
            _onDialogButtonClicked() {
                testPromise.reject();
            }
            _onDialogClosed() {
                assert.step('dialog_closed');
                testPromise.resolve();
            }
        }
        Parent.components = { OwlDialog };
        Parent.template = xml`
            <OwlDialog
                t-on-dialog_button_clicked.stop.prevent="_onDialogButtonClicked"
                t-on-dialog_closed.stop.prevent="_onDialogClosed"
            />`;

        const parent = new Parent();
        await parent.mount(testUtils.prepareTarget());

        assert.verifySteps([]);

        await testUtils.dom.triggerEvent(document.querySelector('div.modal[role="dialog"]'), 'keydown', { which: 27 });
        await testPromise;

        assert.verifySteps(['dialog_closed', 'ok dialog closed']);

        parent.destroy();
    });
});

});
