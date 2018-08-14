/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Wed Nov 30 2016 15:18:07 GMT-0600 (CST).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'c2wtng/webgme-to-json',
    'js/Utils/ComponentSettings'
], function (PluginConfig,
             pluginMetadata,
             PluginBase,
             webgmeToJSON) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ExportToRegistry.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExportToRegistry.
     * @constructor
     */
    var ExportToRegistry = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    ExportToRegistry.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ExportToRegistry.prototype = Object.create(PluginBase.prototype);
    ExportToRegistry.prototype.constructor = ExportToRegistry;

    ExportToRegistry.prototype.notify = function (level, msg) {
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
    ExportToRegistry.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;
        self.result.success = false;

        // Using the coreAPI to make changes.
        webgmeToJSON.notify = function (level, msg) {};
        self.activeNodePath = self.core.getPath(self.activeNode);

        // Loading the model
        // don't resolve pointers and children, keep webgmeNodes as part of the JSON.
        //webgmeToJSON.loadModel(self.core, self.rootNode, self.activeNode.parent, true, true, true)
        webgmeToJSON.loadModel(self.core, self.rootNode, self.rootNode, true, true, true)
            .then(function (model) {
                self.model = model;
            })
            .then(function () {
                self.result.modelObject = self.processModel();
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                self.notify('error', err);
                self.result.setSuccess(false);
                callback(err, self.result);
            })
            .done();
    };

    ///////////////////////////////////////////////////////////////////////////
    // WebGME Model processing
    ///////////////////////////////////////////////////////////////////////////

    ExportToRegistry.prototype.processModel = function () {
        var self = this;
        // THIS FUNCTION HANDLES CREATION OF SOME CONVENIENCE MEMBERS
        // FOR SELECT OBJECTS IN THE MODEL

        // Need to create:
        //  - GUIDs for all objects (for now)
        //    - will be handled by DB intf
        //  - Versions for relevant objects (for now)
        //    - will be handled by DB intf
        //  - __OBJECTS__ list
        //    - will be handled by DB intf
        //  - <type> lists of GUID references
        //    - will be handled by DB intf

        // Need to convert:
        //  - federations to hierarchical federates
        //    - actually has to be done
        //  - all objects to __OBJECTS__ notation from example.js
        //    - actually has to be done
        //  - poitners to GUID references
        //    - will have to see exactly how this works, where we
        //      really get GUIDs from

        // for testing, need the structure that would be in the database
        self.initDB();

        var objectPaths = Object.keys(self.model.objects);
        // go through all objects and transform pointers to be RefSpecs
        objectPaths.map(function (objPath) {
            var obj = self.model.objects[objPath];
            self.processPointers(obj);
        });

        if (self.core.isTypeOf(self.activeNode, self.META.Federate)){
            var activeNodePath = self.core.getPath(self.activeNode);
            var obj = self.model.objects[activeNodePath];
            self.createFederateObjs(obj, objectPaths);
        }

        /*
        // these all update the model._DB with the relevant items
        objectPaths.map(function (objPath) {
            var obj = self.model.objects[objPath];
            if (self.core.isTypeOf(obj.node, self.META.InteractionBase))
                self.transformInteraction(obj);
            else if (self.core.isTypeOf(obj.node, self.META.Federate))
                self.transformFederate(obj);
        });

        // now that we have (ALL) the interactions and federates, we
        // can make sure the federate dependencies can be captured
        objectPaths.map(function (objPath) {
            var obj = self.model.objects[objPath];
            if (self.core.isTypeOf(obj.node, self.META.StaticInteractionPublish)) {
                self.resolvePublishers(obj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.StaticInteractionSubscribe)) {
                self.resolveSubscribers(obj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.COA)) {
                //self.transformCOA(obj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.Experiment)) {
                //self.extractExperiments(obj);
            }
        });*/

        // now that we've transformed the model, get rid of the
        // original data
        var db = self.model._DB;

        // Add root object
        db.__ROOT_OBJECT__ = self.getRefObject(self.activeNodePath);

        // need for testing since we will need these other objects
        self.buildDummyObjects(db);

        return db;
    };

    ExportToRegistry.prototype.initDB = function () {
        var self = this;
        self.model._DB = {
            "__OBJECTS__": {},
            "__ROOT_OBJECT__": {},
            "Federates": {},
            "COAs": {},
            "Experiments": {},
            "Interactions": {},
            "Objects": {},
            "ObjectAttribute": {}
        };
        self.model._PathToRef = {};
    };

    ExportToRegistry.prototype.buildDummyObjects = function (db) {
        db.Repositories = [];
        db.Builds = [];
        db.Executions = [];
    };

    ExportToRegistry.prototype.processPointers = function (obj) {
        var self = this;
        // this function handles conversion from webgme pointers to
        // database pointers; this means that pointers don't go to
        // paths, they go to database references.
        // pointers contains name -> path mappings
        var ptrNames = Object.keys(obj.pointers);
        ptrNames.map(function (ptrName) {
            var ptrPath = obj.pointers[ptrName];
            obj.pointers[ptrName] = self.getRefObject(ptrPath);
        });
    };

    ExportToRegistry.prototype.createFederateObjs = function(obj, objectPaths) {
        var self = this;
        var refObj = self.transformFederate(obj);
        var fedObj = self.model._DB.__OBJECTS__[refObj.GUID];
        objectPaths.map(function (objPath) {
            var obj = self.model.objects[objPath];
            if (self.core.isTypeOf(obj.node, self.META.StaticInteractionPublish) &&
            obj.node != self.META.StaticInteractionPublish) {
                self.resolvePublishers(obj, fedObj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.StaticInteractionSubscribe) &&
            obj.node != self.META.StaticInteractionSubscribe) {
                self.resolveSubscribers(obj, fedObj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.StaticObjectAttributePublish) &&
            obj.node != self.META.StaticObjectAttributePublish) {
//                 self.resolveSubscribers(obj, fedObj);
                //self.resolveObjectAttributePublisher(obj,fedObj);
              
            }
            else if (self.core.isTypeOf(obj.node, self.META.StaticObjectAttributeSubscribe) &&
            obj.node != self.META.StaticObjectAttributeSubscribe) {
               // self.resolveObjectAttributeSubscriber(obj, fedObj);
            }
            // else if (self.core.isTypeOf(obj.node, self.META.Object) &&
            // obj.node != self.META.Object) {
            //     self.resolveSubscribers(obj, fedObj);
            // }
            else if (self.core.isTypeOf(obj.node, self.META.StaticObjectSubscribe) &&
            obj.node != self.META.StaticObjectSubscribe) {
                self.resolveObjectSubscribers(obj, fedObj);
            }
            else if (self.core.isTypeOf(obj.node, self.META.StaticObjectPublish) &&
            obj.node != self.META.StaticObjectPublish) {
                self.resolveObjectPublishers(obj, fedObj);
            }
        });
    }

    ExportToRegistry.prototype.hasDBObject = function (original, type) {
        var self = this;
        var refObj = self.getRefObject(original.path);
        return refObj.GUID in this.model._DB[type];
    };


    ExportToRegistry.prototype.makeDBObject = function (original, obj, type) {
        // makes the object in the database and returns a reference object
        var self = this;
        var refObj = self.getRefObject(original.path);
        obj.GUID = refObj.GUID;
        if (!self.model._DB.__OBJECTS__[obj.GUID])
            self.model._DB.__OBJECTS__[obj.GUID] = {};
        self.model._DB.__OBJECTS__[obj.GUID] = obj;
        self.model._DB[type][obj.GUID] = '';
        return refObj;
    };

    ExportToRegistry.prototype.transformParameter = function (obj) {
        var self = this;
        // converts from the generic representation we have here
        // to the specific representation given in example.js
        if (obj == null)
            return null;
        var newObj = {
            name: obj.name,
            ParameterType: obj.attributes.ParameterType,
            Hidden: obj.attributes.Hidden
        };
        return newObj;
    };

    ExportToRegistry.prototype.transformParameters = function (obj) {
        var self = this;
        var parameters = [];
        obj.childPaths.map(function (childPath) {
            var childObj = self.model.objects[childPath];
            var childNode = childObj.node;
            if (self.core.isTypeOf(childNode, self.META.Parameter)) {
                parameters.push(self.transformParameter(childObj));
            }
        });
        return parameters;
    };

    ExportToRegistry.prototype.transformAttribute = function (obj) {
        var self = this;
        // converts from the generic representation we have here
        // to the specific representation given in example.js
        if (obj == null)
            return null;
        var newObj = {
            name: obj.name,
            AttributeType: obj.attributes.ParameterType,
            Hidden: obj.attributes.Hidden
        };
        return newObj;
    };

    ExportToRegistry.prototype.transformAttributes = function (obj) {
        var self = this;
        var parameters = [];
        obj.childPaths.map(function (childPath) {
            var childObj = self.model.objects[childPath];
            var childNode = childObj.node;
            if (self.core.isTypeOf(childNode, self.META.Attribute)) {
                parameters.push(self.transformAttribute(childObj));
            }
        });
        return parameters;
    };



    ExportToRegistry.prototype.resolveObjectAttributeSubscriber = function (obj, fedObj) {
        var self = this;
        var fedRef = obj.pointers.dst;  // will have been converted to refObj
        var intRef = obj.pointers.src;
        var intPath = obj.dst.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.outputs.push(intRef);
            self.transformObjectAttribute(intObj);
        }
    };

        ExportToRegistry.prototype.resolveObjectAttributePublishers = function (obj, fedObj) {
        var self = this;
        var fedRef = obj.pointers.src;  // will have been converted to refObj
        var intRef = obj.pointers.dst;
        var intPath = obj.dst.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.outputs.push(intRef);
            self.transformObjectAttribute(intObj);
        }
    };

    ExportToRegistry.prototype.resolveObjectPublishers = function (obj, fedObj) {
        var self = this;
        var fedRef = obj.pointers.src;  // will have been converted to refObj
        var intRef = obj.pointers.dst;
        var intPath = obj.dst.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.outputs.push(intRef);
            self.transformObject(intObj);
        }
    };

    ExportToRegistry.prototype.resolveObjectSubscribers = function (obj, fedObj) {
        var self = this;
        var fedRef = obj.pointers.dst;  // will have been converted to refObj
        var intRef = obj.pointers.src;
        var intPath = obj.dst.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.outputs.push(intRef);
            self.transformObject(intObj);
        }
    };

 ExportToRegistry.prototype.transformObjectAttribute = function (obj) {
        var self = this,
            basePath,
            baseObj;
        if (obj == null)
            return null;

        // Add base Interaction classes if necessary
        if (obj.base && (obj.base.name != obj.base.type)){
            basePath = obj.base.path;
            baseObj = self.model.objects[basePath];
            if (!self.hasDBObject(baseObj, 'ObjectAttribute')){
                self.transformObject(baseObj);
            }
        }

        var newObj = {};
        newObj.attributes = {};
        if (obj.pointers.base)
            newObj.__OBJECT_BASE__ = obj.pointers.base;
        else
            newObj.__OBJECT_BASE__ = obj.type;

        var attrNames = Object.keys(obj.attributes);
        attrNames.map(function (attrName) {
            newObj.attributes[attrName] = obj.attributes[attrName];
        });
        // get parameters here:
        //newObj.parameters = self.transformAttributes(obj);
        return self.makeDBObject(obj, newObj, 'ObjectAttribute');
    };

 ExportToRegistry.prototype.transformObject = function (obj) {
        var self = this,
            basePath,
            baseObj;
        if (obj == null)
            return null;

        // Add base Interaction classes if necessary
        if (obj.base && (obj.base.name != obj.base.type)){
            basePath = obj.base.path;
            baseObj = self.model.objects[basePath];
            if (!self.hasDBObject(baseObj, 'Objects')){
                self.transformObject(baseObj);
            }
        }

        var newObj = {};
        newObj.attributes = {};
        if (obj.pointers.base)
            newObj.__OBJECT_BASE__ = obj.pointers.base;
        else
            newObj.__OBJECT_BASE__ = obj.type;

        var attrNames = Object.keys(obj.attributes);
        attrNames.map(function (attrName) {
            newObj.attributes[attrName] = obj.attributes[attrName];
        });
        // get parameters here:
        newObj.parameters = self.transformAttributes(obj);
        return self.makeDBObject(obj, newObj, 'Objects');
    };

    ExportToRegistry.prototype.resolvePublishers = function (obj, fedObj) {
        var self = this;
        var fedRef = obj.pointers.src;  // will have been converted to refObj
        var intRef = obj.pointers.dst;
        var intPath = obj.dst.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.outputs.push(intRef);
            self.transformInteraction(intObj);
        }
    };

    ExportToRegistry.prototype.resolveSubscribers = function (obj, fedObj) {
        var self = this;
        var intRef = obj.pointers.src;
        var fedRef = obj.pointers.dst;
        var intPath = obj.src.path;
        var intObj = self.model.objects[intPath];
        if (fedObj.GUID == fedRef.GUID){
            fedObj.inputs.push(intRef);
            self.transformInteraction(intObj);
        }
    };

    ExportToRegistry.prototype.transformInteraction = function (obj) {
        var self = this,
            basePath,
            baseObj;
        if (obj == null)
            return null;

        // Add base Interaction classes if necessary
        if (obj.base && (obj.base.name != obj.base.type)){
            basePath = obj.base.path;
            baseObj = self.model.objects[basePath];
            if (!self.hasDBObject(baseObj, 'Interactions')){
                self.transformInteraction(baseObj);
            }
        }

        var newObj = {};
        newObj.attributes = {};
        if (obj.pointers.base)
            newObj.__INTERACTION_BASE__ = obj.pointers.base;
        else
            newObj.__INTERACTION_BASE__ = obj.type;

        var attrNames = Object.keys(obj.attributes);
        attrNames.map(function (attrName) {
            newObj.attributes[attrName] = obj.attributes[attrName];
        });
        // get parameters here:
        newObj.parameters = self.transformParameters(obj);
        return self.makeDBObject(obj, newObj, 'Interactions');
    };

    ExportToRegistry.prototype.transformFederate = function (obj) {
        var self = this;
        // converts from the generic representation we have here
        // to the specific representation given in example.js
        if (obj == null)
            return null;
        var newObj = {'attributes': {}};
        newObj.attributes = {};
        newObj.__FEDERATE_BASE__ = obj.type;
        var attrNames = Object.keys(obj.attributes);
        attrNames.map(function (attrName) {
            newObj.attributes[attrName] = obj.attributes[attrName];
        });
        // capture any child federates that may exist
        newObj.federates = self.makeAndReturnChildFederates(obj);
        // set the type based on whether it contains feds or not:
        if (newObj.federates.length) {
            newObj.__FEDERATE_TYPE__ = "not directly deployable";
        }
        else {
            newObj.__FEDERATE_TYPE__ = "directly deployable";
        }
        // capture any parameters that may exist
        newObj.parameters = self.transformParameters(obj);
        // initialize the inputs (interaction subscribe) and outputs (interaction publish)
        newObj.inputs = [];
        newObj.outputs = [];

        // Scrub registry_info
        newObj.RegistryInfo = "";

        // add any missing keys needed by schema
        var addedKeys = ['documentation', 'repository'];
        addedKeys.map(function (key) {
            newObj[key] = "No " + key + " exists yet.";
        });
        return self.makeDBObject(obj, newObj, 'Federates');
    };

    ExportToRegistry.prototype.makeAndReturnChildFederates = function (obj) {
        // recursive function to make all heirarchical federates
        var self = this;
        var newFeds = []; // will contain the list of references to any child feds
        obj.childPaths.map(function (childPath) {
            var childObj = self.model.objects[childPath];
            var childNode = childObj.node;
            if (self.core.isTypeOf(childNode, self.META.Federate)) {
                var refObj = self.transformFederate(childObj);
                if (newObj) {
                    newFeds.push(refObj);
                }
            }
        });
        return newFeds; // list of references to new objects
    };
    
    ExportToRegistry.prototype.getRefObject = function (path) {
        var self = this;
        var refObj = self.model._PathToRef[path];
        if (!refObj) { // need to make one
            refObj = {
                GUID: self.generateGUID()  // wouldn't actually happen in the plugin
            };
            self.model._PathToRef[path] = refObj;
        }
        return refObj;
    };

    ExportToRegistry.prototype.generateGUID = function () {
        var d = new Date().getTime();
        if (typeof(window) !== 'undefined') {
            if (window.performance && typeof window.performance.now === "function")
                d += performance.now(); //use high-precision timer if available
        }
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };

    return ExportToRegistry;
});
