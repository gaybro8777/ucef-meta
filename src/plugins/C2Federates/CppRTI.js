define([
    'ejs',
    'C2Core/MavenPOM',
	'C2Federates/Templates/Templates'
], function (
    ejs,
    MavenPOM,
	TEMPLATES
) {

    'use strict';

    var CppRTIFederateExporter  = function () {

        this.initCppRTI = function(){
            var self = this,
            coreNamespace = "c2w_hla",
            renderContext = {
                ejs:ejs,
                isinteraction: true,
                TEMPLATES:TEMPLATES,
                package: coreNamespace
            };

            if(self.cppRTIInitDone){
                return;
            }

            self.cppCorePackageOISpecs = {
                'C2WInteractionRoot': coreNamespace,
                'SimulationControl': coreNamespace,
                'SimEnd': coreNamespace,
                'SimPause': coreNamespace,
                'SimResume': coreNamespace,
                'SimLog': coreNamespace,
                'HighPrio': coreNamespace,
                'MediumPrio': coreNamespace,
                'LowPrio': coreNamespace,
                'VeryLowPrio': coreNamespace,
                'FederateObject': coreNamespace,
                'FederateResignInteraction':coreNamespace,
                'FederateJoinInteraction':coreNamespace
            };

            var renderToFile = function(outFilePath, isinteraction, model, artifact, callback){
                var context = self.createCppRTICodeModel();
                context.isinteraction = isinteraction;
                context.simname = self.cppCorePackageOISpecs.hasOwnProperty(model.name) ? self.cppCorePackageOISpecs[model.name] : self.projectName;
                context.classname = model.name;
                context.hlaclassname = model.fullName;
                context.parentclassname = model.isroot ? "" : model.basename;
                context.isc2winteractionroot = model.isroot && isinteraction;

                var datamemeberList = [];
                if(isinteraction){
                    datamemeberList = model['parameters'];
                }else{
                    datamemeberList = model['attributes'];
                }

                datamemeberList.forEach(function(param){
                    context.alldatamembers.push(param);
                    if(!param.inherited){
                        context.datamembers.push(param);
                    }

                });

                var fullPath = outFilePath + MavenPOM.mavenCppPath + '/' + model.name +'.cpp'
                self.logger.debug('Rendering template to file: ' + fullPath);
                artifact.addFile( fullPath, ejs.render(TEMPLATES['cpp/class.cpp.ejs'], context), function(err){
                    if (err) {
                        callback(err);
                        return;
                    }else{
                        fullPath = outFilePath + MavenPOM.mavenIncludePath + '/' + model.name +'.hpp'
                        self.logger.debug('Rendering template to file: ' + fullPath);
                        artifact.addFile(fullPath , ejs.render(TEMPLATES['cpp/class.hpp.ejs'], context), callback);
                    }
                });
            }

            //
            // FOUNDATION RTI - Begin
            // 
            
            var foundationDirBasePath = 'cpp/',
                coreDirSpec = {federation_name: "rti-base", artifact_name: "", language:""},
                coreDirPath = foundationDirBasePath + ejs.render(self.directoryNameTemplate, coreDirSpec),
                coreOutSrcFilePath = coreDirPath + MavenPOM.mavenCppPath,
                coreOutIncFilePath = coreDirPath + MavenPOM.mavenIncludePath;

            var porticoPOM = new MavenPOM();
            porticoPOM.artifactId = "portico-hla13-cpp";
            porticoPOM.groupId = "org.cpswt";
            porticoPOM.version = "1.0.0";
            porticoPOM.packaging = "nar";

            var C2WLoggingPOM = new MavenPOM();
            C2WLoggingPOM.artifactId = "C2WConsoleLogger";
            C2WLoggingPOM.groupId = "org.cpswt";
            C2WLoggingPOM.version = self.cpswt_version;
            C2WLoggingPOM.packaging = "nar";

            self.cpp_corePOM = new MavenPOM();
            self.cpp_corePOM.groupId = "org.cpswt";
            self.cpp_corePOM.artifactId = "rti-base-cpp";
            self.cpp_corePOM.version = self.cpswt_version;
            self.cpp_corePOM.packaging = "nar";
            self.cpp_corePOM.dependencies.push(porticoPOM);
            self.cpp_corePOM.dependencies.push(C2WLoggingPOM);

            if(self.generateExportPackages){
                //Add core POM generator
                self.corefileGenerators.push(function(artifact, callback){
                    artifact.addFile(coreDirPath + '/pom.xml', self._jsonToXml.convertToString( self.cpp_corePOM.toJSON() ), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            callback();
                        }
                    });
                });

                self.corefileGenerators.push(function(artifact, callback){
                    var fullPath = coreOutSrcFilePath + '/InteractionRoot.cpp';
                    renderContext['isinteraction'] = true;
                    self.logger.debug('Rendering template to file: ' + fullPath);
                    artifact.addFile(fullPath, ejs.render(TEMPLATES['cpp/classroot.cpp.ejs'], renderContext), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            fullPath = coreOutIncFilePath + '/InteractionRoot.hpp';
                            self.logger.debug('Rendering template to file: ' + fullPath);
                            artifact.addFile(fullPath, ejs.render(TEMPLATES['cpp/classroot.hpp.ejs'], renderContext), function (err) {
                                if (err) {
                                    callback(err);
                                    return;
                                }else{
                                    callback();
                                    return;
                                }
                            });
                        }
                    });
                });
                
                
                self.corefileGenerators.push(function(artifact, callback){
                    var fullPath = coreOutSrcFilePath + '/ObjectRoot.cpp';
                    renderContext['isinteraction'] = false;
                    artifact.addFile(fullPath, ejs.render(TEMPLATES['cpp/classroot.cpp.ejs'], renderContext), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            fullPath = coreOutIncFilePath + '/ObjectRoot.hpp';
                            artifact.addFile(fullPath, ejs.render(TEMPLATES['cpp/classroot.hpp.ejs'], renderContext), function (err) {
                                if (err) {
                                    callback(err);
                                    return;
                                }else{
                                    callback();
                                    return;
                                }
                            });
                        }
                    });
                });
                self.corefileGenerators.push(function(artifact, callback){
                    var objToRender = [],
                    renderNextObject = function(err){
                        if(err){
                            callback(err);
                        }else{
                            var nextObj = objToRender.pop();
                            if(nextObj){
                                renderToFile(coreDirPath, false, nextObj, artifact, renderNextObject);                                    
                            }else{
                                callback();
                                return;
                            }
                        }
                    };

                    for(var oid in self.objects){
                        if(self.objects[oid].name != "ObjectRoot" && self.cppCorePackageOISpecs.hasOwnProperty(self.objects[oid].name)){
                            objToRender.push(self.objects[oid]);
                        }
                    }
                    renderNextObject();
                });

                self.corefileGenerators.push(function(artifact, callback){
                    var intToRender = [],
                    renderNextInteraction = function(err){
                        if(err){
                            callback(err);
                        }else{
                            var nextInteraction = intToRender.pop();
                            if(nextInteraction){
                                renderToFile(coreDirPath, true, nextInteraction, artifact, renderNextInteraction);                                    
                            }else{
                                callback();
                                return;
                            }
                        }
                    };

                    for(var iid in self.interactions){
                        if(self.interactions[iid].name != "InteractionRoot" && self.cppCorePackageOISpecs.hasOwnProperty(self.interactions[iid].name) ){
                            intToRender.push(self.interactions[iid]);
                        }
                    }
                    renderNextInteraction();
                });
            }
            //
            // FOUNDATION RTI - End
            // 

            //
            // SIM RTI - Begin
            // 

            var simDirBasePath = 'cpp-federates/',
                simDirSpec = {federation_name: self.projectName, artifact_name: "rti", language:"cpp"},
                simDirPath =  simDirBasePath + ejs.render(self.directoryNameTemplate, simDirSpec);  

            self.cpp_rtiPOM = new MavenPOM(); //Parent to be set serialization time.
            self.cpp_rtiPOM.artifactId = ejs.render(self.directoryNameTemplate, simDirSpec)
            self.cpp_rtiPOM.version = self.cpswt_version;
            self.cpp_rtiPOM.packaging = "nar";
            self.cpp_rtiPOM.dependencies.push(self.cpp_corePOM);

            //Add sim POM generator
            self.fileGenerators.push(function(artifact, callback){
                if(!self.cppPOM){
                    callback();
                    return;
                }

                //Set the parent now that it exists
                self.cpp_rtiPOM.setParentPom(self.cppPOM);
               
                artifact.addFile(simDirPath + '/pom.xml', self._jsonToXml.convertToString( self.cpp_rtiPOM.toJSON() ), function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }else{
                        callback();
                    }
                });
            });

            self.fileGenerators.push(function(artifact, callback){
                if(!self.cppPOM){
                    callback();
                    return;
                }
                var objToRender = [],
                renderNextObject = function(err){
                    if(err){
                        callback(err);
                    }else{
                        var nextObj = objToRender.pop();
                        if(nextObj){
                            renderToFile(simDirPath, false, nextObj, artifact, renderNextObject);                                    
                        }else{
                            callback();
                            return;
                        }
                    }
                };

                for(var oid in self.objects){
                    if(self.objects[oid].name != "ObjectRoot" && !self.cppCorePackageOISpecs.hasOwnProperty(self.objects[oid].name) ){
                        objToRender.push(self.objects[oid]);
                    }
                }

                renderNextObject();
            });

            self.fileGenerators.push(function(artifact, callback){
                if(!self.cppPOM){
                    callback();
                    return;
                }
                var intToRender = [],
                renderNextInteraction = function(err){
                    if(err){
                        callback(err);
                    }else{
                        var nextInteraction = intToRender.pop();
                        if(nextInteraction){
                            renderToFile(simDirPath, true, nextInteraction, artifact, renderNextInteraction);                                    
                        }else{
                            callback();
                            return;
                        }
                    }
                };

                for(var iid in self.interactions){
                    if(self.interactions[iid].name != "InteractionRoot" && !self.cppCorePackageOISpecs.hasOwnProperty(self.interactions[iid].name) ){
                        intToRender.push(self.interactions[iid]);
                    }
                }
                renderNextInteraction();
            });

            //
            // SIM RTI - End
            // 

            self.cppRTIInitDone = true;
        }

        this.createCppRTICodeModel = function(){
            return {
                simname: "",
                classname: "",
                parentclassname: "",
                hlaclassname: "",
                isinteraction: false,
                isc2winteractionroot: false,
                datamembers: [],
                alldatamembers: [],
                
                helpers:{
                    cppjavaTypeMap: function(type){
                        var typeMap = {
                            "String"  : "std::string",
                            "int"     : "int",
                            "long"    : "long",
                            "short"   : "short",
                            "byte"    : "char",
                            "char"    : "char",
                            "double"  : "double",
                            "float"   : "float",
                            "boolean" : "bool",};
                        return typeMap[type] || "";
                    },
                    cppjavaArgumentTypeMap: function(type, name){
                        var typeMap = {
                            "String"  : "const std::string &",
                            "int"     : "int",
                            "long"    : "long",
                            "short"   : "short",
                            "byte"    : "char",
                            "char"    : "char",
                            "double"  : "double",
                            "float"   : "float",
                            "boolean" : "bool"
                        }
                        return typeMap[type] || "";
                    }
                },
                ejs:ejs, 
                TEMPLATES:TEMPLATES
            };
        }
    }

    return CppRTIFederateExporter;
});
