odoo.define('web.FavoriteMenu', function (require) {
"use strict";

const Dialog = require('web.Dialog');
const favoritesSubmenusRegistry = require('web.favorites_submenus_registry');
const SearchMenu = require('web.SearchMenu');

class FavoriteMenu extends SearchMenu {
    // custom_events: _.extend({}, DropdownMenu.prototype.custom_events, {
    //     favorite_submenu_toggled: '_onSubMenuToggled',
    // }),

    /**
     * @param {Object} action
     */
    constructor() {
        super(...arguments);
        this.category = 'favorite';
        this.title = this.env._t("Favorites");
        this.icon = 'fa fa-star';
        // this.style.mainButton.class = 'o_favorites_menu_button ' + this.style.mainButton.class;
    }

    /**
     * Render the template used to register a new favorite and append it
     * to the basic dropdown menu.
     *
     * @override
     */
    mounted() {
        // const params = {
        //     favorites: this.items,
        //     action: this.action,
        // };
        // this.$menu.addClass('o_favorites_menu');
        // this.subMenus = [];
        // favoritesSubmenusRegistry.values().forEach(SubMenu => {
        //     const subMenu = new SubMenu(this, {params});
        //     subMenu.appendTo(this.$menu);
        //     this.subMenus.push(subMenu);
        // });
    }

    //--------------------------------------------------------------------------
    // Properties
    //--------------------------------------------------------------------------

    get subMenus() {
        return favoritesSubmenusRegistry.values();
    }

    get subMenuProps() {
        return {
            action: this.props.action,
            favorites: Object.values(this.filters).filter(f => f.type === 'favorite'),
        };
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onDrag(item, ev) {
        if (!item.editable) {
            return;
        }

        ev.target.style.opacity = 0.1;

        let initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
        let indexDiff = 0;
        const breakpoint = ev.target.offsetHeight;

        const onDrag = ev => {
            if (ev.pageX <= 0 || ev.pageY <= 0) {
                return;
            }
            ev.preventDefault();
            const delta = ev.pageY - initialPosition;
            if (Math.abs(delta) > breakpoint) {
                if (delta > 0) {
                    const next = ev.target.nextElementSibling;
                    if (next && next.classList.contains('o_search_menu_item')) {
                        indexDiff++;
                        ev.target.parentNode.insertBefore(next, ev.target);
                    }
                } else {
                    const previous = ev.target.previousElementSibling;
                    if (previous && previous.classList.contains('o_search_menu_item')) {
                        indexDiff--;
                        ev.target.parentNode.insertBefore(ev.target, ev.target.previousElementSibling);
                    }
                }
                initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
            }
        };
        const onDragEnd = ev => {
            ev.target.style.opacity = 1;
            if (indexDiff) {
                this.env.store.dispatch('resequenceFavorite', item, indexDiff);
            }
            window.removeEventListener('drag', onDrag, true);
            window.removeEventListener('dragend', onDragEnd, true);
        };

        window.addEventListener('drag', onDrag, true);
        window.addEventListener('dragend', onDragEnd, true);
    }

    /**
     * Reacts to a submenu being toggled
     *
     * When a submenu is toggled, it has changed the position
     * and size of the Favorite's dropdown. This method
     * repositions the current dropdown
     *
     * @private
     * @param {OdooEvent} ev
     *
     */
    _onSubMenuToggled(ev) {
        ev.stopPropagation();
        this.$dropdownReference.dropdown('update');
    }

    /**
     * @override
     * @private
     * @param {MouseEvent} ev
     */
    _onTrashButtonClick(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const id = $(ev.currentTarget).data('id');
        const favorite = this.items.find(favorite => favorite.id === id);
        const globalWarning = this.env._t("This filter is global and will be removed for everybody if you continue.");
        const warning = this.env._t("Are you sure that you want to remove this filter?");
        const message = favorite.userId ? warning : globalWarning;

        Dialog.confirm(this, message, {
            title: this.env._t("Warning"),
            confirm_callback() {
                this.trigger('item_trashed', { id });
            },
        });

    }
}

FavoriteMenu.template = 'FavoriteMenu';

return FavoriteMenu;
});