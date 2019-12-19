odoo.define('web.custom_hooks', function (require) {
    "use strict";

    const { Component, hooks } = owl;
    const { onMounted, onPatched, onWillUnmount } = hooks;

    /**
     * Give the focus to the first element matching the given DOMString selector.
     * If the element is an input or a textarea, will put set the selection at
     * the end of its value. If no element is found or the element is the same as
     * the previous target, no action is performed.
     * The evaluation will be done when mounted and on each patch.
     *
     * @param {string} [selector='[autofocus]'] Valid DOMString. If no value set,
     *      will select the first element having an `autofocus` attribute.
     * @param {boolean} [once=false] The hook will become inactive if this is set
     *      to true and a target has been successfully focused at least once.
     */
    function useAutofocus(selector = '[autofocus]', once = false) {
        const component = Component.current;
        let previousTarget = null;
        let done = false;
        function focusSelector() {
            const target = component.el.querySelector(selector);
            if (target && previousTarget !== target && !(once && done)) {
                target.focus();
                done = true;
                if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                    target.selectionStart = target.selectionEnd = target.value.length;
                }
            }
            previousTarget = target;
        }
        onMounted(focusSelector);
        onPatched(focusSelector);
    }

    /**
     * When component needs to listen to DOM Events on element(s) that is not part of his hierarchy, we can use
     * `useExternalListener` hook.
     * It will correctly add and remove the event listener.
     *
     * Example:
     *  a menu needs to listen to the click on window to be closed automatically
     *
     * Usage:
     *  in the constructor of the OWL component that needs to be notified,
     *  `useExternalListener(window, 'click', this._doSomething);` listen to the click event on window and call
     *  `this._doSomething` function of the component when the click happened
     * @param {EventTarget} target
     * @param {string} eventName
     * @param {Function} handler
     */
    function useExternalListener(target, eventName, handler) {
        const boundHandler = handler.bind(Component.current);

        onMounted(() => target.addEventListener(eventName, boundHandler));
        onWillUnmount(() => target.removeEventListener(eventName, boundHandler));
    }

    return {
        useAutofocus,
        useExternalListener,
    };
});
