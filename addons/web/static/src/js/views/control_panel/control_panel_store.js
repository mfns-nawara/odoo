odoo.define('web.ControlPanelStore', function (require) {
    "use strict";

    /**
     * DATA STRUCTURES
     *
     * 1. FILTER
     * ---------
     *
     * A filter is an object defining a specific domain. Each filter is defined
     * at least by :
     * @param {number} id unique identifier, also the filter's corresponding key
     * @param {string} description the description of the filter
     * @param {string} type either: (filter | groupBy | timeRange | favorite)
     *
     *  a. Filter
     *
     * @param {*} domain
     * @param {*} groupId
     * @param {*} groupNumber
     *
     *  b. GroupBy
     *
     * @param {*} fieldName
     * @param {*} fieldType
     * @param {*} groupId
     * @param {*} groupNumber
     *
     *  c. TimeRange
     *
     * @param {*} comparisonTimeRangeId
     * @param {*} fieldName
     * @param {*} fieldType
     * @param {*} timeRangeId
     *
     *  d. Favorite
     *
     * @param {*} context
     * @param {*} domain
     * @param {*} groupBys
     * @param {*} groupNumber
     * @param {*} isDefault
     * @param {*} isRemovable
     * @param {*} orderedBy
     * @param {*} serverSideId
     * @param {*} userId
     *
     * 2. GROUP
     * --------
     *
     * A filter group is an object used to aggregate multiple filters in a unique
     * group. It defines a list of active filters composing the group.
     * @param {number[]} activeFilterIds
     * @param {number} id
     * @param {string} type
     *
     * 3. QUERY
     * --------
     */

    const {
        COMPARISON_TIME_RANGE_OPTIONS,
        DEFAULT_INTERVAL, DEFAULT_PERIOD, DEFAULT_TIMERANGE, DEFAULT_YEAR,
        INTERVAL_OPTIONS, OPTION_GENERATORS,
        TIME_RANGE_OPTIONS, YEAR_OPTIONS,
    } = require('web.controlPanelParameters');
    const Domain = require('web.Domain');
    const { parseArch } = require('web.viewUtils');
    const pyUtils = require('web.py_utils');
    const searchBarAutocompleteRegistry = require('web.search_bar_autocomplete_sources_registry');

    let groupNumber = 0;

    // 'prototype'
    function dateFilterPrototype(type) {
        if (type === 'groupBy') {
            return {
                hasOptions: true,
                options: INTERVAL_OPTIONS.map(o =>
                    Object.create(o, { description: { value: o.description.toString() } })
                ),
                defaultOptionId: DEFAULT_INTERVAL,
                currentOptionIds: [],
            };
        }
    }

    class Filter {
        constructor(state, options) {
            this.id = this.constructor.id ++;
            if (!options.type) {
                throw new Error(`Invalid type "${type}" given to filter.`);
            }
            Object.assign(this, options);
            state.filters[this.id] = this;
        }
    }

    Filter.id = 0;

    const FIELDTYPES = ['field', 'filter', 'groupBy', 'timeRange', 'favorite'];

    class Group {
        constructor(state, type, activeFilterIds = []) {
            this.activeFilterIds = activeFilterIds;
            this.id = this.constructor.id ++;
            this.type = this._validateType(type);
            state.groups[this.id] = this;
        }

        _validateType(type) {
            if(!FIELDTYPES.includes(type)) {
                throw new Error(`Invalid type "${type}" given to group.`);
            }
            return type;
        }
    }

    Group.id = 0;

    //-----------------------------------------------------------------------------------------------
    // ControlPanelStore
    //-----------------------------------------------------------------------------------------------

    class ControlPanelStore extends owl.Store {
        constructor(config) {
            super({
                actions: {},
                env: config.env,
                getters: {},
                state: {}
            });

            this._defineActions();
            this._defineGetters();

            this.withSearchBar = 'withSearchBar' in config ? config.withSearchBar : true;

            if (this.withSearchBar) {
                if (config.importedState) {
                    Object.assign(this.state, config.importedState);
                } else {
                    this._setProperties(config);
                    this._prepareInitialState();
                }
            }
        }

        //-----------------------------------------------------------------------------------------------
        // Actions
        //-----------------------------------------------------------------------------------------------

        /**
         * Activate a given filter of type 'timeRange' with a timeRangeId
         * and optionaly a comparsionTimeRangeId
         *
         * @param {string} filterId
         * @param {string} timeRangeId
         * @param {string} [comparisonTimeRangeId]
         */
        activateTimeRange({ state, dispatch }, filterId, timeRangeId, comparisonTimeRangeId) {
            const filter = state.filters[filterId];
            filter.timeRangeId = timeRangeId || filter.defaultTimeRangeId;
            filter.comparisonTimeRangeId = comparisonTimeRangeId;
            const group = state.groups[filter.groupId];
            const groupActive = group.activeFilterIds.length;
            if (groupActive) {
                group.activeFilterIds = [{ filterId }];
            } else {
                dispatch('toggleFilter', filterId);
            }
        }

        /**
         *
         */
        clearQuery({ state, dispatch }) {
            state.query.forEach(groupId => {
                dispatch('deactivateGroup', groupId);
            });
        }

        /**
         * Using a list (a 'pregroup') of 'prefilters', create a new group in state.groups and a new
         * filter in state.filters for each prefilter. The new filters are part of the new group.
         *
         * @param {Object[]} pregroup, list of 'prefilters'
         * @param {string} type
         */
        createGroupOfFilters({ state }, pregroup, type) {
            const group = new Group(state, type);
            pregroup.forEach(preFilter => {
                new Filter(state, Object.assign(preFilter, { groupId: group.id }));
            });
        }

        /**
         * Create a new filter of type 'favorite' and toggle it.
         * It belongs to the unique group of favorites.
         *
         * @private
         * @param {Object} favorite
         */
        createNewFavorite({ state }, favorite) {
            //         const groupId = this._getGroupIdOfType('favorite');

            // //         _addNewFavorite: function (favorite) {
            //             var id = _.uniqueId('__filter__');
            //             favorite.id = id;
            //             favorite.groupId = this._getGroupIdOfType('favorite');
            //             this.filters[id] = favorite;
            //             this.toggleFilter(favorite.id);
        }

        /**
         * @param {Object[]} filters
         */
        createNewFilters({ state }, filters) {
            if (!filters.length) {
                return;
            }
            const group = new Group(state, 'filter');
            state.query.push(group.id);

            filters.forEach(preFilter => {
                const filter = new Filter(state, Object.assign(preFilter, {
                    groupId: group.id,
                    groupNumber: groupNumber,
                    type: 'filter',
                }));
                group.activeFilterIds.push({ filterId: filter.id });
            });
            groupNumber++;
        }

        /**
         * @param {Object[]} field
         */
        createNewGroupBy({ state, dispatch }, field) {
            const groupId = this._getGroupIdOfType('groupBy');
            const filter = new Filter(state, {
                description: field.string || field.name,
                fieldName: field.name,
                fieldType: field.type,
                groupId: groupId,
                groupNumber: groupNumber++,
                type: 'groupBy',
            });
            state.filters[filter.id] = filter;

            if (['date', 'datetime'].includes(field.type)) {
                Object.assign(filter, dateFilterPrototype('groupBy'));
                dispatch('toggleFilterWithOptions', filter.id);
            } else {
                dispatch('toggleFilter', filter.id);
            }
        }

        /**
         *
         */
        deactivateGroup({ state }, groupId) {
            const group = state.groups[groupId];
            if (group.activeFilterIds.length) {
                group.activeFilterIds = [];
                const groupIndex = state.query.indexOf(groupId);
                state.query.splice(groupIndex, 1);
            }
        }

        /**
         *
         */
        toggleAutoCompletionFilter({ dispatch, state }, filterId, autoCompleteValues) {
            const filter = state.filters[filterId];
            if (filter.type === 'field') {
                filter.autoCompleteValues = autoCompleteValues;
                // the autocompletion filter is dynamic
                filter.domain = "";
                const field = this.fields[filter.attrs.name];
                // TODO: should not do that, the domain logic should be put somewhere else
                const constructor = searchBarAutocompleteRegistry.getAny([filter.attrs.widget, field.type]);
                if (constructor) {
                    const obj = new constructor(null, filter, field, this.actionContext);
                    filter.domain = obj.getDomain(filter.autoCompleteValues);
                }
                // active the filter
                const group = state.groups[filter.groupId];
                if (!group.activeFilterIds.some(g => g.filterId === filter.id)) {
                    group.activeFilterIds.push({ filterId: filterId });
                    state.query.push(group.id);
                }
            } else {
                dispatch(filter.hasOptions ? 'toggleFilterWithOptions' : 'toggleFilter', filter.id);
            }
        }

        /**
         * @param {string} filterId
         */
        toggleFilter({ state }, filterId) {
            const filter = state.filters[filterId];
            const group = state.groups[filter.groupId];
            const filterIndex = group.activeFilterIds.findIndex(o => o.filterId === filterId);
            if (filterIndex === -1) {
                group.activeFilterIds.push({ filterId: filterId });
                if (!state.query.includes(group.id)) {
                    state.query.push(group.id);
                }
            } else {
                group.activeFilterIds.splice(filterIndex, 1);
                if (group.activeFilterIds.length === 0) {
                    const groupIndex = state.query.indexOf(group.id);
                    state.query.splice(groupIndex, 1);
                }
            }
        }

        /**
         * Used to toggle a given filter(Id) that has options with a given option(Id).
         *
         * @param {string} filterId
         * @param {string} [optionId]
         */
        toggleFilterWithOptions({ state, dispatch }, filterId, optionId) {
            const filter = state.filters[filterId];
            optionId = optionId || filter.defaultOptionId;
            const group = state.groups[filter.groupId];

            const selectedYears = () => filter.currentOptionIds.reduce(
                (acc, optionId) => {
                    if (YEAR_OPTIONS[optionId]) {
                        acc.push(YEAR_OPTIONS[optionId]);
                    }
                    return acc;
                },
                []
            );

            if (filter.type === 'filter') {
                const alreadyActive = group.activeFilterIds.some(o => o.filterId === filterId);
                if (alreadyActive) {
                    const optionIndex = filter.currentOptionIds.indexOf(optionId);
                    if (optionIndex > -1) {
                        filter.currentOptionIds.splice(optionIndex, 1);
                        if (!selectedYears().length) {
                            // This is the case where optionId was the last option of type 'year' to be there before being removed above.
                            // Since other options of type 'month' or 'quarter' do not make sense without a year
                            // we deactivate all options.
                            filter.currentOptionIds = [];
                        }
                        if (!filter.currentOptionIds.length) {
                            // Here no option is selected so that the filter becomes inactive.
                            dispatch('toggleFilter', filterId);
                        }
                    } else {
                        filter.currentOptionIds.push(optionId);
                    }
                } else {
                    dispatch('toggleFilter', filterId);
                    filter.currentOptionIds.push(optionId);
                    if (!selectedYears().length) {
                        // Here we add 'this_year' as options if no option of type year is already selected.
                        filter.currentOptionIds.push(DEFAULT_YEAR);
                    }
                }
            } else if (filter.type === 'groupBy') {
                const isCombination = (o) => o.filterId === filterId && o.optionId === optionId;
                const initiaLength = group.activeFilterIds.length;
                const index = group.activeFilterIds.findIndex(o => isCombination(o));
                if (index === -1) {
                    group.activeFilterIds.push({
                        filterId: filterId,
                        optionId: optionId,
                    });
                    filter.currentOptionIds.push(optionId);
                    if (initiaLength === 0) {
                        state.query.push(group.id);
                    }
                } else {
                    group.activeFilterIds.splice(index, 1);
                    const optionIndex = filter.currentOptionIds.indexOf(optionId);
                    filter.currentOptionIds.splice(optionIndex, 1);
                    if (initiaLength === 1) {
                        const groupIndex = state.query.indexOf(group.id);
                        state.query.splice(groupIndex, 1);
                    }
                }
            }
        }

        //-----------------------------------------------------------------------------------------------
        // Getters
        //-----------------------------------------------------------------------------------------------

        /**
         * Returns an array containing copies of the filter of the provided type.
         *
         * @param {string} type
         * @returns {Object[]}
         */
        getFiltersOfType({ state }, type) {
            const fs = [];
            Object.values(state.filters).forEach(filter => {
                if (filter.type === type && !filter.invisible) {
                    const group = state.groups[filter.groupId];
                    const isActive = group.activeFilterIds.some(o => o.filterId === filter.id);
                    const f = Object.assign({ isActive }, filter);
                    if (f.hasOptions) {
                        f.options = f.options.map(o => {
                            const { description, optionId, groupNumber } = o;
                            const isActive = f.currentOptionIds.includes(o.optionId);
                            return { description, optionId, groupNumber, isActive};
                        });
                    }
                    fs.push(f);
                }
            });
            if (type === 'favorite') {
                fs.sort((f1, f2) => f1.groupNumber - f2.groupNumber);
            }
            return fs;
        }

        //-----------------------------------------------------------------------------------------------
        // Public
        //-----------------------------------------------------------------------------------------------

        /**
         * Return the state of the control panel store (the filters, groups and the
         * current query). This state can then be used in an other control panel
         * model (with same key modelName). See importedState
         *
         * @returns {Object}
         */
        exportState() {
            return {
                filters: this.state.filters,
                groups: this.state.groups,
                query: this.state.query,
            };
        }

        /**
         * @returns {Object} An object called search query with keys domain, groupBy,
         *                   context, orderedBy.
         */
        getQuery() {
            if (!this.withSearchBar) {
                return {
                    context: {},
                    domain: '[]',
                    groupBy: [],
                    timeRanges: {},
                };
            }
            const requireEvaluation = true;
            return {
                context: this._getContext(requireEvaluation),
                domain: this._getDomain(requireEvaluation),
                groupBy: this._getGroupBy(),
                orderedBy: this._getOrderedBy(),
                timeRanges: this._getTimeRanges(),
            };
        }

        //-----------------------------------------------------------------------------------------------
        // Private
        //-----------------------------------------------------------------------------------------------

        /**
         * @private
         */
        _activateDefaultTimeRanges() {
            const { field, range, comparisonRange } = this.actionContext.time_ranges;
            const filter = Object.values(this.state.filters).find(
                f => f.type === 'timeRange' && f.fieldName === field
            );
            this.dispatch('activateTimeRange', filter.id, range, comparisonRange);
        }

        /**
         * @private
         */
        _activateFilters() {
            const defaultFavorite = Object.values(this.state.filters).find(
                f => f.type === 'favorite' && f.isDefault
            );
            if (defaultFavorite && this.activateDefaultFavorite) {
                this.dispatch('toggleFilter', defaultFavorite.id);
            } else {
                Object.values(this.state.filters)
                    .filter(f => f.isDefault && f.type !== 'favorite')
                    .sort((f1, f2) => (f1.defaultRank || 100) - (f2.defaultRank || 100))
                    .forEach(f => {
                        if (f.hasOptions) {
                            this.dispatch('toggleFilterWithOptions', f.id);
                        } else {
                            this.dispatch('toggleFilter', f.id);
                        }
                    });
                if (this.actionContext.time_ranges) {
                    this._activateDefaultTimeRanges();
                }
            }
        }

        /**
         * @private
         */
        _addFilters() {
            this._createGroupOfFiltersFromArch();
            this._createGroupOfDynamicFilters();
            this._createGroupOfFavorites();
            this._createGroupOfTimeRanges();
        }

        /**
         * @private
         */
        _createGroupOfDynamicFilters() {
            const pregroup = this.dynamicFilters.map(filter => {
                return {
                    description: filter.description,
                    domain: JSON.stringify(filter.domain),
                    isDefault: true,
                    type: 'filter',
                };
            });
            this.dispatch('createGroupOfFilters', pregroup, 'filter');
        }

        /**
         * @private
         */
        _createGroupOfFavorites() {
            const pregroup = this.favoriteFilters.map(favorite => {
                const userId = favorite.user_id ? favorite.user_id[0] : false;
                const groupNumber = userId ? 1 : 2;
                const context = pyUtils.eval('context', favorite.context, this.env.session.user_context);
                let groupBys = [];
                if (context.group_by) {
                    groupBys = context.group_by;
                    delete context.group_by;
                }
                const sort = JSON.parse(favorite.sort);
                const orderedBy = sort.map(order => {
                    let fieldName;
                    let asc;
                    const sqlNotation = order.split(' ');
                    if (sqlNotation.length > 1) {
                        // regex: \fieldName (asc|desc)?\
                        fieldName = sqlNotation[0];
                        asc = sqlNotation[1] === 'asc';
                    } else {
                        // legacy notation -- regex: \-?fieldName\
                        fieldName = order[0] === '-' ? order.slice(1) : order;
                        asc = order[0] === '-' ? false : true;
                    }
                    return {
                        asc: asc,
                        name: fieldName,
                    };
                });
                return {
                    context: favorite.context,
                    description: favorite.name,
                    domain: favorite.domain,
                    groupBys: groupBys,
                    groupNumber: groupNumber,
                    isDefault: favorite.is_default,
                    isRemovable: true,
                    orderedBy: orderedBy,
                    serverSideId: favorite.id,
                    type: 'favorite',
                    userId: userId,
                };
            });
            this.dispatch('createGroupOfFilters', pregroup, 'favorite');
        }

        /**
         * Parse the arch of a 'search' view and create corresponding filters and groups
         *
         * @private
         */
        _createGroupOfFiltersFromArch() {
            // A searchview arch may contain a 'searchpanel' node, but this isn't
            // the concern of the ControlPanelView (the SearchPanel will handle it).
            // Ideally, this code should whitelist the tags to take into account
            // instead of blacklisting the others, but with the current (messy)
            // structure of a searchview arch, it's way simpler to do it that way.

            // get prefilters

            const children = this.parsedArch.children.filter(child => child.tag !== 'searchpanel');
            const preFilters = children.reduce(
                (acc, child) => {
                    if (child.tag === 'group') {
                        return acc.concat(child.children.map(this._evalArchChild));
                    } else {
                        return [...acc, this._evalArchChild(child)];
                    }
                },
                []
            );
            preFilters.push({ tag: 'separator' });

            // create groups and filters

            let currentTag;
            let currentGroup = [];
            let groupOfGroupBys = [];

            preFilters.forEach(preFilter => {
                if (preFilter.tag !== currentTag || ['separator', 'field'].includes(preFilter.tag)) {
                    if (currentGroup.length) {
                        if (currentTag === 'groupBy') {
                            groupOfGroupBys = groupOfGroupBys.concat(currentGroup);
                        } else {
                            this.dispatch('createGroupOfFilters', currentGroup, currentTag);
                        }
                    }
                    currentTag = preFilter.tag;
                    currentGroup = [];
                    groupNumber++;
                }
                if (preFilter.tag !== 'separator') {
                    const filter = {
                        type: preFilter.tag,
                        // we need to codify here what we want to keep from attrs
                        // and how, for now I put everything.
                        // In some sence, some filter are active (totally determined, given)
                        // and others are passive (require input(s) to become determined)
                        // What is the right place to process the attrs?
                    };
                    if (filter.type === 'filter' || filter.type === 'groupBy') {
                        filter.groupNumber = groupNumber;
                    }
                    this._extractAttributes(filter, preFilter.attrs);
                    currentGroup.push(filter);
                }
            });

            if (groupOfGroupBys.length) {
                this.dispatch('createGroupOfFilters', groupOfGroupBys, 'groupBy');
            }
        }

        /**
         * Add a group of type 'timeRange' in state.groups and generate a filter
         * of the same type for each suitable field in fields. The new filters
         * are put in the new group.
         *
         * @private
         */
        _createGroupOfTimeRanges() {
            const pregroup = [];
            Object.keys(this.fields).forEach(fieldName => {
                const field = this.fields[fieldName];
                const fieldType = field.type;
                if (['date', 'datetime'].includes(fieldType) && field.sortable) {
                    pregroup.push({
                        comparisonTimeRangeId: false,
                        description: field.string,
                        fieldName: fieldName,
                        fieldType: fieldType,
                        timeRangeId: false,
                        type: 'timeRange',
                    });
                }
            });
            this.dispatch('createGroupOfFilters', pregroup, 'timeRange');
        }

        _defineActions() {
            Object.assign(this.actions, {
                activateTimeRange: this.activateTimeRange.bind(this),
                clearQuery: this.clearQuery.bind(this),
                createGroupOfFilters: this.createGroupOfFilters.bind(this),
                createNewFavorite: this.createNewFavorite.bind(this),
                createNewFilters: this.createNewFilters.bind(this),
                createNewGroupBy: this.createNewGroupBy.bind(this),
                deactivateGroup: this.deactivateGroup.bind(this),
                toggleAutoCompletionFilter: this.toggleAutoCompletionFilter.bind(this),
                toggleFilter: this.toggleFilter.bind(this),
                toggleFilterWithOptions: this.toggleFilterWithOptions.bind(this),
            });
        }

        _defineGetters() {
            Object.assign(this.getters, {
                getFiltersOfType: this.getFiltersOfType.bind(this, {
                    getters: this.getters,
                    state: this.state,
                }),
            });
        }

        /**
         * @private
         * @param {Object} child parsed arch node
         * @returns {Object}
         */
        _evalArchChild(child) {
            if (child.attrs.context) {
                try {
                    const context = pyUtils.eval('context', child.attrs.context);
                    if (context.group_by) {
                        // let us extract basic data since we just evaluated context
                        // and use a correct tag!
                        child.attrs.fieldName = context.group_by.split(':')[0];
                        child.attrs.defaultInterval = context.group_by.split(':')[1];
                        child.tag = 'groupBy';
                    }
                } catch (e) { }
            }
            return child;
        }

        /**
         * @private
         * @param {Object} filter
         * @param {Object} attrs
         */
        _extractAttributes(filter, attrs) {
            filter.isDefault = this.searchDefaults[attrs.name] ? true : false;
            filter.description = attrs.string ||
                attrs.help ||
                attrs.name ||
                attrs.domain ||
                'Ω';
            if (filter.type === 'filter') {
                if (filter.isDefault) {
                    filter.defaultRank = -5;
                }
                filter.domain = attrs.domain;
                filter.context = pyUtils.eval('context', attrs.context);
                if (attrs.date) {
                    filter.fieldName = attrs.date;
                    filter.fieldType = this.fields[attrs.date].type;
                    filter.hasOptions = true;
                    filter.options = this.optionGenerators;
                    filter.defaultOptionId = attrs.default_period ||
                        DEFAULT_PERIOD;
                    filter.currentOptionIds = [];
                    filter.basicDomains = this._getDateFilterBasicDomains(filter);
                }
                if (attrs.invisible) {
                    filter.invisible = true;
                }
            } else if (filter.type === 'groupBy') {
                if (filter.isDefault) {
                    const val = this.searchDefaults[attrs.name];
                    filter.defaultRank = typeof val === 'number' ? val : 100;
                }
                filter.fieldName = attrs.fieldName;
                filter.fieldType = this.fields[attrs.fieldName].type;
                if (['date', 'datetime'].includes(filter.fieldType)) {
                    Object.assign(filter, dateFilterPrototype('groupBy'));
                }
            } else if (filter.type === 'field') {
                if (filter.isDefault) {
                    filter.defaultRank = -10;
                }
                const field = this.fields[attrs.name];
                filter.attrs = attrs;
                filter.autoCompleteValues = [];
                if (filter.isDefault) {
                    // on field, default can be used with a value
                    filter.defaultValue = this.searchDefaults[attrs.name];
                    // TODO
                    // _processFieldFilter(filter);
                }
                if (!attrs.string) {
                    attrs.string = field.string;
                }
            }
        }

        _getContext(evaluation = true) {
            const filterContexts = this.state.query.reduce(
                (acc, groupId) => {
                    const group = this.state.groups[groupId];
                    return acc.concat(this._getGroupContexts(group));
                },
                []
            );
            const userContext = this.env.session.user_context;
            if (evaluation) {
                try {
                    return pyUtils.eval('contexts', [this.actionContext, ...filterContexts], userContext);
                } catch (e) { }
            } else {
                // TODO: ?
            }
        }

        /**
         * Constructs an object containing constious domains based on this.referenceMoment and
         * the field associated with the provided date filter.
         *
         * @private
         * @param {Object} filter
         * @returns {Object}
         */
        _getDateFilterBasicDomains({ fieldName, fieldType }) {

            const _constructBasicDomain = (y, o) => {
                const addParam = Object.assign({}, y.addParam, o ? o.addParam : {});
                const setParam = Object.assign({}, y.setParam, o ? o.setParam : {});
                const granularity = o ? o.granularity : y.granularity;
                const date = this.referenceMoment.clone().set(setParam).add(addParam);
                let leftBound = date.clone().startOf(granularity);
                let rightBound = date.clone().endOf(granularity);

                if (fieldType === 'date') {
                    leftBound = leftBound.format("YYYY-MM-DD");
                    rightBound = rightBound.format("YYYY-MM-DD");
                } else {
                    leftBound = leftBound.utc().format("YYYY-MM-DD HH:mm:ss");
                    rightBound = rightBound.utc().format("YYYY-MM-DD HH:mm:ss");
                }
                const domain = Domain.prototype.arrayToString([
                    '&',
                    [fieldName, ">=", leftBound],
                    [fieldName, "<=", rightBound]
                ]);
                const description = o ? o.description + " " + y.description : y.description;

                return { domain, description };
            };

            const domains = {};
            this.optionGenerators.filter(y => y.groupNumber === 2).forEach(y => {
                domains[y.optionId] = _constructBasicDomain(y);
                this.optionGenerators.filter(y => y.groupNumber === 1).forEach(o => {
                    domains[y.optionId + "__" + o.optionId] = _constructBasicDomain(y, o);
                });
            });
            return domains;
        }

        /**
         * Computes the string representation of the current domain associated to a date filter
         * starting from its currentOptionIds.
         *
         * @param {Object} filter
         * @returns {string}
         */
        _getDateFilterDomain(filter) {
            const domains = [];
            const yearIds = [];
            const otherOptionIds = [];

            filter.currentOptionIds.forEach(optionId => {
                if (YEAR_OPTIONS[optionId]) {
                    yearIds.push(optionId);
                } else {
                    otherOptionIds.push(optionId);
                }
            });
            // the following case corresponds to years selected only
            if (otherOptionIds.length === 0) {
                yearIds.forEach(yearId => {
                    const d = filter.basicDomains[yearId];
                    domains.push(d.domain);
                });
            } else {
                otherOptionIds.forEach(optionId => {
                    yearIds.forEach(yearId => {
                        const d = filter.basicDomains[yearId + '__' + optionId];
                        domains.push(d.domain);
                    });
                });
            }
            return pyUtils.assembleDomains(domains, 'OR');
        }

        /**
         * Return the string representation of a domain created by combining
         * appropriately (with an 'AND') the domains coming from the active groups.
         *
         * @private
         * @returns {string} the string representation of a domain
         */
        _getDomain(evaluation = true) {
            const domains = this.state.query.reduce(
                (acc, groupId) => {
                    const group = this.state.groups[groupId];
                    if (['filter', 'favorite', 'field'].includes(group.type)) {
                        acc.push(this._getGroupDomain(group));
                    }
                    return acc;
                },
                []
            );
            const userContext = this.env.session.user_context;
            if (evaluation) {
                let filterDomain = pyUtils.assembleDomains(domains, 'AND');
                filterDomain = Domain.prototype.stringToArray(filterDomain, userContext);
                try {
                    return pyUtils.eval('domains', [this.actionDomain, filterDomain], userContext);
                } catch (error) {
                    throw new Error(_.str.sprintf(_t("Failed to evaluate search criterions") + ": \n%s",
                        JSON.stringify(error)));
                }
            }
        }

        /**
        * Return the context of the provided filter.
        *
        * @private
        * @param {Object} filter
        * @returns {Object} context
        */
        _getFilterContext(filterId) {
            const filter = this.state.filters[filterId];
            let context = filter.context || {};
            // for <field> nodes, a dynamic context (like context="{'field1': self}")
            // should set {'field1': [value1, value2]} in the context
            if (filter.type === 'field' && filter.attrs.context) {
                context = pyUtils.eval('context',
                    filter.attrs.context,
                    {
                        self: filter.autoCompleteValues.map(autoCompleteValue => autoCompleteValue.value)
                    },
                );
            }
            // the following code aims to restore this:
            // https://github.com/odoo/odoo/blob/12.0/addons/web/static/src/js/views/search/search_inputs.js#L498
            // this is required for the helpdesk tour to pass
            // this seems weird to only do that for m2o fields, but a test fails if
            // we do it for other fields (my guess being that the test should simply
            // be adapted)
            if (filter.type === 'field' && filter.isDefault) {
                if (this.fields[filter.attrs.name].type === 'many2one') {
                    let value = filter.defaultValue;
                    // the following if required to make the main_flow_tour pass (see
                    // https://github.com/odoo/odoo/blob/12.0/addons/web/static/src/js/views/search/search_inputs.js#L461)
                    if (filter.defaultValue instanceof Array) {
                        value = filter.defaultValue[0];
                    }
                    context['default_' + filter.attrs.name] = value;
                }
            }
            return context;
        }

        /**
         * Compute (if possible) the domain of the provided filter.
         *
         * @private
         * @param {Object} filter
         * @returns {string} domain, string representation of a domain
         */
        _getFilterDomain(filter) {
            if (filter.type === 'filter' && filter.hasOptions) {
                return this._getDateFilterDomain(filter);
            }
            return filter.domain;
        }

        /**
         * Compute the groupBys (if possible) of the provided filter.
         *
         * @private
         * @param {Array} filterId
         * @param {Array} [optionId]
         * @returns {string[]} groupBys
         */
        _getFilterGroupBys(filterId, optionId) {
            const filter = this.state.filters[filterId];
            if (filter.type === 'groupBy') {
                let groupBy = filter.fieldName;
                if (optionId) {
                    groupBy = groupBy + ':' + optionId;
                }
                return [groupBy];
            } else {
                return filter.groupBys;
            }
        }

        /**
         * Return the concatenation of groupBys comming from the active filters.
         * The array state.query encoding the order in which the groups have been
         * activated, the results respect the appropriate logic: the groupBys
         * coming from an active favorite (if any) come first, then come the
         * groupBys comming from the active filters of type 'groupBy'.
         *
         * @private
         * @returns {string[]}
         */
        _getGroupBy() {
            const groupBys = this.state.query.reduce(
                (acc, groupId) => {
                    const group = this.state.groups[groupId];
                    if (['groupBy', 'favorite'].includes(group.type)) {
                        acc = acc.concat(this._getGroupGroupBys(group));
                    }
                    return acc;
                },
                []
            );
            const groupBy = groupBys.length ? groupBys : (this.actionContext.group_by || []);
            return typeof groupBy === 'string' ? [groupBy] : groupBy;
        }


        /**
         * Return the list of the contexts of the filters acitve in the given
         * group.
         *
         * @private
         * @param {Object} group
         * @returns {Object[]}
         */
        _getGroupContexts(group) {
            const contexts = group.activeFilterIds.reduce(
                (acc, { filterId }) => {
                    const filterContext = this._getFilterContext(filterId);
                    if (filterContext) {
                        acc.push(filterContext);
                    }
                    return acc;
                },
                []
            );
            return contexts;
        }

        /**
         * Return the string representation of a domain created by combining
         * appropriately (with an 'OR') the domains coming from the filters
         * active in the given group.
         *
         * @private
         * @param {Object} group
         * @returns {string} string representation of a domain
         */
        _getGroupDomain(group) {
            const domains = group.activeFilterIds.map(o => {
                const filter = this.state.filters[o.filterId];
                return this._getFilterDomain(filter);
            });
            return pyUtils.assembleDomains(domains, 'OR');
        }

        /**
         * Return the groupBys coming form the filters active in the given group.
         *
         * @private
         * @param {Object} group
         * @returns {string[]}
         */
        _getGroupGroupBys(group) {
            return group.activeFilterIds.reduce(
                (acc, { filterId, optionId }) => {
                    acc = acc.concat(this._getFilterGroupBys(filterId, optionId));
                    return acc;
                },
                []
            );
        }

        /**
         * Returns the id of the group with the provided type
         * within an array of groups
         *
         * @param {'groupBy'|'favorite'|'timeRange'} type
         * @returns {string|undefined}
         */
        _getGroupIdOfType(type) {
            const group = Object.values(this.state.groups).find(g => g.type === type);
            if (group) {
                return group.id;
            }
        }

        /**
         * Used to get the key orderedBy of a favorite.
         *
         * @private
         * @returns {Object[]|undefined} orderedBy
         */
        _getOrderedBy() {
            let orderedBy;
            const groupId = this._getGroupIdOfType('favorite');
            if (this.state.query.indexOf(groupId) !== -1) {
                // if we are here, this means that the group of favorite is
                // active and activeFilterIds is a list of length one.
                const group = this.state.groups[groupId];
                const activeFavoriteId = group.activeFilterIds[0].filterId;
                const favorite = this.state.filters[activeFavoriteId];
                if (favorite.orderedBy && favorite.orderedBy.length) {
                    orderedBy = favorite.orderedBy;
                }
            }
            return orderedBy;
        }

        /**
         * Return an empty object or an object with a key timeRangeMenuData
         * containing info on time ranges and their descriptions if a filter of type
         * 'timeRange' is activated (only one can be).
         * The key timeRange and comparisonTimeRange will be string or array
         * representation of domains according to the value of evaluation:
         * array if evaluation is true, string if false.
         *
         * @private
         * @param {boolean} [evaluation=false]
         * @returns {Object}
         */
        _getTimeRanges(evalutation) {
            // groupOfTimeRanges can be undefined in case with withSearchBar is false
            const groupId = this._getGroupIdOfType('timeRange');
            const groupOfTimeRanges = this.state.groups[groupId];
            if (groupOfTimeRanges && groupOfTimeRanges.activeFilterIds.length) {
                // const filter = this.state.filters[groupOfTimeRanges.activeFilterIds[0].filterId];

                // const comparisonTimeRange = "[]";
                // const comparisonTimeRangeDescription;

                // const timeRange = Domain.prototype.constructDomain(
                //     filter.fieldName,
                //     filter.timeRangeId,
                //     filter.fieldType
                // );
                // const timeRangeDescription = filter.timeRangeOptions.find(
                //     o => o.optionId === filter.timeRangeId
                // ).description.toString();

                // if (filter.comparisonTimeRangeId) {
                //     comparisonTimeRange = Domain.prototype.constructDomain(
                //         filter.fieldName,
                //         filter.timeRangeId,
                //         filter.fieldType,
                //         filter.comparisonTimeRangeId
                //     );
                //     comparisonTimeRangeDescription = filter.comparisonTimeRangeOptions.find(
                //         o => o.optionId === filter.comparisonTimeRangeId
                //     ).description.toString();
                // }
                // if (evaluation) {
                //     timeRange = Domain.prototype.stringToArray(timeRange);
                //     comparisonTimeRange = Domain.prototype.stringToArray(comparisonTimeRange);
                // }
                // return {
                //     comparisonField: filter.fieldName,
                //     timeRange: timeRange,
                //     timeRangeDescription: timeRangeDescription,
                //     comparisonTimeRange: comparisonTimeRange,
                //     comparisonTimeRangeDescription: comparisonTimeRangeDescription,
                // };
            } else {

            }
        }

        /**
         * @private
         */
        _prepareInitialState() {
            Object.assign(this.state, {
                filters: {},
                groups: {},
                query: [],
            });

            this._addFilters();
            this._activateFilters();
        }

        /**
         * @private
         */
        _setProperties(config) {

            this.modelName = config.modelName;
            this.actionDomain = config.actionDomain;
            this.actionContext = config.actionContext;
            this.actionId = config.actionId;

            this.searchDefaults = {};
            for (const key in this.actionContext) {
                const match = /^search_default_(.*)$/.exec(key);
                if (match) {
                    this.searchDefaults[match[1]] = this.actionContext[key];
                    delete this.actionContext[key];
                }
            }

            const viewInfo = config.viewInfo || { arch: '<search/>', fields: {} };

            this.parsedArch = parseArch(viewInfo.arch);
            this.fields = viewInfo.fields;
            this.favoriteFilters = viewInfo.favoriteFilters || [];
            this.activateDefaultFavorite = config.activateDefaultFavorite;

            this.dynamicFilters = config.dynamicFilters || [];

            this.referenceMoment = moment();
            this.optionGenerators = Object.values(OPTION_GENERATORS).map(option => {
                const description = option.description ?
                    this.env._t(option.description):
                    this.referenceMoment.clone()
                        .set(option.setParam)
                        .add(option.addParam)
                        .format(option.format);
                return Object.create(option, { description: { value: description } });
            });
        }

    }






    //-----------------------------------------------------------------------------------------------
    // Helpers
    //-----------------------------------------------------------------------------------------------




    // /**
    //  * @private
    //  * @param {Object} filter
    //  * @returns {string} domain
    //  */
    // function _getAutoCompletionFilterDomain(filter, field, env) {
    //     var domain = "";
    //     // TODO: should not do that, the domain logic should be put somewhere else
    //     var Obj = searchBarAutocompleteRegistry.getAny([filter.attrs.widget, field.type]);
    //     if (Obj) {
    //         var obj = new (Obj)(this, filter, field, env.actionContext);
    //         domain = obj.getDomain(filter.autoCompleteValues);
    //     }
    //     return domain;
    // }



    // /**
    //  * @private
    //  * @param {Object} filter
    //  */
    // async function _processFieldFilter(filter, field, env) {
    //     var value = filter.defaultValue;
    //     if (field.type === 'many2one') {
    //         if (value instanceof Array) {
    //             // M2O search fields do not currently handle multiple default values
    //             // there are many cases of {search_default_$m2ofield: [id]}, need
    //             // to handle this as if it were a single value.
    //             value = value[0];
    //         }
    //         const result = await env.services.rpc({
    //             model: field.relation,
    //             method: 'name_get',
    //             args: [value],
    //             context: env.context,
    //         });
    //         var autocompleteValue = {
    //             label: result[0][1],
    //             value: value,
    //         };
    //         filter.autoCompleteValues.push(autocompleteValue);
    //         filter.domain = _getAutoCompletionFilterDomain(filter, field, env);
    //         filter.isReady = true;
    //     } else {
    //         var autocompleteValue;
    //         if (field.type === 'selection') {
    //             var match = _.find(field.selection, function (sel) {
    //                 return sel[0] === value;
    //             });
    //             autocompleteValue = {
    //                 label: match[1],
    //                 value: match[0],
    //             };
    //         } else {
    //             autocompleteValue = {
    //                 label: String(value),
    //                 value: value,
    //             };
    //         }
    //         filter.autoCompleteValues.push(autocompleteValue);
    //         filter.domain = _getAutoCompletionFilterDomain(filter, field);
    //         filter.isReady = true;
    //     }
    // }

    return ControlPanelStore;

});

    //         /**
    //          * Ensure that the filters determined by the given filterIds are
    //          * deactivated (if one or many of them are already deactivated, nothing bad happens)
    //          *
    //          * @param {string[]} filterIds
    //          */
    //         deactivateFilters: function (filterIds) {
    //             var self = this;
    //             filterIds.forEach(function (filterId) {
    //                 var filter = self.filters[filterId];
    //                 var group = self.groups[filter.groupId];
    //                 if (group.activeFilterIds.some(isEqualTo([filterId]))) {
    //                     self.toggleFilter(filterId);
    //                 }
    //             });
    //         },
    //         /**
    //          * Deactivate all filters in a given group with given id.
    //          *
    //          * @param {string} groupId
    //          */
    //         deactivateGroup: function (groupId) {
    //             var self = this;
    //             var group = this.groups[groupId];
    //             _.each(group.activeFilterIds, id => {
    //                 var filter = self.filters[id[0]];
    //                 // TODO: put this logic in toggleFilter 'field' type
    //                 if (filter.autoCompleteValues) {
    //                     filter.autoCompleteValues = [];
    //                 }
    //                 if (filter.currentOptionIds) {
    //                     filter.currentOptionIds.clear();
    //                 }
    //             });
    //             // TODO: use toggleFilter here
    //             group.activeFilterIds = [];
    //             this.query.splice(this.query.indexOf(groupId), 1);
    //         },
    //         /**
    //          * Delete a filter of type 'favorite' with given filterId server side and in control panel model.
    //          * Of course this forces the filter to be removed from the search query.
    //          *
    //          * @param {string} filterId
    //          */
    //         deleteFilterEverywhere: function (filterId) {
    //             var self = this;
    //             var filter = this.filters[filterId];
    //             var def = this.deleteFilter(filter.serverSideId).then(function () {
    //                 const groupOfFavorites = self.groups[filter.groupId];
    //                 const isActive = groupOfFavorites.activeFilterIds.some(isEqualTo([filterId]));
    //                 if (isActive) {
    //                     self.toggleFilter(filterId);
    //                 }
    //                 delete self.filters[filterId];
    //             });
    //             return def;
    //         },

    //         /**
    //          * Toggle a filter with given id in a way appropriate to its type.
    //          *
    //          * @param {Object} params
    //          * @param {string} params.filterId
    //          * @param {Object} params.autoCompleteValues
    //          */
    //         toggleAutoCompletionFilter: function (params) {
    //             var filter = this.filters[params.filterId];
    //             if (filter.type === 'field') {
    //                 filter.autoCompleteValues = params.autoCompleteValues;
    //                 // the autocompletion filter is dynamic
    //                 filter.domain = this._getAutoCompletionFilterDomain(filter);
    //                 // active the filter
    //                 var group = this.groups[filter.groupId];
    //                 if (!group.activeFilterIds.some(isEqualTo([filter.id]))) {
    //                     group.activeFilterIds.push([filter.id]);
    //                     this.query.push(group.id);
    //                 }
    //             } else {
    //                 if (filter.hasOptions) {
    //                     this.toggleFilterWithOptions(filter.id);
    //                 } else {
    //                     this.toggleFilter(filter.id);
    //                 }
    //             }
    //         },

    //         /**
    //          * Return an array containing 'facets' used to create the content of the search bar.
    //          *
    //          * @returns {Object}
    //          */
    //         _getFacets: function () {
    //             var self = this;
    //             // resolve active filters for facets
    //             return this.query.map(groupId => {
    //                 var group = self.groups[groupId];
    //                 var facet = _.extend({}, group);
    //                 if (group.type === 'groupBy') {
    //                     facet.filters = group.activeFilterIds.map(id => {
    //                         let filter = _.extend({}, self.filters[id[0]]);
    //                         if (filter.hasOptions) {
    //                             filter.optionId = id[1];
    //                         }
    //                         return filter;
    //                     });
    //                 } else {
    //                     facet.filters = _.compact(group.activeFilterIds.map(id => self.filters[id[0]]));
    //                 }
    //                 return facet;
    //             });
    //         },



    //         /**
    //             * Compute the search Query and save it as an ir.filter in db.
    //             * No evaluation of domains is done in order to keep them dynamic.
    //             * If the operatio is successful, a new filter of type 'favorite' is
    //             * created and activated.
    //             *
    //             * @private
    //             * @param {Object} favorite
    //             * @returns {Promise}
    //             */
    //         _saveQuery: function (favorite) {
    //             var self = this;
    //             var userContext = session.user_context;
    //             var controllerQueryParams;
    //             this.trigger_up('get_controller_query_params', {
    //                 callback: function (state) {
    //                     controllerQueryParams = state;
    //                 },
    //             });
    //             var queryContext = this._getQueryContext();
    //             var timeRangeMenuInfo = this._getTimeRangeMenuData(false);
    //             var context = pyUtils.eval(
    //                 'contexts',
    //                 [userContext, controllerQueryParams.context, timeRangeMenuInfo].concat(queryContext)
    //             );
    //             context = _.omit(context, Object.keys(userContext));
    //             var groupBys = this._getGroupBy();
    //             if (groupBys.length) {
    //                 context.group_by = groupBys;
    //             }
    //             var domain = this._getDomain();
    //             var userId = favorite.isShared ? false : session.uid;
    //             var orderedBy = this._getOrderedBy() || [];
    //             if (controllerQueryParams.orderedBy) {
    //                 orderedBy = controllerQueryParams.orderedBy;
    //             }
    //             var sort = orderedBy.map(function (order) {
    //                 return order.name + ((order.asc === false) ? " desc" : "");
    //             });

    //             var irFilter = {
    //                 name: favorite.description,
    //                 context: context,
    //                 domain: domain,
    //                 is_default: favorite.isDefault,
    //                 user_id: userId,
    //                 model_id: this.modelName,
    //                 action_id: this.actionId,
    //                 sort: JSON.stringify(sort),
    //             };
    //             return this.createFilter(irFilter).then(function (serverSideId) {
    //                 // we don't want the groupBys to be located in the context in control panel model
    //                 delete context.group_by;
    //                 favorite.isRemovable = true;
    //                 favorite.groupNumber = userId ? 1 : 2;
    //                 favorite.context = context;
    //                 favorite.groupBys = groupBys;
    //                 favorite.domain = domain;
    //                 favorite.orderedBy = orderedBy;
    //                 // not sure keys are usefull
    //                 favorite.userId = userId;
    //                 favorite.serverSideId = serverSideId;
    //                 self._addNewFavorite(favorite);
    //             });
    //         },
    //     };
