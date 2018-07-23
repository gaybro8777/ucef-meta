/*globals define, WebGMEGlobal*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Tue Mar 20 2018 21:36:06 GMT+0000 (UTC).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'q',
    'superagent'

], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    Q,
    superagent) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of UploadDeploymentArtifacts.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin UploadDeploymentArtifacts.
     * @constructor
     */
    var UploadDeploymentArtifacts = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    UploadDeploymentArtifacts.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    UploadDeploymentArtifacts.prototype = Object.create(PluginBase.prototype);
    UploadDeploymentArtifacts.prototype.constructor = UploadDeploymentArtifacts;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    UploadDeploymentArtifacts.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            nodeObject;


        self.userDir = ""
        self.projectDir = self.project.projectName
        self.projectPath = ""
        self.runDir = ""  

       // self.workingDir = "/home/ubuntu/blobdir"
        self.workingDir="/home/ubuntu/file-server"

        // Using the coreAPI to make changes.

        nodeObject = self.activeNode;
        // Obtain the current user configuration.
        var currentConfig = self.getCurrentConfig();
        // What did the user select for our configuration?

        self.deploymentFiles = currentConfig.deploymentFiles;
        self.logger.info('Current configuration ' + JSON.stringify(currentConfig, null, 4));


        if (typeof WebGMEGlobal !== 'undefined') {
            console.log("testing")
	        
            self.workingDir=WebGMEGlobal.componentSettings[ 'folder' ];
            console.log("self.workingDir::",self.workingDir)
        }


        return self.getUserDir()
        .then(function (componentID) {
                // self.federationModel = federationModel;
            console.log("componentID:",componentID)
            self.workingDir = componentID
            return self.getUserIdAsync()
            // return self.createDir(userInfo)
        })
        .then(function (userInfo) {
                // self.federationModel = federationModel;
            console.log("userInfo")
            return self.createDir(userInfo)
        })
            .then(function () {
                console.log("deployment_files")
                return self.blobClient.getMetadata(self.deploymentFiles)
            })
            .then(function (metaData) {
                console.log("metadata.name", metaData.name)
                console.log(metaData)
                if(metaData.mime=="application/zip"){
                    self.deploymentFilesName = metaData.name;
                    return self.blobClient.getObject(self.deploymentFiles);
                }else{
                     throw "File Type Not Supported! Supports Only ZIP archives currently";                
                    }
                
                
            })
            .then(function (objbuffer) {
                return self.writeInputs(objbuffer);
            })
            .then(function () {
                console.log("Success")
                self.result.success = true;
                self.notify('info', 'Upload Complete.');
                callback(null, self.result);
            })
            .catch(function (err) {
                self.notify('error', err);
                self.result.success = false;
                callback(err, self.result);
            });
    };


    UploadDeploymentArtifacts.prototype.notify = function(level, msg) {
	var self = this;
	var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
	var max_msg_len = 100;
	if (level=='error')
	    self.logger.error(msg);
	else if (level=='debug')
	    self.logger.debug(msg);
	else if (level=='info')
	    self.logger.info(msg);
	else if (level=='warning')
	    self.logger.warn(msg);
	self.createMessage(self.activeNode, msg, level);
	if (msg.length < max_msg_len)
	    self.sendNotification(prefix+msg);
	else {
	    var splitMsgs = utils.chunkString(msg, max_msg_len);
	    splitMsgs.map(function(splitMsg) {
		self.sendNotification(prefix+splitMsg);
	    });
	}
    };


  UploadDeploymentArtifacts.prototype.getUserDir = function () {
        var self = this;
        
        var deferred,
            req;

        // if (typeof this.project.userName === 'string') {
        //     // Running from bin script
        //     return Q(this.project.userName)//.nodeify(callback);
        // }

        // if (this.gmeConfig.authentication.enable === false) {
        //     return Q(this.gmeConfig.authentication.guestAccount)//.nodeify(callback);
        // }

        deferred = Q.defer();
        req = superagent.get(this.blobClient.origin + '/api/componentSettings/UserDir');
        console.log(this.blobClient.origin);

        if (typeof this.blobClient.webgmeToken === 'string') {
            // We're running on the server set the token.
            req.set('Authorization', 'Bearer ' + this.blobClient.webgmeToken);
        } else {
            // We're running inside the browser cookie will be used at the request..
        }

        req.end(function (err, res) {
            if (err) {
                console.log("error")
                deferred.reject(err);
            } else {
                console.log("response:",res.body.folder)
                deferred.resolve(res.body.folder);
            }
        });

        return deferred.promise//.nodeify(callback);
    };


    UploadDeploymentArtifacts.prototype.getUserIdAsync = function () {
        var self = this;
        
        var deferred,
            req;

        if (typeof this.project.userName === 'string') {
            // Running from bin script
            return Q(this.project.userName)//.nodeify(callback);
        }

        if (this.gmeConfig.authentication.enable === false) {
            return Q(this.gmeConfig.authentication.guestAccount)//.nodeify(callback);
        }

        deferred = Q.defer();
        req = superagent.get(this.blobClient.origin + '/api/user');
        console.log(this.blobClient.origin);

        if (typeof this.blobClient.webgmeToken === 'string') {
            // We're running on the server set the token.
            req.set('Authorization', 'Bearer ' + this.blobClient.webgmeToken);
        } else {
            // We're running inside the browser cookie will be used at the request..
        }

        req.end(function (err, res) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(res.body._id);
            }
        });

        return deferred.promise//.nodeify(callback);
    };


    UploadDeploymentArtifacts.prototype.writeInputs = function (objBuffer) {
        var self = this;
                    var unzip = require('unzip'),
            stream = require('stream'),
            fstream = require('fstream'),
            path = require('path');
        console.log("objBuffer:", objBuffer)
        console.log("runDir:", self.runDir)
        console.log("runDir:", self.runDir)
        const zlib = require('zlib');

        self.zipBuffer = new Buffer(objBuffer);
        
        self.filepath = path.join(self.runDir, "test")

        var writeStream = fstream.Writer(self.runDir);
		var deferred = Q.defer();
		writeStream.on('unpipe', () => {
		    deferred.resolve();
		});
		var bufferStream = new stream.PassThrough();
		bufferStream.end(self.zipBuffer);
		bufferStream
		    .pipe(unzip.Parse())
		    .pipe(writeStream);
		return deferred.promise;
        // return deferred.promise;
    }

    UploadDeploymentArtifacts.prototype.createDir = function (userInfo) {
        // Copy the user input files (pom + xml + fed) into docker shared folder
        var self = this;
        
        var fs = require('fs'),
            // path = require('path'),
            unzip = require('unzip'),
            stream = require('stream'),
            fstream = require('fstream'),
            path = require('path');

        console.log("userInfo:", userInfo)
        // console.log(self.workingDir,hashes[0])
        self.userDir = path.normalize(path.join(self.workingDir, userInfo))
        self.projectDir = self.project.projectName
        self.projectPath = path.join(self.userDir, self.projectDir)

        // var tmppath =path.join( self.workingDir, hashes[0]) 
        self.runDir = path.normalize(self.projectPath);
        console.log(self.runDir)
        // console.log(runDir)
        if (!fs.existsSync(self.userDir)) {
            self.logger.info('Directory"' + self.userDir + '"does not exist');
            fs.mkdirSync(self.userDir);
            self.logger.info('Created directory for "' + self.userDir + '".');
        }

        if (!fs.existsSync(self.runDir)) {
            self.logger.info('Directory"' + self.runDir + '"does not exist');
            fs.mkdirSync(self.runDir);
            self.logger.info('Created directory for "' + self.runDir + '".');
        }
        console.log("returning")
        return;
    };


    return UploadDeploymentArtifacts;
});