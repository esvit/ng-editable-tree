/*
 * jQuery UI Nested Sortable
 * v 1.3.5 / 21 jun 2012
 * http://mjsarfatti.com/code/nestedSortable
 *
 * Depends on:
 * jquery.ui.sortable.js 1.8+
 *
 * Copyright (c) 2010-2012 Manuele J Sarfatti
 * Licensed under the MIT License
 * http://www.opensource.org/licenses/mit-license.php
 */
(function ($) {
    'use strict';

    $.widget('mjs.nestedSortable', $.extend({}, $.ui.sortable.prototype, {

        options: {
            tabSize: 20,
            disableNesting: 'mjs-nestedSortable-no-nesting',
            errorClass: 'mjs-nestedSortable-error',
            doNotClear: false,
            listType: 'ol',
            maxLevels: 0,
            protectRoot: false,
            rootID: null,
            rtl: false,
            isAllowed: function (item, parent) {
                return true;
            }
        },

        _create: function () {
            this.element.data('sortable', this.element.data('nestedSortable'));

            if (!this.element.is(this.options.listType)) {
                throw new Error('nestedSortable: Please check the listType option is set to your actual list type');
            }
            return $.ui.sortable.prototype._create.apply(this, arguments);
        },

        destroy: function () {
            this.element
                .removeData('nestedSortable')
                .unbind('.nestedSortable');
            return $.ui.sortable.prototype.destroy.apply(this, arguments);
        },

        _mouseDrag: function (event) {

            //Compute the helpers position
            this.position = this._generatePosition(event);
            this.positionAbs = this._convertPositionTo("absolute");

            if (!this.lastPositionAbs) {
                this.lastPositionAbs = this.positionAbs;
            }

            var o = this.options;

            //Do scrolling
            if (this.options.scroll) {
                var scrolled = false;
                if (this.scrollParent[0] != document && this.scrollParent[0].tagName != 'HTML') {

                    if ((this.overflowOffset.top + this.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity)
                        this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop + o.scrollSpeed;
                    else if (event.pageY - this.overflowOffset.top < o.scrollSensitivity)
                        this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop - o.scrollSpeed;

                    if ((this.overflowOffset.left + this.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity)
                        this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft + o.scrollSpeed;
                    else if (event.pageX - this.overflowOffset.left < o.scrollSensitivity)
                        this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft - o.scrollSpeed;

                } else {

                    if (event.pageY - $(document).scrollTop() < o.scrollSensitivity)
                        scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
                    else if ($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity)
                        scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);

                    if (event.pageX - $(document).scrollLeft() < o.scrollSensitivity)
                        scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
                    else if ($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
                        scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);

                }

                if (scrolled !== false && $.ui.ddmanager && !o.dropBehaviour)
                    $.ui.ddmanager.prepareOffsets(this, event);
            }

            //Regenerate the absolute position used for position checks
            this.positionAbs = this._convertPositionTo("absolute");

            // Find the top offset before rearrangement,
            var previousTopOffset = this.placeholder.offset().top;

            //Set the helper position
            if (!this.options.axis || this.options.axis != "y") {
                this.helper[0].style.left = this.position.left + 'px';
            }
            if (!this.options.axis || this.options.axis != "x") {
                this.helper[0].style.top = this.position.top + 'px';
            }

            //Rearrange
            for (var i = this.items.length - 1; i >= 0; i--) {

                //Cache variables and intersection, continue if no intersection
                var item = this.items[i], itemElement = item.item[0], intersection = this._intersectsWithPointer(item);
                if (!intersection) continue;

                if (itemElement != this.currentItem[0] && //cannot intersect with itself
                    this.placeholder[intersection == 1 ? "next" : "prev"]()[0] != itemElement && //no useless actions that have been done before
                    !$.contains(this.placeholder[0], itemElement) && //no action if the item moved is the parent of the item checked
                    (this.options.type == 'semi-dynamic' ? !$.contains(this.element[0], itemElement) : true)
                //&& itemElement.parentNode == this.placeholder[0].parentNode // only rearrange items within the same container
                    ) {

                    $(itemElement).mouseenter();

                    this.direction = intersection == 1 ? "down" : "up";

                    if (this.options.tolerance == "pointer" || this._intersectsWithSides(item)) {
                        $(itemElement).mouseleave();
                        this._rearrange(event, item);
                    } else {
                        break;
                    }

                    // Clear emtpy ul's/ol's
                    this._clearEmpty(itemElement);

                    this._trigger("change", event, this._uiHash());
                    break;
                }
            }

            var parentItem = (this.placeholder[0].parentNode.parentNode &&
                    $(this.placeholder[0].parentNode.parentNode).closest('.ui-sortable').length)
                    ? $(this.placeholder[0].parentNode.parentNode)
                    : null,
                level = this._getLevel(this.placeholder),
                childLevels = this._getChildLevels(this.helper);

            // To find the previous sibling in the list, keep backtracking until we hit a valid list item.
            var previousItem = this.placeholder[0].previousSibling ? $(this.placeholder[0].previousSibling) : null;
            if (previousItem != null) {
                while (previousItem[0].nodeName.toLowerCase() != 'li' || previousItem[0] == this.currentItem[0] || previousItem[0] == this.helper[0]) {
                    if (previousItem[0].previousSibling) {
                        previousItem = $(previousItem[0].previousSibling);
                    } else {
                        previousItem = null;
                        break;
                    }
                }
            }

            // To find the next sibling in the list, keep stepping forward until we hit a valid list item.
            var nextItem = this.placeholder[0].nextSibling ? $(this.placeholder[0].nextSibling) : null;
            if (nextItem != null) {
                while (nextItem[0].nodeName.toLowerCase() != 'li' || nextItem[0] == this.currentItem[0] || nextItem[0] == this.helper[0]) {
                    if (nextItem[0].nextSibling) {
                        nextItem = $(nextItem[0].nextSibling);
                    } else {
                        nextItem = null;
                        break;
                    }
                }
            }

            var newList = document.createElement(o.listType);

            this.beyondMaxLevels = 0;

            // If the item is moved to the left, send it to its parent's level unless there are siblings below it.
            if (parentItem != null && nextItem == null &&
                (o.rtl && (this.positionAbs.left + this.helper.outerWidth() > parentItem.offset().left + parentItem.outerWidth()) ||
                    !o.rtl && (this.positionAbs.left < parentItem.offset().left))) {
                parentItem.after(this.placeholder[0]);
                this._clearEmpty(parentItem[0]);
                this._trigger("change", event, this._uiHash());
            }
            // If the item is below a sibling and is moved to the right, make it a child of that sibling.
            else if (previousItem != null &&
                (o.rtl && (this.positionAbs.left + this.helper.outerWidth() < previousItem.offset().left + previousItem.outerWidth() - o.tabSize) ||
                    !o.rtl && (this.positionAbs.left > previousItem.offset().left + o.tabSize))) {
                this._isAllowed(previousItem, level, level + childLevels + 1);
                if (!previousItem.children(o.listType).length) {
                    previousItem[0].appendChild(newList);
                }
                // If this item is being moved from the top, add it to the top of the list.
                if (previousTopOffset && (previousTopOffset <= previousItem.offset().top)) {
                    previousItem.children(o.listType).prepend(this.placeholder);
                }
                // Otherwise, add it to the bottom of the list.
                else {
                    previousItem.children(o.listType)[0].appendChild(this.placeholder[0]);
                }
                this._trigger("change", event, this._uiHash());
            }
            else {
                this._isAllowed(parentItem, level, level + childLevels);
            }

            //Post events to containers
            this._contactContainers(event);

            //Interconnect with droppables
            if ($.ui.ddmanager) $.ui.ddmanager.drag(this, event);

            //Call callbacks
            this._trigger('sort', event, this._uiHash());

            this.lastPositionAbs = this.positionAbs;
            return false;

        },

        _mouseStop: function (event, noPropagation) {

            // If the item is in a position not allowed, send it back
            if (this.beyondMaxLevels) {

                this.placeholder.removeClass(this.options.errorClass);

                if (this.domPosition.prev) {
                    $(this.domPosition.prev).after(this.placeholder);
                } else {
                    $(this.domPosition.parent).prepend(this.placeholder);
                }

                this._trigger("revert", event, this._uiHash());

            }

            // Clean last empty ul/ol
            for (var i = this.items.length - 1; i >= 0; i--) {
                var item = this.items[i].item[0];
                this._clearEmpty(item);
            }

            $.ui.sortable.prototype._mouseStop.apply(this, arguments);

        },

        serialize: function (options) {

            var o = $.extend({}, this.options, options),
                items = this._getItemsAsjQuery(o && o.connected),
                str = [];

            $(items).each(function () {
                var res = ($(o.item || this).attr(o.attribute || 'id') || '')
                        .match(o.expression || (/(.+)[-=_](.+)/)),
                    pid = ($(o.item || this).parent(o.listType)
                        .parent(o.items)
                        .attr(o.attribute || 'id') || '')
                        .match(o.expression || (/(.+)[-=_](.+)/));

                if (res) {
                    str.push(((o.key || res[1]) + '[' + (o.key && o.expression ? res[1] : res[2]) + ']')
                        + '='
                        + (pid ? (o.key && o.expression ? pid[1] : pid[2]) : o.rootID));
                }
            });

            if (!str.length && o.key) {
                str.push(o.key + '=');
            }

            return str.join('&');

        },

        toHierarchy: function (options) {

            var o = $.extend({}, this.options, options),
                sDepth = o.startDepthCount || 0,
                ret = [];

            $(this.element).children(o.items).each(function () {
                var level = _recursiveItems(this);
                ret.push(level);
            });

            return ret;

            function _recursiveItems(item) {
                var id = ($(item).attr(o.attribute || 'id') || '').match(o.expression || (/(.+)[-=_](.+)/));
                if (id) {
                    var currentItem = {"id": id[2]};
                    if ($(item).children(o.listType).children(o.items).length > 0) {
                        currentItem.children = [];
                        $(item).children(o.listType).children(o.items).each(function () {
                            var level = _recursiveItems(this);
                            currentItem.children.push(level);
                        });
                    }
                    return currentItem;
                }
            }
        },

        toArray: function (options) {

            var o = $.extend({}, this.options, options),
                sDepth = o.startDepthCount || 0,
                ret = [],
                left = 2;

            ret.push({
                "item_id": o.rootID,
                "parent_id": 'none',
                "depth": sDepth,
                "left": '1',
                "right": ($(o.items, this.element).length + 1) * 2
            });

            $(this.element).children(o.items).each(function () {
                left = _recursiveArray(this, sDepth + 1, left);
            });

            ret = ret.sort(function (a, b) {
                return (a.left - b.left);
            });

            return ret;

            function _recursiveArray(item, depth, left) {

                var right = left + 1,
                    id,
                    pid;

                if ($(item).children(o.listType).children(o.items).length > 0) {
                    depth++;
                    $(item).children(o.listType).children(o.items).each(function () {
                        right = _recursiveArray($(this), depth, right);
                    });
                    depth--;
                }

                id = ($(item).attr(o.attribute || 'id')).match(o.expression || (/(.+)[-=_](.+)/));

                if (depth === sDepth + 1) {
                    pid = o.rootID;
                } else {
                    var parentItem = ($(item).parent(o.listType)
                        .parent(o.items)
                        .attr(o.attribute || 'id'))
                        .match(o.expression || (/(.+)[-=_](.+)/));
                    pid = parentItem[2];
                }

                if (id) {
                    ret.push({"item_id": id[2], "parent_id": pid, "depth": depth, "left": left, "right": right});
                }

                left = right + 1;
                return left;
            }

        },

        _clearEmpty: function (item) {

            var emptyList = $(item).children(this.options.listType);
            if (emptyList.length && !emptyList.children().length && !this.options.doNotClear) {
                emptyList.remove();
            }

        },

        _getLevel: function (item) {

            var level = 1;

            if (this.options.listType) {
                var list = item.closest(this.options.listType);
                while (list && list.length > 0 && !list.is('.ui-sortable')) {
                    level++;
                    list = list.parent().closest(this.options.listType);
                }
            }

            return level;
        },

        _getChildLevels: function (parent, depth) {
            var self = this,
                o = this.options,
                result = 0;
            depth = depth || 0;

            $(parent).children(o.listType).children(o.items).each(function (index, child) {
                result = Math.max(self._getChildLevels(child, depth + 1), result);
            });

            return depth ? result + 1 : result;
        },

        _isAllowed: function (parentItem, level, levels) {
            var o = this.options,
                isRoot = $(this.domPosition.parent).hasClass('ui-sortable') ? true : false,
                maxLevels = this.placeholder.closest('.ui-sortable').nestedSortable('option', 'maxLevels'); // this takes into account the maxLevels set to the recipient list

            // Is the root protected?
            // Are we trying to nest under a no-nest?
            // Are we nesting too deep?
            if (!o.isAllowed(this.currentItem, parentItem) ||
                parentItem && parentItem.hasClass(o.disableNesting) ||
                o.protectRoot && (parentItem == null && !isRoot || isRoot && level > 1)) {
                this.placeholder.addClass(o.errorClass);
                if (maxLevels < levels && maxLevels != 0) {
                    this.beyondMaxLevels = levels - maxLevels;
                } else {
                    this.beyondMaxLevels = 1;
                }
            } else {
                if (maxLevels < levels && maxLevels != 0) {
                    this.placeholder.addClass(o.errorClass);
                    this.beyondMaxLevels = levels - maxLevels;
                } else {
                    this.placeholder.removeClass(o.errorClass);
                    this.beyondMaxLevels = 0;
                }
            }
        }

    }));

    $.mjs.nestedSortable.prototype.options = $.extend({}, $.ui.sortable.prototype.options, $.mjs.nestedSortable.prototype.options);
})(jQuery);

define('ng-editable-tree', [], function () {
    'use strict';

    /**
     * @url http://jsfiddle.net/EJGHX/
     */
    angular.module('ngEditableTree', ['ngResource'])
        .directive('treeView', function () {

            return {
                restrict: 'A',
                transclude: 'element',
                priority: 1000,
                terminal: true,
                compile: function (tElement, tAttrs, transclude) {

                    var repeatExpr, childExpr, rootExpr, childrenExpr, branchExpr;

                    repeatExpr = tAttrs.treeView.match(/^(.*) in ((?:.*\.)?(.*)) at (.*)$/);
                    childExpr = repeatExpr[1];
                    rootExpr = repeatExpr[2];
                    childrenExpr = repeatExpr[3];
                    branchExpr = repeatExpr[4];

                    return function link(scope, element, attrs) {

                        var rootElement = element[0].parentNode,
                            cache = [];

                        // Reverse lookup object to avoid re-rendering elements
                        function lookup(child) {
                            var i = cache.length;
                            while (i--) {
                                if (cache[i].scope[childExpr] === child) {
                                    return cache.splice(i, 1)[0];
                                }
                            }
                        }

                        scope.$watch(rootExpr, function (root) {

                            var currentCache = [];

                            // Recurse the data structure
                            (function walk(children, parentNode, parentScope, depth) {

                                var i = 0,
                                    n = (children) ? children.length : 0,
                                    last = n - 1,
                                    cursor,
                                    child,
                                    cached,
                                    childScope,
                                    grandchildren;

                                // Iterate the children at the current level
                                for (; i < n; ++i) {

                                    // We will compare the cached element to the element in
                                    // at the destination index. If it does not match, then
                                    // the cached element is being moved into this position.
                                    cursor = parentNode.childNodes[i];

                                    child = children[i];

                                    // See if this child has been previously rendered
                                    // using a reverse lookup by object reference
                                    cached = lookup(child);

                                    // If the parentScope no longer matches, we've moved.
                                    // We'll have to transclude again so that scopes
                                    // and controllers are properly inherited
                                    if (cached && cached.parentScope !== parentScope) {
                                        cache.push(cached);
                                        cached = null;
                                    }

                                    // If it has not, render a new element and prepare its scope
                                    // We also cache a reference to its branch node which will
                                    // be used as the parentNode in the next level of recursion
                                    if (!cached) {
                                        transclude(parentScope.$new(), function (clone, childScope) {

                                            childScope[childExpr] = child;

                                            cached = {
                                                scope: childScope,
                                                parentScope: parentScope,
                                                element: clone[0],
                                                branch: clone.find(branchExpr)[0]
                                            };

                                            // This had to happen during transclusion so inherited
                                            // controllers, among other things, work properly
                                            parentNode.insertBefore(cached.element, cursor);

                                        });
                                    } else if (cached.element !== cursor) {
                                        parentNode.insertBefore(cached.element, cursor);
                                    }

                                    // Lets's set some scope values
                                    childScope = cached.scope;

                                    // Store the current depth on the scope in case you want
                                    // to use it (for good or evil, no judgment).
                                    childScope.$depth = depth;

                                    // Emulate some ng-repeat values
                                    childScope.$index = i;
                                    childScope.$first = (i === 0);
                                    childScope.$last = (i === last);
                                    childScope.$middle = !(childScope.$first || childScope.$last);

                                    // Push the object onto the new cache which will replace
                                    // the old cache at the end of the walk.
                                    currentCache.push(cached);

                                    // If the child has children of its own, recurse 'em.
                                    grandchildren = child[childrenExpr];
                                    if (grandchildren && grandchildren.length) {
                                        walk(grandchildren, cached.branch, childScope, depth + 1);
                                    }
                                }
                            })(root, rootElement, scope, 0);

                            // Cleanup objects which have been removed.
                            // Remove DOM elements and destroy scopes to prevent memory leaks.
                            var i = cache.length;

                            while (i--) {
                                var cached = cache[i];
                                if (cached.scope) {
                                    cached.scope.$destroy();
                                }
                                if (cached.element) {
                                    cached.element.parentNode.removeChild(cached.element);
                                }
                            }

                            // Replace previous cache.
                            cache = currentCache;

                        }, true);
                    };
                }
            };
        })
        .directive('treeViewSortable', ['$parse', function ($parse) {
            var eventTypes = 'Create Start Sort Change BeforeStop Update Receive Remove Over Out Activate Deactivate'.split(' ');

            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var options = {
                        listType: 'ol',
                        items: 'li',
                        doNotClear: true,
                        handle: '.title-item-menu',
                        placeholder: 'nav-placeholder',
                        forcePlaceholderSize: true,
                        maxLevels: 5,
                        toleranceElement: '> div'
                    };
                    var nodeOptions = attrs.treeViewSortableOptions ? $parse(attrs.treeViewSortableOptions)() : {};
                    options = angular.extend(options, nodeOptions);
                    var tree = $parse(attrs.treeViewSortable)(scope);

                    scope.$watch(attrs.treeViewSortable, function (value) {
                        tree = value;
                    });
                    // open collapsed element
                    options.sort = function (event, ui) {
                        var parents = $(ui.placeholder).parents('li.ng-scope', '.nav-nested');
                        $.each(parents, function (index, element) {
                            var el = angular.element(element),
                                scope = el.scope(),
                                repeatExpr = $(element).attr('tree-view').match(/^(.*) in ((?:.*\.)?(.*)) at (.*)$/);

                            scope.$apply(function () {
                                scope[repeatExpr[1]].$expanded = true;
                            });
                        });
                    };

                    // sort childrens
                    options.stop = function (event, ui) {
                        var root = event.target,
                            item = ui.item,
                            parent = item.parent(),
                            target = (parent[0] === root) ? tree : parent.scope().child,
                            child = item.scope().child,
                            index = item.index();

                        var before = target.moveArray(tree, child, item.index());

                        var callback = $parse(attrs.treeViewMove);
                        scope.$apply(function () {
                            callback(scope, {
                                $item: child,
                                $before: before,
                                $index: index
                            });
                        });
                    };

                    angular.forEach(eventTypes, function (eventType) {

                        var attr = attrs['treeViewSortable' + eventType], callback;

                        if (attr) {
                            callback = $parse(attr);
                            options[eventType.charAt(0).toLowerCase() + eventType.substr(1)] = function (event, ui) {
                                scope.$apply(function () {

                                    callback(scope, {
                                        $event: event,
                                        $ui: ui
                                    });
                                });
                            };
                        }

                    });

                    element.nestedSortable(options);
                }
            };
        }])
        .factory('ngNestedResource', ['$resource', '$q', '$rootScope', function ($resource, $q, $rootScope) {
            function ResourceFactory(url, paramDefaults, actions, options) {
                var defaultActions = {
                    update: { method: 'POST' },
                    create: { method: 'PUT', params: { 'insert': true } },
                    move: { method: 'PUT', params: { 'move': true } }
                };
                actions = angular.extend(defaultActions, actions);
                options = angular.extend({
                    'nestedField': 'children'
                }, options);
                var resource = $resource(url, paramDefaults, actions);

                function walk(items, parent) {
                    parent = parent || null;
                    for (var i = 0, max = items.length; i < max; i++) {
                        if (!items[i][options.nestedField]) {
                            items[i][options.nestedField] = [];
                        }
                        if (!(items[i] instanceof resource)) {
                            items[i] = new resource(items[i]);
                        }
                        if (items[i][options.nestedField].length) {
                            walk(items[i][options.nestedField], items[i]);
                        }
                    }
                }
                resource.prototype.$insertItem = function (cb) {
                    cb = cb || angular.noop;
                    var currentItem = this,
                        clone = angular.copy(this); // clone object because angular resource update original data
                    return clone.$create({ 'id': currentItem.id }, function (item) {
                        item[options.nestedField] = [];
                        currentItem.$expanded = true;
                        currentItem[options.nestedField].unshift(item);
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                        cb(item);
                    });
                };

                resource.prototype.moveArray = function (tree, child, index) {
                    this[options.nestedField] || (this[options.nestedField] = []);
                    function walk(target, child) {
                        var children = target[options.nestedField], i;
                        if (children) {
                            i = children.length;
                            while (i--) {
                                if (children[i] === child) {
                                    return children.splice(i, 1);
                                } else {
                                    walk(children[i], child);
                                }
                            }
                        }
                    }
                    walk(tree, child);

                    this[options.nestedField].splice(index, 0, child);

                    return (index) ? this[options.nestedField][index - 1] : this;
                };
                resource.prototype.$moveItem = function (before, position, cb) {
                    cb = cb || angular.noop;
                    var clone = new resource(this);
                    return clone.$move({ 'id': this.id, 'insert': position == 0, 'before': before.id }, function (item) {
                        cb(item);
                    });
                };
                resource.getTree = function (data, cb) {
                    cb = cb || angular.noop;
                    if (typeof data == 'function') {
                        cb = data;
                        data = {};
                    }
                    var def = $q.defer();
                    resource.get(data, function (result) {
                        walk(result[options.nestedField]);
                        def.resolve(result);
                        cb(result);
                    });
                    return def.promise;
                };

                var findWalk = function (data, iterator, parents) {
                    parents = parents || [];
                    if (angular.isUndefined(data)) {
                        return null;
                    }
                    if (iterator.call(this, data)) {
                        return data;
                    }
                    var res = null;
                    for (var i = 0, max = data[options.nestedField].length; i < max; i++) {
                        res = findWalk(data[options.nestedField][i], iterator, parents);
                        if (res) {
                            parents.push(data[options.nestedField][i]);
                            break;
                        }
                    }
                    return res;
                };
                resource.find = function (data, iterator, parents) {
                    return findWalk(data, iterator, parents);
                };
                return resource;
            }

            return ResourceFactory;
        }]);


});