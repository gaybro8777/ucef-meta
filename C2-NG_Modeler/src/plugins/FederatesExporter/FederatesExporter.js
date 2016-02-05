/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Wed Dec 02 2015 15:05:52 GMT-0600 (CST).
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/ejs',
    'C2Core/ModelTraverserMixin',
    'C2Core/xmljsonconverter',
    'C2Core/MavenPOM',
    'C2Federates/Templates/Templates',
    'C2Federates/GenericFederate',
    'C2Federates/JavaFederate',
    'C2Federates/CPNFederate'
], function (
    PluginConfig,
    PluginBase,
    ejs,
    ModelTraverserMixin,
    JSON2XMLConverter,
    MavenPOM,
    TEMPLATES,
    GenericFederate,
    JavaFederate,
    CPNFederate
    ) {
    'use strict';

    /**
     * Initializes a new instance of FederatesExporter.
     * @class
     * @augments {PluginBase}typ
     * @classdesc This class represents the plugin FederatesExporter.
     * @constructor
     */
    var FederatesExporter = function () {
        // Call base class' constructor.

        this.federateTypes = this.federateTypes || {};  

        PluginBase.call(this);
        ModelTraverserMixin.call(this);
        GenericFederate.call(this);
        JavaFederate.call(this);
        CPNFederate.call(this);

        this.mainPom = new MavenPOM();
        this._jsonToXml = new JSON2XMLConverter.Json2xml();
    };

    // Prototypal inheritance from PluginBase.
    FederatesExporter.prototype = Object.create(PluginBase.prototype);
    FederatesExporter.prototype.constructor = FederatesExporter;

    /**
     * Gets the name of the FederatesExporter.
     * @returns {string} The name of the plugin.
     * @public
     */
    FederatesExporter.prototype.getName = function () {
        return 'FederatesExporter';
    };

    /**
     * Gets the semantic version (semver.org) of the FederatesExporter.
     * @returns {string} The version of the plugin.
     * @public
     */
    FederatesExporter.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the FederatesExporter.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    FederatesExporter.prototype.getConfigStructure = function () {
        var baseURLDefault = 'https://editor.webgme.org',
            usernameDefault = 'guest',
            allFederateTypes = '';

        if(window){
            baseURLDefault = window.location.protocol + window.location.pathname + window.location.pathname + window.location.host;
        }

        if(WebGMEGlobal && WebGMEGlobal.Client){
            usernameDefault = WebGMEGlobal.Client.getUserId();
        }

        if(this.federateTypes){
            for(var typeKey in this.federateTypes){
                allFederateTypes+=typeKey + ' '
            }
            allFederateTypes.trim();
        }

        return [
            {
                name: 'exportVersion',
                displayName: 'version',
                description: 'The version of the model to be exported',
                value: '0.0.1',
                valueType: 'string',
                readOnly: false
            },{
                name: 'isRelease',
                displayName: 'release',
                description: 'Is the model a release version?   ',
                value: false,
                valueType: 'boolean',
                readOnly: false
            },{
                name: 'groupId',
                displayName: 'Maven GroupID',
                description: 'The group ID to be included in the Maven POMs',
                value: 'org.webgme.' + usernameDefault,
                valueType: 'string',
                readOnly: false
            },{
                name: 'repositoryUrlSnapshot',
                displayName: 'Repository URL for snapshots',
                description: 'The URL of the repository where the packaged components should be deployed.',
                value: 'http://c2w-cdi.isis.vanderbilt.edu:8088/repository/snapshots/',
                valueType: 'string',
                readOnly: false
            },{
                name: 'repositoryUrlRelease',
                displayName: 'Repository URL for releases',
                description: 'The URL of the repository where the packaged components should be deployed.',
                value: 'http://c2w-cdi.isis.vanderbilt.edu:8088/repository/internal/',
                valueType: 'string',
                readOnly: false
            },{
                name: 'includedFederateTypes',
                displayName: 'include',
                description: 'The Types of federates included in this export',
                value: allFederateTypes,
                valueType: 'string',
                readOnly: true            
            /*},{
                name: 'urlBase',
                displayName: 'URL Base',
                description: 'The base address of webGME where the model is accessible',
                value: baseURLDefault,
                valueType: 'string',
                readOnly: false
            },{
                name: 'useGit',
                displayName: 'Check into Git',
                description: 'Check into GIT version control instead of download',
                value: false,
                valueType: 'boolean',
                readOnly: false
            },{
                name: 'gitURL',
                displayName: 'Repository URL',
                description: 'The address of GIT Repository where the artifacts are deposited',
                value: baseURLDefault,
                valueType: 'string',
                readOnly: false
            },{
                name: 'gitUser',
                displayName: 'GIT Username',
                description: 'The username for GIT Repository where the artifacts are deposited',
                value: usernameDefault,
                valueType: 'string',
                readOnly: false
            },{
                name: 'gitPass',
                displayName: 'GIT Password',
                description: 'The password for GIT Repository where the artifacts are deposited.<br> WARNING: The password may be submitted through a non ecncripted channel.',
                value: '',
                valueType: 'string',
                readOnly: false*/
            }
        ];
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
    FederatesExporter.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            numberOfFilesToGenerate,
            finishExport,
            generateFiles;

        self.fileGerenrators = [];

        self.fom_sheets = {};
        self.interactions = {};
        self.interactionRoots = [];
        self.objects      = {};
        self.objectRoots = [];
        self.attributes   = {};
        self.federates = {};

        self.fedFilterMap = {};
        self.fedFilterMap["MAPPER_FEDERATES"] = "MAPPER";
        self.fedFilterMap["NON-MAPPER_FEDERATES"] = "NON_MAPPER";
        self.fedFilterMap["BOTH"] = "ORIGIN_FILTER_DISABLED";
        self.fedFilterMap["SELF"] = "SELF";
        self.fedFilterMap["NON-SELF"] = "NON_SELF";

        self.projectName = self.core.getAttribute(self.rootNode, 'name');

        self.mainPom.artifactId = self.projectName + "_root";
        self.mainPom.version = "0.0.1" + (self.getCurrentConfig().isRelease ? "" : "-SNAPSHOT");
        self.mainPom.packaging = "pom";
        self.mainPom.groupId = self.getCurrentConfig().groupId.trim();
        self.mainPom.addRepository({
            'id': 'archiva.internal',
            'name': 'Internal Release Repository',
            'url': self.getCurrentConfig().repositoryUrlRelease.trim()
        });
        
        self.mainPom.addSnapshotRepository({
            'id': 'archiva.snapshots',
            'name': 'Internal Snapshot Repository',
            'url': self.getCurrentConfig().repositoryUrlSnapshot.trim()
        });

        self.getCurrentConfig().includedFederateTypes.trim().split(" ").forEach(function(e){
            if(self.federateTypes.hasOwnProperty(e)){
                self.federateTypes[e].includeInExport = true;
                if(self.federateTypes[e].hasOwnProperty('init')){
                   self.federateTypes[e].init.call(self); 
                }
            }
        });

        // Using the logger.
        //self.logger.debug('This is a debug message.');
        //self.logger.info('This is an info message.');
        //self.logger.warn('This is a warning message.');
        //self.logger.error('This is an error message.');

        //Add POM generator
        self.fileGerenrators.push(function(artifact, callback){
            artifact.addFile('pom.xml', self._jsonToXml.convertToString( self.mainPom.toJSON() ), function (err) {
                if (err) {
                    callback(err);
                    return;
                }else{
                    callback();
                }
            });
        });

        self.fomModel = {
            federationname: self.projectName,
            objects: [],
            interactions: []
        };

        //Add FED generator
        self.fileGerenrators.push(function(artifact, callback){
            
            var interactionTraverser = function(interaction){
                var intModel = {
                    interaction:interaction,
                    parameters:interaction.parameters,
                    children:[]
                };
                interaction.children.forEach(function(child){
                    intModel.children.push(interactionTraverser(child));
                });
                return ejs.render(TEMPLATES["fedfile_siminteraction.ejs"], intModel);
            }

            self.fomModel.interactions = interactionTraverser(self.interactionRoots[0]);

            var objectTraverser = function(object){
                var objModel = {
                    name:object.name,
                    attributes:object.attributes,
                    children:[]
                };
                object.children.forEach(function(child){
                    objModel.children.push(objectTraverser(child));
                });
                return ejs.render(TEMPLATES["fedfile_simobject.ejs"], objModel);
            }

            self.fomModel.objects = objectTraverser(self.objectRoots[0]);

            artifact.addFile(self.projectName + '.fed', ejs.render(TEMPLATES['fedfile.fed.ejs'], self.fomModel), function (err) {
                if (err) {
                    callback(err);
                    return;
                }else{
                    callback();
                }
            });
        });

        generateFiles = function(artifact, doneBack){
            if(numberOfFilesToGenerate > 0){ 
                self.fileGerenrators[self.fileGerenrators.length - numberOfFilesToGenerate](artifact, function(err){
                    if (err) {
                        callback(err, self.result);
                        return;
                    }
                    numberOfFilesToGenerate--;
                    if(numberOfFilesToGenerate > 0){

                        generateFiles(artifact, doneBack);
                    }else{
                        doneBack();
                     }
                });                
            }else{
                doneBack();
            }
        }

        finishExport = function(err){

            //var outFileName = self.projectName + '.json'
            var artifact = self.blobClient.createArtifact('generated_' +self.projectName.trim().replace(/\s+/g,'_') +'_Files');

            numberOfFilesToGenerate = self.fileGerenrators.length;
            if(numberOfFilesToGenerate > 0){
                generateFiles(artifact, function(err){
                    if (err) {
                        callback(err, self.result);
                        return;
                    }

                    self.blobClient.saveAllArtifacts(function (err, hashes) {
                        if (err) {
                            callback(err, self.result);
                            return;
                        }
                        // This will add a download hyperlink in the result-dialog.
                        self.result.addArtifact(hashes[0]);
                        
                        // This will save the changes. If you don't want to save;
                        // exclude self.save and call callback directly from this scope.
                        self.save('FederatesExporter updated model.', function (err) {
                            if (err) {
                                callback(err, self.result);
                                return;
                            }
                            self.result.setSuccess(true);
                            callback(null, self.result);
                        });
                    });
                })

            }else{
                self.result.setSuccess(true);
                callback(null, self.result);
            }
            
        }

        self.visitAllChildrenFromRootContainer(self.rootNode, function(err){
            if(err)
                self.logger.error(err);
            else
                finishExport(err);
        });

    };

    FederatesExporter.prototype.getChildSorterFunc = function(nodeType, self){
        var self = this,
            visitorName = 'generalChildSorter';

        var generalChildSorter = function(a, b) {

            //a is less than b by some ordering criterion : return -1;
            //if(self.isMetaTypeOf(a, self.META['Types'])){
            //    return -1;
            //}
            //a is greater than b by the ordering criterion: return 1;
            //if(self.isMetaTypeOf(b, self.META['Types'])){
            //    return 1;
            //}

            // a equal to b:
            return 0;
        };
        return generalChildSorter;
        
    }

    FederatesExporter.prototype.excludeFromVisit = function(node){
        var self = this,
            exclude = false;

        if(self.rootNode != node){    
            var nodeTypeName = self.core.getAttribute(self.getMetaType(node),'name');
            exclude = exclude 
            || self.isMetaTypeOf(node, self.META['Language [CASIM]'])
            || (self.federateTypes.hasOwnProperty(nodeTypeName) && !self.federateTypes[nodeTypeName].includeInExport);
        }
        if(exclude){
            self.logger.debug("node " + self.core.getAttribute(node, 'name') + "(" + self.core.getPath(node) + ") is excluded from the visit" );
        }
        
        return exclude;
    }

    FederatesExporter.prototype.getVisitorFuncName = function(nodeType){
        var self = this,
            visitorName = 'generalVisitor';
        if(nodeType){
            visitorName = 'visit_'+ nodeType;
            if(nodeType.endsWith('Federate')){
                visitorName = 'visit_'+ 'Federate';
            }
            
        }
        self.logger.debug('Genarated visitor Name: ' + visitorName);
        return visitorName;   
    }

    FederatesExporter.prototype.getPostVisitorFuncName = function(nodeType){
        var self = this,
            visitorName = 'generalPostVisitor';
        if(nodeType){
            visitorName = 'post_visit_'+ nodeType;
            if(nodeType.endsWith('Federate')){
                visitorName = 'post_visit_'+ 'Federate';
            }
        }
        self.logger.debug('Genarated post-visitor Name: ' + visitorName);
        return visitorName;
        
    }

    /*
    *
    * TRAVERSAL CODE - BEGIN
    *
    */

    FederatesExporter.prototype.ROOT_visitor = function(node){
        var self = this;
        self.logger.info('Visiting the ROOT');

        var root = {
            "@id": 'model:' + '/root',
            "@type": "gme:root",
            "model:name": self.projectName,
            "gme:children": []
        };

        return {context:{parent: root}};
    }

    FederatesExporter.prototype.visit_FOMSheet = function(node, parent, context){
        var self = this;

        self.fom_sheets[self.core.getPath(node)] = node;
        context['parent'] = {};
        context['pubsubs'] = [];
        return {context:context};
    }

    FederatesExporter.prototype.post_visit_FOMSheet = function(node, context){
        var self = this;
        for(var i = 0; i < context['pubsubs'].length; i++){
            var pubsub = context['pubsubs'][i];
            if(self.federates[pubsub.federate] && self.interactions[pubsub.interaction]){
                if(pubsub.handler){
                    pubsub.handler(self.federates[pubsub.federate], self.interactions[pubsub.interaction]);
                }
            }else if(self.federates[pubsub.federate] && self.objects[pubsub.object]){
                if(pubsub.handler){
                    pubsub.handler(self.federates[pubsub.federate], self.objects[pubsub.object]);
                }
            }
        }
        return {context:context};
    }
    
    FederatesExporter.prototype.visit_Interaction = function(node, parent, context){
        var self = this,
        nodeType = self.core.getAttribute( self.getMetaType( node ), 'name' ),
        nodeBaseName = self.core.getAttribute( node.base, 'name' ),
        nodeBasePath = self.core.getPointerPath(node, 'base'),
        nodeName = self.core.getAttribute( node, 'name' ),
        nodePath = self.core.getPath(node),
        interaction = {},
        nameFragments = [nodeName];

        self.logger.debug('Node ' + nodeName + " is based on " + nodeBaseName + " with meta " + nodeType);
       
        
        if(self.interactions[nodePath]){
            interaction = self.interactions[nodePath];
        }else{
              self.interactions[nodePath] = interaction;
        }

        interaction['name'] = self.core.getAttribute(node, 'name');
        interaction['id'] = nodePath;
        interaction['basePath'] = self.core.getPointerPath(node, 'base');
        interaction['basename'] = nodeBaseName;
        interaction['delivery'] = self.core.getAttribute(node, 'Delivery');
        interaction['order'] = self.core.getAttribute(node, 'Order');
        interaction['inputPlaceName'] = "";
        interaction['outputPlaceName'] = "";
        interaction['mapperPublished'] = false;
        interaction['parameters'] = [];
        interaction['children'] = interaction['children'] || [];
        interaction['isroot'] = node.base == self.META['Interaction'];

        var nextBase = node.base;
        while(nextBase != self.META['Interaction']){
            nameFragments.push(self.core.getAttribute(nextBase, 'name'));
            nextBase = nextBase.base;
        }

        interaction.fullName = nameFragments.reverse().join('.');

        if(self.interactions[nodeBasePath]){
            self.interactions[nodeBasePath]['children'].push(interaction);
        }else{
            if(!interaction['isroot']){
                self.interactions[nodeBasePath] = {
                    children:[interaction]
                };
            }else{
                self.interactionRoots.push(interaction);
            }
        }

        if(context.hasOwnProperty('interactions')){
            context['interactions'].push(interaction)
        }

        context['parentInteraction'] = interaction;

        return {context:context};
    }


    FederatesExporter.prototype.visit_Parameter = function(node, parent, context){
        var self = this;
        self.logger.debug('Visiting Parameter');
        if(context.hasOwnProperty('parentInteraction')){
            context['parentInteraction']['parameters'].push({
                name: self.core.getAttribute(node,'name'),
                parameterType: self.core.getAttribute(node,'ParameterType'),
                hidden: self.core.getAttribute(node,'Hidden') === 'true',
                position: self.core.getOwnRegistry(node, 'position'),
                inherited: self.core.getBase(node) != self.core.getMetaType(node)
            });
        }
        
        return {context:context};
    }


    FederatesExporter.prototype.visit_Object = function(node, parent, context){
        var self = this,
        object = {},
        nodeBasePath = self.core.getPointerPath(node, 'base'),
        nodeBaseName = self.core.getAttribute( node.base, 'name' ),
        nodeName = self.core.getAttribute( node, 'name' ),
        nameFragments = [nodeName];
        self.logger.debug('Visiting Object');

        if(self.objects[self.core.getPath(node)]){
            object = self.objects[self.core.getPath(node)];
        }else{
             self.objects[self.core.getPath(node)] = object;
        }

        object['name'] = self.core.getAttribute(node, 'name');
        object['id'] = self.core.getPath(node);
        object['delivery'] = self.core.getAttribute(node, 'Delivery');
        object['order'] = self.core.getAttribute(node, 'Order');
        object['attributes'] = [];
        object['parameters'] = object['attributes'];
        object['children'] = object['children'] || [];
        object['isroot'] = node.base == self.META['Object'];
        object['basename'] = nodeBaseName;

        if(self.objects[nodeBasePath]){
            self.objects[nodeBasePath]['children'].push(object);
        }else{
            if(!object['isroot']){
                self.objects[nodeBasePath] = {
                    children:[object]
                };
            }else{
                self.objectRoots.push(object);
            }
        }

        var nextBase = node.base;
        while(nextBase != self.META['Object']){
            nameFragments.push(self.core.getAttribute(nextBase, 'name'));
            nextBase = nextBase.base;
        }

        object.fullName = nameFragments.reverse().join('.');

        if(context.hasOwnProperty('objects')){
            context['objects'].push(object)
        }

        context['parentObject'] = object;

        return {context:context};
    }

    FederatesExporter.prototype.visit_Attribute = function(node, parent, context){
        var self = this;
        self.logger.debug('Visiting Attribute');
        if(context.hasOwnProperty('parentObject')){
            context['parentObject']['attributes'].push({
                name: self.core.getAttribute(node,'name'),
                parameterType: self.core.getAttribute(node,'ParameterType'),
                hidden: self.core.getAttribute(node,'Hidden') === 'true',
                position: self.core.getOwnRegistry(node, 'position'),
                inherited: self.core.getBase(node) != self.core.getMetaType(node)
            });
        }
        
        return {context:context};
    }

    FederatesExporter.prototype.visit_StaticInteractionPublish = function(node, parent, context){
        var self = this,
        publication = {
            interaction: self.core.getPointerPath(node,'dst'),
            federate: self.core.getPointerPath(node,'src')
        },
        nodeAttrNames = self.core.getAttributeNames(node);

        for ( var i = 0; i < nodeAttrNames.length; i += 1 ) {
            publication[nodeAttrNames[i]] = self.core.getAttribute( node, nodeAttrNames[i]);
        }   
        
        publication['handler'] = function(federate, interaction){
            var interactiondata = {
                name: interaction.name,
                publishedLoglevel: publication['LogLevel'],
            };

            if(federate['publishedinteractiondata']){
                federate['publishedinteractiondata'].push(interactiondata);
            }
        }

        if(context['pubsubs']){
            context['pubsubs'].push(publication);
        }
        return {context:context};
    }

    FederatesExporter.prototype.visit_StaticInteractionSubscribe = function(node, parent, context){
        var self = this,
        subscription = {
            interaction: self.core.getPointerPath(node,'src'),
            federate: self.core.getPointerPath(node,'dst')
        },
        nodeAttrNames = self.core.getAttributeNames(node);

        for ( var i = 0; i < nodeAttrNames.length; i += 1 ) {
            subscription[nodeAttrNames[i]] = self.core.getAttribute( node, nodeAttrNames[i]);
        }   
        
        subscription['handler'] = function(federate, interaction){
            var interactiondata = {
                name: interaction.name,
                subscribedLoglevel: subscription['LogLevel'],
                originFedFilter: self.fedFilterMap[subscription['OriginFedFilter']],
                srcFedFilter: self.fedFilterMap[subscription['SrcFedFilter']],
            };

            if(federate['subscribedinteractiondata']){
                federate['subscribedinteractiondata'].push(interactiondata);
            }
        }

        if(context['pubsubs']){
            context['pubsubs'].push(subscription);
        }
        return {context:context};
    }

    FederatesExporter.prototype.visit_StaticObjectPublish = function(node, parent, context){
        var self = this,
        publication = {
            object: self.core.getPointerPath(node,'dst'),
            federate: self.core.getPointerPath(node,'src')
        },
        nodeAttrNames = self.core.getAttributeNames(node);

        for ( var i = 0; i < nodeAttrNames.length; i += 1 ) {
            publication[nodeAttrNames[i]] = self.core.getAttribute( node, nodeAttrNames[i]);
        }   
        
        publication['handler'] = function(federate, object){
            var objectdata = {
                name: object.name
            };
            objectdata['publishedAttributeData']=[];
            objectdata['logPublishedAttributeData']=[];

            object['attributes'].forEach(function(a){
                objectdata['publishedAttributeData'].push(a);
                 if(publication['EnableLogging']){
                    objectdata['logPublishedAttributeData'].push(a);
                }
            });

            if(federate['publishedobjectdata']){
                federate['publishedobjectdata'].push(objectdata);
            }
        }

        if(context['pubsubs']){
            context['pubsubs'].push(publication);
        }
        return {context:context};
    }

    FederatesExporter.prototype.visit_StaticObjectSubscribe = function(node, parent, context){
        var self = this,
        subscription = {
            object: self.core.getPointerPath(node,'src'),
            federate: self.core.getPointerPath(node,'dst')
        },
        nodeAttrNames = self.core.getAttributeNames(node);

        for ( var i = 0; i < nodeAttrNames.length; i += 1 ) {
            subscription[nodeAttrNames[i]] = self.core.getAttribute( node, nodeAttrNames[i]);
        }   
        
        subscription['handler'] = function(federate, object){
            var objectdata = {
                name: object.name
            };
            objectdata['subscribedAttributeData']=[];
            objectdata['logSubscribedAttributeData']=[];

            object['attributes'].forEach(function(a){
                objectdata['subscribedAttributeData'].push(a);
                 if(subscription['EnableLogging']){
                    objectdata['logSubscribedAttributeData'].push(a);
                }
            });

            if(federate['subscribedobjectdata']){
                federate['subscribedobjectdata'].push(objectdata);
            }
        }

        if(context['pubsubs']){
            context['pubsubs'].push(subscription);
        }
        return {context:context};
    }

    /*
    *
    * TRAVERSAL CODE - END
    *
    */

    FederatesExporter.prototype.calculateParentPath = function(path){
        var pathElements = path.split('/');
        pathElements.pop();
        return pathElements.join('/');
    }

    return FederatesExporter;
});