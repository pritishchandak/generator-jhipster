'use strict';
var util = require('util'),
    shelljs = require('shelljs'),
    generator = require('yeoman-generator'),
    chalk = require('chalk'),
    jhiCore = require('jhipster-core'),
    scriptBase = require('../generator-base');

var JDLGenerator = generator.extend({});

util.inherits(JDLGenerator, scriptBase);

module.exports = JDLGenerator.extend({
    constructor: function () {
        generator.apply(this, arguments);
        this.argument('jdlFiles', {type: Array, required: true});

    },

    initializing: {
        validate: function () {
            this.jdlFiles && this.jdlFiles.forEach(function (key) {
                if (!shelljs.test('-f', key)) {
                    this.env.error(chalk.red(`\nCould not find ${ key }, make sure the path is correct!\n`));
                }
            }, this);
        },

        getConfig: function () {
            this.baseName = this.config.get('baseName');
            this.prodDatabaseType = this.config.get('prodDatabaseType');
            this.skipClient = this.config.get('skipClient');
            this.clientFramework = this.config.get('clientFramework');
            if (!this.clientFramework) {
                this.clientFramework = 'angular1';
            }
            this.clientPackageManager = this.config.get('clientPackageManager');
            if (!this.clientPackageManager) {
                if (this.yarnInstall) {
                    this.clientPackageManager = 'yarn';
                } else {
                    this.clientPackageManager = 'npm';
                }
            }
        }
    },

    default: {
        insight: function () {
            var insight = this.insight();
            insight.trackWithEvent('generator', 'import-jdl');
        },

        parseJDL: function () {
            this.log('The jdl is being parsed.');
            try {
                var jdlObject = jhiCore.convertToJDL(jhiCore.parseFromFiles(this.jdlFiles), this.prodDatabaseType);
                var entities = jhiCore.convertToJHipsterJSON({
                    jdlObject: jdlObject,
                    databaseType: this.prodDatabaseType
                });
                this.log('Writing entity JSON files.');
                jhiCore.exportToJSON(entities, this.options['force']);
            } catch (e) {
                this.log(e);
                this.error('\nError while parsing entities from JDL\n');
            }


        },

        generateEntities: function () {
            this.log('Generating entities.');
            try {
                this.getExistingEntities().forEach(function (entity) {
                    this.composeWith(require.resolve('../entity'), {
                        regenerate: true,
                        'skip-install': true,
                        name: entity.name
                    });
                }, this);
            } catch (e) {
                this.error(`Error while generating entities from parsed JDL\n${ e }`);
            }

        }
    },

    install: function () {
        var injectJsFilesToIndex = function () {
            this.log('\n' + chalk.bold.green('Running gulp Inject to add javascript to index\n'));
            this.spawnCommand('gulp', ['inject:app']);
        };
        if (!this.options['skip-install'] && !this.skipClient && this.clientFramework === 'angular1') {
            injectJsFilesToIndex.call(this);
        }

        // rebuild client for Angular
        var rebuildClient = function () {
            this.log('\n' + chalk.bold.green('Running `webpack:build:dev` to update client app\n'));
            this.spawnCommand(this.clientPackageManager, ['run', 'webpack:build:dev']);
        };
        if (!this.options['skip-install'] && !this.skipClient && this.clientFramework === 'angular2') {
            rebuildClient.call(this);
        }
    }

});
