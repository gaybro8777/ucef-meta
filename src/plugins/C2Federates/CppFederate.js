define([
    'ejs',
    'C2Core/MavenPOM',
	'C2Federates/Templates/Templates',
    'C2Federates/CppRTI',
    'C2Federates/CppImplFederate'
], function (
    ejs,
    MavenPOM,
	TEMPLATES,
    CppRTI,
    CppImplFederate
) {

    'use strict';

    var CppFederateExporter  = function () {
    	var self = this,
            baseDirSpec,
            baseOutFilePath;
        CppRTI.call(this);
        CppImplFederate.call(this);

        this.federateTypes = this.federateTypes || {};
    	this.federateTypes['CppFederate'] = {
    		includeInExport: false,
    		longName: 'CppFederate',
            init: function(){
                self.initCppRTI();
                self.initCppImplFederate();

                var baseDirBasePath = self.projectName + '-cpp-federates/';
                baseDirSpec = {federation_name: self.projectName, artifact_name: "base", language:"cpp"};
                var baseDirPath =  baseDirBasePath + ejs.render(self.directoryNameTemplate, baseDirSpec);
                baseOutFilePath = baseDirPath;

                if(!self.cpp_federateBasePOM){
                    self.cpp_federateBasePOM = new MavenPOM();
                    self.cpp_federateBasePOM.groupId = 'org.cpswt'
                    self.cpp_federateBasePOM.artifactId = 'SynchronizedFederate';
                    self.cpp_federateBasePOM.version = self.cpswt_version;   
                    self.cpp_federateBasePOM.packaging = "nar";
                }

                
                //Add sim POM generator
                self.fileGenerators.push(function(artifact, callback){
                    if(!self.cppPOM){
                        callback();
                        return;
                    }
                    artifact.addFile( self.cppPOM.directory + '/pom.xml', ejs.render(TEMPLATES['cpp/cppfedbase_pom.xml.ejs'], self.cppPOM), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            callback();
                            return;
                        }
                    });
                });

                //Add base POM generator
                self.fileGenerators.push(function(artifact, callback){
                    if(!self.cpp_basePOM){
                        callback();
                        return;
                    }

                    artifact.addFile(baseDirPath + '/pom.xml', self._jsonToXml.convertToString( self.cpp_basePOM.toJSON() ), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            callback();
                            return;
                        }
                    });
                });

                self.fileGenerators.push(function(artifact, callback){
                    if(!self.cppPOM){
                        callback();
                        return;
                    }
                    var renderContext = {
                        simname: self.projectName,
                        version: self.project_version
                    },
                    outFileName = baseOutFilePath + MavenPOM.mavenCppPath + "/" + "federate_version.cpp";
                    self.logger.debug('Rendering template to file: ' + outFileName);
                    artifact.addFile(outFileName, ejs.render(TEMPLATES['cpp/federate_ver.cpp.ejs'], renderContext), function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }else{
                            callback();
                            return;
                        }
                    });
                });


            }
    	};

    	this.visit_CppFederate = function(node, parent, context){
            var self = this,
                nodeType = self.core.getAttribute( self.getMetaType( node ), 'name' );

            self.logger.info('Visiting a CppFederate');

            //Setup project POM files on visiting the first CPP Federate
            if(!self.cppPOM){
                self.cppPOM = new MavenPOM(self.mainPom);
                self.cppPOM.artifactId = self.projectName + "-cpp";
                self.cppPOM.directory = self.projectName + "-cpp-federates";
                self.cppPOM.version = self.project_version;
                self.cppPOM.packaging = "pom";
                self.cppPOM.name = self.projectName + ' C++ root'
            }
            if(!self.cpp_basePOM){
                self.cpp_basePOM = new MavenPOM(self.cppPOM);
                self.cpp_basePOM.artifactId = ejs.render(self.directoryNameTemplate, baseDirSpec);
                self.cpp_basePOM.version = self.project_version;
                self.cpp_basePOM.packaging = "nar";
                self.cpp_basePOM.dependencies.push(self.cpp_rtiPOM);
                self.cpp_basePOM.dependencies.push(self.cpp_federateBasePOM);
            }

            context['cppfedspec'] = self.createCppFederateCodeModel();
            context['cppfedspec']['classname'] = self.core.getAttribute(node, 'name');
            context['cppfedspec']['simname'] = self.projectName;
            context['cppfedspec']['timeconstrained'] = self.core.getAttribute(node, 'TimeConstrained');
            context['cppfedspec']['timeregulating'] = self.core.getAttribute(node, 'TimeRegulating');
            context['cppfedspec']['lookahead'] = self.core.getAttribute(node, 'Lookahead');
            context['cppfedspec']['asynchronousdelivery'] = self.core.getAttribute(node, 'EnableROAsynchronousDelivery');

            self.visit_CppImplFederate(node, parent, context);
            self.federates[self.core.getPath(node)] = context['cppfedspec'];

            return {context:context};
        };

        this.post_visit_CppFederate = function(node, context){
            var self = this,
                renderContext = context['cppfedspec'],
                outFileName = baseOutFilePath + MavenPOM.mavenIncludePath + "/" + self.core.getAttribute(node, 'name') + "Base.hpp";
            
            self.fileGenerators.push(function(artifact, callback){
                renderContext['allobjectdata'] = renderContext['publishedobjectdata'].concat(renderContext['subscribedobjectdata']);
                renderContext['allinteractiondata'] = renderContext['publishedinteractiondata'].concat(renderContext['subscribedinteractiondata'])

                self.logger.debug('Rendering template to file: ' + outFileName);
                artifact.addFile(outFileName, ejs.render(TEMPLATES['cpp/federate.hpp.ejs'], renderContext), function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }else{
                        callback();
                        return;
                    }
                });
            });

            return self.post_visit_CppImplFederate(node, context);
        };

        this.createCppFederateCodeModel = function(){
            return {
                simname: "",
                melderpackagename: null,
                classname: "",
                isnonmapperfed: true,
                timeconstrained: false,
                timeregulating: false,
                lookahead: null,
                asynchronousdelivery: false,
                publishedinteractiondata: [],
                subscribedinteractiondata: [],
                allinteractiondata: [],
                publishedobjectdata: [],
                subscribedobjectdata: [],
                allobjectdata: [],
                helpers:{},
                ejs:ejs, 
                TEMPLATES:TEMPLATES
            };
        }
        this.cppCodeModel = this.createCppFederateCodeModel();

    }

    return CppFederateExporter;
});
