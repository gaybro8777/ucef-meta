/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Thu Jan 26 2017 15:13:20 GMT-0600 (CST).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of FindObjects.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin FindObjects.
     * @constructor
     */
    var FindObjects = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    FindObjects.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    FindObjects.prototype = Object.create(PluginBase.prototype);
    FindObjects.prototype.constructor = FindObjects;

    FindObjects.prototype.notify = function (level, msg) {
        var self = this;
        var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
        if (level == 'error')
            self.logger.error(msg);
        else if (level == 'debug')
            self.logger.debug(msg);
        else if (level == 'info')
            self.logger.info(msg);
        else if (level == 'warning')
            self.logger.warn(msg);
        self.createMessage(self.activeNode, msg, level);
        self.sendNotification(prefix + msg);
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    FindObjects.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            i, j, len,
            core = this.core,
            META = self.META,
            objectKinds = this._currentConfig['objectKinds'] || [],
            objectsByKind = {}; // objects are grouped by kind

        self.result.success = false;
        self.result.objectsByKind = objectsByKind;

        if (objectKinds.length > 0){
            len = objectKinds.length;
            for (i = 0; i < len; i++) {
                objectsByKind[objectKinds[i]] = [];
            }

            core.traverse(
                self.rootNode,
                {stopOnError: true},
                function (node, next) {
                    for (j = 0; j < len; j++) {
                        if (core.isTypeOf(node, META[objectKinds[j]])){
                            objectsByKind[objectKinds[j]].push(node);
                        }
                    }
                    next();
                }
            ).then(function () {
                self.result.objectsByKind = objectsByKind;
                self.result.core = self.core;
                self.result.rootNode = self.rootNode;
                self.result.activeNode = self.activeNode;
                self.result.META = self.META;
                self.result.setSuccess(true);
                callback(null, self.result);
            }).catch(function (err) {
                self.notify('error', err);
                self.result.setSuccess(false);
                callback(err, self.result);
            })
            .done();
        } else {
            callback(null, self.result);
        }
    };

    return FindObjects;
});
