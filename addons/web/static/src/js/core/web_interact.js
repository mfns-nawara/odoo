odoo.define('web.interact', function (require) {
"use strict";

//--------------------------------------------------------------------------
// Draggable
//--------------------------------------------------------------------------

var currentlyDraggingClass = 'o_draggable_moving';

/**
 * Store current values of CSS properties that will change while dragging.
 *
 * @param {DOMElement} el
*/
var _storeDraggableProperties = function(el) {
    el.dataset.draggableOriginalHeight = el.style.height;
    el.dataset.draggableOriginalLeft = el.style.left;
    el.dataset.draggableOriginalPosition = el.style.position;
    el.dataset.draggableOriginalTop = el.style.top;
    el.dataset.draggableOriginalWidth = el.style.width;
    el.dataset.draggableOriginalTransition = el.style.transition;
    el.dataset.draggableOriginalZIndex = el.style.zIndex;
};

/**
 * Reset CSS properties to what they were before dragging.
 *
 * @param {DOMElement} el
 * @param {integer} [delay] in ms for the reset animation
*/
var _resetDraggableProperties = function (el) {
    el.style.height = el.dataset.draggableOriginalHeight;
    delete el.dataset.draggableOriginalHeight;
    el.style.left = el.dataset.draggableOriginalLeft;
    delete el.dataset.draggableOriginalLeft;
    el.style.position = el.dataset.draggableOriginalPosition;
    delete el.dataset.draggableOriginalPosition;
    el.style.top = el.dataset.draggableOriginalTop;
    delete el.dataset.draggableOriginalTop;
    el.style.transition = el.dataset.draggableOriginalTransition;
    delete el.dataset.draggableOriginalTransition;
    el.style.width = el.dataset.draggableOriginalWidth;
    delete el.dataset.draggableOriginalWidth;
    el.style.zIndex = el.dataset.draggableOriginalZIndex;
    delete el.dataset.draggableOriginalZIndex;
};

/**
 * Make an element draggable.
 * For more details on the parameters, see the doc of interactjs.
 *
 * @param {DOMElement} el
 * @param {Object} [options]
 * @param {Function} [options.onstart] function called when dragging starts
 * @param {Function} [options.onmove] function called when dragging moves
 * @param {Function} [options.onend] function called when dragging ends
 * @param {Object} [options.restrict] dragging area restriction data
 * @returns {Interactable}
 */
var _draggable = function (el, options) {
    var options = options || {};
    var interactOptions = {
        // On drag start, we prepare the element to be dragged around.
        onstart: function (ev) {
            var target = ev.target;
            _storeDraggableProperties(target);

            // Freeze the dimensions of the element as it appears now, since
            // it may have a size that is dependent on his parent, in which
            // case absolute positioning would result in different dimensions.
            var computedStyle = window.getComputedStyle(target);
            target.style.height = computedStyle.height;
            target.style.width = computedStyle.width;

            // Absolute positioning in itself
            // We use the same zIndex as jQuery-ui sortable
            var xPosition = target.offsetLeft;
            var yPosition = target.offsetTop;
            target.style.position = 'absolute';
            target.style.zIndex = 1000;
            target.style.left = xPosition + 'px';
            target.style.top = yPosition + 'px';

            // Store current left and top positions for later update
            target.dataset.draggableX = xPosition;
            target.dataset.draggableY = yPosition;

            // We started dragging this element so we don't want to trigger its
            // click handlers for the entirety of the dragging session, even
            // though we will eventually trigger down and up events on the same
            // element since we set it to follow the position of the pointer.
            // We need to set capture true to interecept the event before the
            // bubbling phase so that this handler is called first.
            el.dataset.draggablePreventClick = true;
            var preventClick = function (ev) {
                if (el.dataset.draggablePreventClick) {
                    delete el.dataset.draggablePreventClick;
                    ev.stopImmediatePropagation();
                }
                ev.currentTarget.removeEventListener('click', preventClick, {
                    capture: true,
                });
            }
            el.addEventListener('click', preventClick, { capture: true });

            target.classList.add(currentlyDraggingClass);
            if (options.onstart) {
                options.onstart(ev);
            }
        },

        // On drag move, we update the element position with the move delta
        onmove: function (ev) {
            var target = ev.target;
            // Unfortunately, target.style.left/top returns the values including
            // units (e.g. "100px") which makes it complicated to use in
            // computations. Hence our choice to store these properly.
            var xPosition = parseFloat(target.dataset.draggableX) + ev.dx;
            var yPosition = parseFloat(target.dataset.draggableY) + ev.dy;
            target.style.left = xPosition + 'px';
            target.style.top = yPosition + 'px';
            target.dataset.draggableX = xPosition;
            target.dataset.draggableY = yPosition;

            if (options.onmove) {
                options.onmove(ev);
            }
        },

        // On drag end, we remove the currently dragged class.
        // We don't reset the properties of the element as this would result in
        // the same state as before dragging. These properties can be accessed
        // by the user in its own onend function if needed.
        onend: function (ev) {
            ev.target.classList.remove(currentlyDraggingClass);

            if (options.onend) {
                options.onend(ev);
            }
        }
    };

    if (options.restrict) {
        interactOptions.restrict = options.restrict;
    }

    return interact(el).draggable(interactOptions);
};

//--------------------------------------------------------------------------
// Sortable
//--------------------------------------------------------------------------

var sortableClass = 'o_sortable';
var sortableHandleClass = sortableClass + '_handle';
var placeholderIdentifier = sortableClass + '_placeholder';

/**
 * Returns the first placeholder found in an element or null if there is none.
 *
 * @param {DOMElement} el
 * @returns {DOMElement|null}
 */
var _getPlaceholder = function (el) {
    return el.querySelector('#' + placeholderIdentifier);
};

/**
 * Set a placeholder for a given item before a given anchor in a given sortable.
 * This function also removes previously existing placeholders if any.
 *
 * @param {DOMElement} sortable
 * @param {DOMElement} item
 * @param {DOMElement} anchor
 * @param {string} connectWith
 * @returns {DOMElement|null}
 */
var _setPlaceholder = function (sortable, item, anchor, connectWith) {
    // Only update the placeholder if it would move it somewhere else
    if (!anchor || anchor.id != placeholderIdentifier) {
        // The placeholder should be unique among all connectWith sortables
        var placeholder = _getPlaceholder(connectWith ? document: sortable);
        if (!placeholder) {
            // Generate a brand new placeholder by deep cloning the dragged
            // item since we need its content so that it can have the same size.
            // Just manually setting the size would not work as it would force
            // the placeholder to have a size in contexts where the items
            // themselves have no size. (e.g. records in folded column)
            placeholder = item.cloneNode(true); // deep cloning
            placeholder.id = placeholderIdentifier;
            placeholder.style.opacity = 0;
            placeholder.classList.remove(currentlyDraggingClass);
            _resetDraggableProperties(placeholder);
        }

        // Clean previous placeholders
        if (connectWith) {
            var sortables = document.querySelectorAll(connectWith)
            sortables.forEach(function (currentSortable) {
                _cleanPlaceholder(currentSortable);
            });
        } else {
            _cleanPlaceholder(sortable);
        }

        // Placeholder insertion per se
        var parent = anchor ? anchor.parentNode: sortable;
        parent.insertBefore(placeholder, anchor);
    }
};

/**
 * Clean the placeholder from a given sortable.
 *
 * @param {DOMElement} sortable
 */
var _cleanPlaceholder = function (sortable) {
    var placeholder = _getPlaceholder(sortable);
    if (placeholder) {
        placeholder.remove();
    }
};

/**
 * Make an element sortable.
 * For more details on the parameters, see the doc of interactjs.
 *
 * @param {DOMElement} el
 * @param {Object} [options]
 * @param {string} [options.itemsSelector] selector identifying acceptable items
 * @param {Function} [options.ondropactivate] called on drag start of valid item
 * @param {Function} [options.ondragenter] called on drag enter of valid item
 * @param {Function} [options.onsort] called on sorting items while dragging
 * @param {Function} [options.ondrop] called on drop of valid item
 * @param {Function} [options.ondragleave] called on drag leave of valid item
 * @param {Function} [options.ondropdectivate] called on drag stop of valid item
 * @param {string} [options.axis] constrained axis
 * @param {string} [options.connectWith] selector for other connected sortables
 * @param {string} [options.containment] selector for restricted items drag area
 * @param {string} [options.handle] restrict dragging to this selector
 * @param {string} [options.revert] time in ms for animation when dropped
 * @param {string} [options.tolerance] overlaps are computed with respect to the
 *        element being dragged. Set this parameter to 'pointer' to compute the
 *        overlaps relative to the pointer itself rather than the element.
 * @returns {Interactable}
 */
var _sortable = function (el, options) {
    var options = options || {};
    var axis = options.axis;
    var connectWith = options.connectWith;
    var containment = options.containment;
    var handle = options.handle;
    var items = options.items;
    var tolerance = options.tolerance;

    // We need this sortable to be uniquely targettable because the selector we
    // will be using for setting up the sortable items as dropzones need to
    // target items of this sortable only and nothing else as its code depend
    // on the value of el in this function, which is the sortable itself. If
    // the selector was to match items from other sortables, all computation
    // would occur multiple times for the same item, which would be useless, but
    // it would actually be computed with a wrong value for el most of the time.
    // To achieve this unique selector goal, we set an id on the sortable.
    if (!el.id) {
        el.id = _.uniqueId(sortableClass + '_');
    }
    var itemsSelector = '#' + el.id + ' ' + options.items;

    /**
     * Checks whether an element is a valid item for this droppable. It needs to
     * either be a children of this sortable (already computed by the drop
     * argument of interactjs checker function) or, if we are in connectWith
     * mode, be a children of a connected sortable.
     * Note: We only need a few of the arguments of interactjs checker function.
     *
     * @param {InteractEvent} dragEv related dragmove or dragend event
     * @param {Event} ev the original event related to the dragEvent
     * @param {boolean} drop value from interactjs default drop checker
     * @param {Interactable} dropObj interactjs object of droppable element
     * @param {DOMElement} dropEl droppable element
     * @param {Interactable} dragObj interactjs object of draggable element
     * @param {DOMElement} dragEl draggable element
     * @returns {boolean} whether the draggable item is valid for this droppable
     *
     */
    var check = function (dragEv, ev, drop, dropObj, dropEl, dragObj, dragEl) {
        var fromThisSortable = el.contains(dragEl);
        var fromConnectedSortable = connectWith && dragEl.closest(connectWith);
        return drop && (fromThisSortable || fromConnectedSortable);
    }

    /**
     * When dragging starts, creates the very first placeholder in the sortable
     * containing the currenty dragged item and make all items in this sortable
     * into a dropzone so they can react to the item being dragged over them.
     *
     * @param {InteractEvent} ev dropactivate event
     * @param {DOMElement} ev.target dropzone element activating
     * @param {DOMElement} ev.relatedTarget currently dragged element
     *
     */
    var ondropactivate = function (ev) {
        // Create the very first placeholder in the spot of the draggable item
        var sortable = ev.target;
        var draggable = ev.relatedTarget;
        var anchor = draggable.nextSibling;
        if (sortable.contains(draggable)) {
            _setPlaceholder(sortable, draggable, anchor, connectWith);
        }

        // Set droppable on all items in this sortable
        if (items && !el.dataset.sortableItemsActivated) {
            el.dataset.sortableItemsActivated = true;

            /**
             * When a draggable item is being dragged over other items of this
             * sortable, check if the items need to make way for the placeholder
             * then set the placeholder to its correct position.
             *
             * @param {InteractEvent} ev dropmove event
             * @param {InteractEvent} ev.dragEvent related dragmove event
             * @param {float} ev.dragEvent.dx pointer move x coordinates delta
             * @param {float} ev.dragEvent.dy pointer move y coordinates delta
             * @param {DOMElement} ev.target dropzone element activating
             * @param {DOMElement} ev.relatedTarget currently dragged element
             *
             */
            var ondropmove = function (ev) {
                var drop = ev.target;
                var drag = ev.relatedTarget;
                var dy = ev.dragEvent.dy;
                var dx = ev.dragEvent.dx;

                var shouldMakeWay = true;
                // We trust interactjs for overlap pointer, but overlap
                // center only tests if the center of the draggable is
                // currently inside the dropzone element, which is not
                // enough for us. We want to only make way if the center of
                // the draggable has crossed the center of the dropzone.
                if (tolerance !== 'pointer') {
                    var crossedY;
                    var crossedX;
                    var dropRect = drop.getBoundingClientRect();
                    var dragRect = drag.getBoundingClientRect();
                    if (!axis || axis === 'y') {
                        var dropY = dropRect.top + dropRect.height / 2;
                        var dragY = dragRect.top + dragRect.height / 2;
                        crossedY = dy > 0 === dragY > dropY;
                    }
                    if (!axis || axis === 'x') {
                        var dropX = dropRect.left + dropRect.width / 2;
                        var dragX = dragRect.left + dragRect.width / 2;
                        crossedX = dx > 0 === dragX > dropX;
                    }
                    shouldMakeWay = crossedY || crossedX;
                }

                if (shouldMakeWay) {
                    var anchor = ev.target;
                    // If the pointer comes from above or directly left,
                    // the placeholder must come after the item.
                    if (dy > 0 || (dy === 0 && dx > 0)) {
                        anchor = anchor.nextSibling;
                    }
                    _setPlaceholder(el, drag, anchor, connectWith);

                    if (options.onsort) {
                        options.onsort(ev);
                    }
                }
            };

            // It is very important that we call interact on the itemsSelector
            // directly rather than each of the nodes matching this selector
            // separately. Calling interact with a selector matching a single
            // node or calling it with the node itself would yield two different
            // interactable objects. This is absolutely critical to the way we
            // are using sortable in Odoo as each kanban column is, at the same
            // time, a sortable for records AND one of the items of the sortable
            // view itself, since columns themselves are sortable. In other
            // words, columns need to be a dropzone because we can drop records
            // in it, but it also needs to be a dropzone to react to other
            // columns being dragged over it. However, you cannot setup two
            // different dropzones on the same interactable object, so we set
            // the dropzone of the sortable parent on the node itself while we
            // set the dropzones of the items on the selector.
            var itemsInteractable = interact(itemsSelector).dropzone({
                accept: items,
                checker: check,
                overlap: tolerance || 'center',
                ondropactivate: options.onitemdropactivate,
                ondropmove: ondropmove,
                ondropdeactivate: options.onitemdropdeactivate,
            });

            // When we enter here for the first time, ondropactivate
            // has already been fired, but it was not fired on the
            // children since they were not droppable yet, so we
            // need to fire it manually.
            el.querySelectorAll(itemsSelector).forEach(function (item) {
                if (item !== draggable) {
                    var ondropactivateEvent = Object.assign({}, ev);
                    ondropactivateEvent.dropzone = itemsInteractable;
                    ondropactivateEvent.target = item;
                    itemsInteractable.fire(ondropactivateEvent);
                }
            });
        }

        if (options.ondropactivate) {
            options.ondropactivate(ev);
        }
    };

    /**
     * When a dragged item enters the sortable, create a placeholder at the
     * end of the sortable, no matter where the dragged item is entering the
     * sortable from. This is similar to jQuery-ui behavior.
     *
     * @param {InteractEvent} ev dragenter event
     * @param {DOMElement} ev.target dropzone element activating
     * @param {DOMElement} ev.relatedTarget currently dragged element
     *
     */
    var ondragenter = function (ev) {
        if (!_getPlaceholder(el)) {
            // We need to check for existing placeholders as hovering the
            // placeholder itselfs is considered as hovering the sortable since
            // the placeholder is not considered as an item on its own.
            _setPlaceholder(el, ev.relatedTarget, null, connectWith);
        }

        if (options.ondragenter) {
            options.ondragenter(ev);
        }
    };

    /**
     * When dragging stops, move the item into the spot of the last placeholder,
     * then remove the placeholder and reset the item draggable properties.
     * The move is asynchronous if revert is defined for this sortable because
     * it needs to wait for the end of the animation to avoid interrupting it.
     *
     * @param {InteractEvent} ev dragstop event
     * @param {DOMElement} ev.target dropzone element activating
     * @param {DOMElement} ev.relatedTarget currently dragged element
     *
     */
    var ondropdeactivate = function (ev) {
        var sortable = ev.target;
        var draggable = ev.relatedTarget;
        if (options.ondropdeactivate) {
            options.ondropdeactivate(ev);
        }

        var placeholder = _getPlaceholder(ev.target);
        if (placeholder) {
            // Revert is a custom option of sortable that is overridden in tests
            var revert;
            if ('revert' in interact(el).options) {
                revert = interact(el).options.revert;
            } else {
                revert = options.revert;
            }

            var move = function () {
                placeholder.parentNode.insertBefore(draggable, placeholder);
                _cleanPlaceholder(sortable);

                // The position in the DOM has been updated, we can undo the CSS
                // trick that made them draggable like absolute positioning etc.
                _resetDraggableProperties(draggable);
                // Interactjs draggable displays a 'move' cursor when hovering
                // an element that has previously been set to draggable. As long
                // as we do not set draggable on all sortable items directly, we
                // need to counteract this behavior as some items will have a
                // 'move' cursor (the already enabled ones) and some won't.
                interact(draggable).draggable(false);

                if (options.ondrop) {
                    options.ondrop(ev);
                }
            }

            if (revert) {
                draggable.style.transitionProperty = 'left, top';
                draggable.style.transitionDuration = revert + 'ms';
                draggable.style.left = placeholder.offsetLeft + 'px';
                draggable.style.top = placeholder.offsetTop + 'px';
                setTimeout(move, revert);
            } else {
                move();
            }
        }
    };

    // Make el interactjs droppable
    var interactable = interact(el).dropzone({
        accept: items,
        checker: check,
        overlap: tolerance || 'center',
        ondropactivate: ondropactivate,
        ondragenter: ondragenter,
        ondragleave: options.ondragleave,
        ondropdeactivate: ondropdeactivate
    });

    // Enable recomputation of distances while dragging
    interact.dynamicDrop(true);

    // Set draggable on items on first pointerdown as some items might not be in
    // the dom yet so we can't just simply set draggable on them now.
    _bindCrossBrowserPointerEvent(el, 'pointerdown', function (ev) {
        // Only allow to drag from the handle if it is defined.
        // Any part of any item is valid for dragging otherwise.
        var item = ev.target.closest(items);
        var itemHandle = handle ? ev.target.closest(handle): item;
        if (item && itemHandle) {
            if (!item.dataset.sortableItemDraggable) {
                var itemsDraggableOptions = {};
                if (handle) {
                    itemsDraggableOptions.allowFrom = handle;
                }
                if (containment || axis) {
                    // Restrict the items to stay in the designated area
                    // Axis implies containment to the parent. Free movement is
                    // possible only in the given axis while the other axis is
                    // confined within the parent.
                    itemsDraggableOptions.restrict = {
                        restriction: containment || 'parent',
                    };

                    // The elementRect option of interactjs is quite obnoxious.
                    // It defines which area of the draggable item should be
                    // considered when computing collision for the restriction.
                    // For the left and right properties, 0 means the left edge
                    // of the element and 1 means the right edge. For top and
                    // bottom, 0 means the top edge of the element and 1 means
                    // the bottom.
                    // ex: { top: 0.25, left: 0.25, bottom: 0.75, right: 0.75 }
                    // would result in a quarter of the element being allowed to
                    // hang over the restriction edges.
                    var elementRect;
                    if (containment) {
                        elementRect = { top: 0, left: 0, bottom: 1, right: 1};
                    } else if (axis === 'y') {
                        elementRect = { top: 1, left: 0, bottom: 0, right: 1};
                    } else if (axis === 'x') {
                        elementRect = { top: 0, left: 1, bottom: 1, right: 0 };
                    }
                    itemsDraggableOptions.restrict.elementRect = elementRect;
                }
                _draggable(item, itemsDraggableOptions);
                item.dataset.sortableItemDraggable = true;
                itemHandle.classList.add(sortableHandleClass);
            } else {
                // Dragging has already been setup but was disabled to prevent
                // interactjs from displaying a move cursor. Re-enable it.
                interact(item).draggable(true);
            }
        }
    });

    el.classList.add(sortableClass);
    return interactable;
};

var lastTouchTime;
var legacyEvents = {
    pointerdown: {
        mouse: 'mousedown',
        touch: 'touchstart',
    },
    pointermove: {
        mouse: 'mousemove',
        touch: 'touchmove',
    },
    pointerup: {
        mouse: 'mouseup',
        touch: 'touchend',
    },
    pointercancel: {
        touch: 'touchcancel',
    },
};
var supportsPointerEvent = window.PointerEvent;
var supportsTouch = 'ontouchstart' in window;
/**
 * Bind a handler to a pointer event or its corresponding touch and mouse
 * equivalents if the browser does not support pointer events.
 *
 * @param {DomElement} el node on which the handler must be bound
 * @param {string} eventName pointerdown|pointermove|pointerup|pointercancel
 * @param {function} handler to bind on the pointer event
 */
var _bindCrossBrowserPointerEvent = function (el, eventName, handler) {

    if (supportsPointerEvent) { // Most modern browsers except Safari
        el.addEventListener(eventName, handler);

    } else if (supportsTouch) { // iOS and some obscure lesser-known browsers
        // Browsers may simulate mouse events after touch events, which would
        // trigger the handler twice. A simple preventDefault should prevent it.
        // Source: https://developer.mozilla.org/docs/Web/API/Touch_events
        var guardedHandler = function (ev) {
            ev.preventDefault();

            // Some browsers do not respect the preventDefault trick. In such
            // cases, we chose to use the same set of heuristics as interact.js
            // to detect simulated mouse events. The first one is to check if
            // the mouse event is fired suspiciously too close to the touch
            // event to be legit. However, since this is pretty weak and will
            // not always suffice, another heuristic is to look at the timestamp
            // of the event, which is set to 0 by some browsers when simulated.
            var simulatedEvent = false;
            if (/touch/.test(event.type)) {
                lastTouchTime = new Date().getTime();

            } else if (/mouse/.test(event.type)) {
                var suspicious = new Date().getTime() - lastTouchTime < 500;
                var simulatedTimeStamp = event.timeStamp === 0;
                simulatedEvent = suspicious || simulatedTimeStamp;
            }

            if (!simulatedEvent) {
                handler(ev);
            }
        }

        if (legacyEvents[eventName].mouse) {
            el.addEventListener(legacyEvents[eventName].mouse, guardedHandler);
        }
        el.addEventListener(legacyEvents[eventName].touch, guardedHandler);

    } else if (legacyEvents[eventName].mouse) { // Safari on MacOS
        el.addEventListener(legacyEvents[eventName].mouse, handler);
    }
}

/**
 * Check whether an element has interactions bound to it.
 *
 * @param {DOMElement} el
 * @returns {boolean} true if any interact listeners bound to it false otherwise
 */
var _isSet = function (el) {
    return interact.isSet(el);
};

/**
 * Unbind the interactions bound to an element by interactjs.
 *
 * @param {DOMElement} el
 */
var _unset = function (el) {
    var interactable = interact(el);
    if (interactable.options.drop.enabled) {
        // Unset draggable items of sortable and clean the nodes
        var itemsSelector = interactable.options.drop.accept;
        if (itemsSelector && el.dataset.sortableItemsActivated) {
            delete el.dataset.sortableItemsActivated;
            interact(itemsSelector).unset();
            el.querySelectorAll(itemsSelector).forEach(function(item) {
                delete item.dataset.sortableItemDraggable;
                // Remove handle class
                item.classList.remove(sortableHandleClass);
                var handle = item.querySelector('.' + sortableHandleClass);
                if (handle){
                    handle.remove(sortableHandleClass);
                }
            })
        }
    }
    interactable.unset();
};

/**
 * Override target interactable options with given values.
 *
 * @param {DOMElement|string} target identifier for interactable
 * @param {Object} options parameter keys to override in interactable target
 * @returns {Interactable|undefined} interactable object corresponding to target
 */
var _option = function (target, options) {
    if (_isSet(target)) {
        var interactable = interact(target);
        if (options) {
            Object.assign(interactable.options, options);
        }
        return interactable;
    }
};

return {
    draggable: _draggable,
    sortable: _sortable,
    isSet: _isSet,
    unset: _unset,
    option: _option,
};

});
