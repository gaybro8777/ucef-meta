/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Tue Jan 24 2017 15:36:09 GMT-0600 (CST).
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

    var INT_ATTRIBUTES = ["name", "Order", "LogLevel", "EnableLogging", "Delivery"],
        PARAM_ATTRIBUTES = ["name", "Hidden", "ParameterType"];
    pluginMetadata = JSON.parse(pluginMetadata);
    var callback = null;

    /**
     * Initializes a new instance of ImportFromRegistry.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ImportFromRegistry.
     * @constructor
     */
    var ImportFromRegistry = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    ImportFromRegistry.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ImportFromRegistry.prototype = Object.create(PluginBase.prototype);
    ImportFromRegistry.prototype.constructor = ImportFromRegistry;

    ImportFromRegistry.prototype.notify = function (level, msg) {
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
    ImportFromRegistry.prototype.main = function (cb) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;

        self.action = this._currentConfig['action'] || "CREATE_NEW";
        self.object = this._currentConfig['object'] || {};
        self.objectKind = this._currentConfig['objectKind'] || "federate";
        self.existingInteractions = this._currentConfig['existingInteractions'] || {};
        self.objectsByKind = this._currentConfig['objectsByKind'] || {};

        //Pass in things like core, rootNode, activeNode and META from previous plugin

        self.core = this._currentConfig['core'] || self.core;
        self.rootNode = this._currentConfig['rootNode'] || self.rootNode;
        self.activeNode = this._currentConfig['activeNode'] || self.activeNode;
        self.META = this._currentConfig['META'] || self.META;
        //self.container = this._currentConfig['container'] || null;
        self.container = self.activeNode;

        self.postProcesses = 0;

        if (self.objectKind == 'federate'){
            this.importFederate();
        }

        self.finalize();
        callback = cb;
    };

    ImportFromRegistry.prototype.finalize = function(){
        var self = this;

        if (self.postProcesses == 0) {
            // This will save the changes. If you don't want to save;
            // exclude self.save and call callback directly from this scope.
            self.save('ImportFromRegistry updated model.')
                .then(function () {
                    self.result.setSuccess(true);
                    callback(null, self.result);
                })
                .catch(function (err) {
                    // Result success is false at invocation.
                    callback(err, self.result);
                });
        }
    };

    ImportFromRegistry.prototype.upsertInteraction = function(
        interactionObj, isInput, federateNode){
        var self = this,
            connectionNode,
            attributeName,
            i,
            attributeValue;

        if (interactionObj != null && interactionObj.status == 'OK'){
            if (interactionObj.gmeNode == null) {
                // This interaction does not exists yet, so let's create it

                // Upsert base interaction and use that
                var baseInteraction = self.upsertInteraction(
                    interactionObj["base"],
                    isInput,
                    null
                );
                interactionObj.gmeNode = self.core.createNode({
                    parent: self.container,
                    base:baseInteraction
                });

                // Set attributes
                for (i = 0; i < INT_ATTRIBUTES.length; i++) {
                    attributeName = INT_ATTRIBUTES[i];
                    self.core.setAttribute(
                        interactionObj.gmeNode,
                        attributeName,
                        interactionObj.attributes[attributeName]);
                }

                // Create parameters and set their attributes when needed
                self.postProcesses += 1;
                self.core.loadChildren(interactionObj.gmeNode, function (err, children) {
                    if (err) {
                        // Something went wrong!
                        // Handle the error and return.
                    }
                    var parameters = interactionObj['parameters'],
                        paramObj,
                        paramNode,
                        existingParameters = {},
                        paramName,
                        i, j;

                    for (i = 0; i < children.length; i += 1) {
                        paramNode = children[i];
                        paramName = self.core.getAttribute(paramNode, 'name');
                        existingParameters[paramName] = paramNode;
                    }

                    parameters.map(function(param){
                        if (!existingParameters.hasOwnProperty(param['name'])){
                            paramObj = self.core.createNode({
                                parent: interactionObj.gmeNode,
                                base: self.META['Parameter']
                            });
                        } else {
                            paramObj = existingParameters[param['name']];
                        }
                        for (j = 0; j < PARAM_ATTRIBUTES.length; j++) {
                            attributeName = PARAM_ATTRIBUTES[j];
                            attributeValue = self.core.setAttribute(
                                paramObj,
                                attributeName,
                                param[attributeName]
                            );
                        }
                    });

                    self.postProcesses -= 1;
                    self.finalize();
                });

            }
            if (federateNode != null){
                if (interactionObj.gmeNode) {
                    // Connect federate node and interaction node
                    // Only works if they are contained in the same parent???
                    if (isInput){
                        // Create connection node
                        connectionNode = self.core.createNode(
                            {parent: self.container,
                                base:self.META['StaticInteractionSubscribe']}
                        );

                        // Set source and destination
                        self.core.setPointer(connectionNode, 'src', interactionObj.gmeNode);
                        self.core.setPointer(connectionNode, 'dst', federateNode);
                    } else {
                        // Create connection node
                        connectionNode = self.core.createNode({
                            parent: self.container,
                            base:self.META['StaticInteractionPublish']
                        });

                        // Set source and destination
                        self.core.setPointer(connectionNode, 'src', federateNode);
                        self.core.setPointer(connectionNode, 'dst', interactionObj.gmeNode);
                    }

                }
            }
        }

        return interactionObj.gmeNode;

    };

    ImportFromRegistry.prototype.importFederate = function(){
        var self = this,
            federateNode,
            baseType = 'Federate';

        if (self.object){
            // Add federate
            baseType = self.object['__FEDERATE_BASE__'] || 'Federate';
            federateNode = self.core.createNode(
                {parent: self.container, base:self.META[baseType]});

            // Add attributes
            var attrNames = Object.keys(self.object.attributes);
            attrNames.map(function (attrName) {
                self.core.setAttribute(
                    federateNode,
                    attrName,
                    self.object.attributes[attrName]);
            });

            // Add new connections
            // For now assume all the interactions are in the local context
            // Also assume that they all exist
            var inputNames = Object.keys(self.object.resolvedInputs);
            inputNames.map(function (inputName) {
                // Improvement: Only import selected interactions
                if (self.object.resolvedInputs[inputName].selected){
                    self.upsertInteraction(
                        self.object.resolvedInputs[inputName],
                        true,
                        federateNode
                    );
                }
            });

            var outputNames = Object.keys(self.object.resolvedOutputs);
            outputNames.map(function (outputName) {
                if (self.object.resolvedInputs[outputName].selected) {
                    self.upsertInteraction(
                        self.object.resolvedOutputs[outputName],
                        false,
                        federateNode
                    );
                }
            });
            // Create new crosscut when necessary

        }
    };

    return ImportFromRegistry;
});
