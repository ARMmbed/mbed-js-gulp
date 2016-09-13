'use strict';

module.exports = function(gulp) {
    const run = require('gulp-run');
    const util = require('gulp-util');
    const print = require('gulp-print');
    const filter = require('gulp-filter');
    const uglify = require('gulp-uglify');
    const rename = require('gulp-rename');
    const template = require('gulp-template');

    const browserify = require('browserify');
    const promisify = require('promisify-node');

    const buffer = require('vinyl-buffer');
    const source = require('vinyl-source-stream');

    const npm = require('npm');

    const fs = require('fs');
    const del = require('del');
    const exec = require('child-process-promise').exec;

    const node_package = JSON.parse(fs.readFileSync('./package.json'));

    gulp.task('bundle', function() {
        const b = browserify({
            entries: node_package.main,
            noParse: [
                require.resolve('bleno'), // this is needed to stop it from trying to parse a binary file
            ]
        });

        return b.bundle()
                .pipe(source(node_package.name + '.bundle.js'))
                .pipe(buffer())

                // output bundled js
                .pipe(gulp.dest('./build/js/'))

                // produce minified js
                .pipe(uglify())
                .pipe(rename(node_package.name + '.bundle.min.js'))
                .pipe(gulp.dest('./build/js/'));
    });

    function cpp_name_sanitise(name) {
        let out_name = name.replace(new RegExp('-', 'g'), '_')
                           .replace(new RegExp('\\\\', 'g'), '_')
                           .replace(new RegExp('\\?', 'g'), '_')
                           .replace(new RegExp('\'', 'g'), '_')
                           .replace(new RegExp('"', 'g'), '_');

        if ("0123456789".indexOf(out_name[0]) != -1) {
            out_name = '_' + out_name;
        }

        return out_name;
    }

    function cpp_string_sanitise(string) {
        let out_str = string.replace(new RegExp('\\\\', 'g'), '\\\\')
                            .replace(new RegExp("\n", 'g'), "\\n")
                            .replace(new RegExp("\"", 'g'), '\\"');

        return out_str;
    }

    gulp.task('cppify', ['bundle', 'pins.js'], function() {
        let out_js = {
            name: cpp_name_sanitise(node_package.name),
            path: "./build/js/" + node_package.name + ".bundle.min.js"
        };

        const source = fs.readFileSync(out_js.path, {
            'encoding': 'utf-8'
        });

        out_js.source_length = source.length;
        out_js.source = cpp_string_sanitise(source);

        return parse_pins('./build/js/pins.js')
                .then(function(pins) {
                    return gulp.src(__dirname + '/tmpl/js_source.cpp.tmpl')
                                .pipe(rename(node_package.name + '_js_source.cpp'))
                                .pipe(template({
                                    js_files: [out_js],
                                    magic_strings: pins
                                }))
                                .pipe(gulp.dest('./build/source/'));
                });
    });

    gulp.task('ignorefile', function() {
        return gulp.src(__dirname + '/tmpl/mbedignore.tmpl')
                   .pipe(rename('.mbedignore'))
                   .pipe(gulp.dest('./build/'));
    });

    gulp.task('makefile', function() {
        return gulp.src(__dirname + '/tmpl/Makefile.tmpl')
                   .pipe(rename('Makefile'))
                   .pipe(gulp.dest('./build/'));
    });

    // avoid deleting jerryscript et. al, since it makes subsequent builds really slow
    gulp.task('clean', function() {
        return del(['build/out']);
    });

    // delete all the things
    gulp.task('deepclean', function() {
        return del(['build']);
    });

    gulp.task('get-jerryscript', ['makefile'], function() {
        return run('if [ ! -d "./jerryscript/" ]; then git clone https://github.com/ARMmbed/jerryscript; fi;', { cwd: './build' }).exec();
    });

    gulp.task('pins.js', ['get-jerryscript'], function() {
        const variant = util.env_target == 'K64F' ? 'FRDM' : '';

        // windows has a special version of find. in case the user has MINGW installed,
        // we should check for the existance of find

        return new Promise(function(resolve, reject) {
            exec("find --version", function(err) {
                if (err && err.code == 2) {
                    // Windows
                    var cmd = 'dir /s /b pins.js';
                } else {
                    // unix/cygwin
                    console.log('find :)');
                    var cmd = 'find ./build/jerryscript/targets/mbedos5/js/pin_defs/ -iname pins.js';
                }

                resolve(promisify(exec)(cmd)
                    .then(function(result) {
                        const files = result.stdout.split('\n').filter(function(line) {
                            return (line.indexOf('TARGET_' + util.env.target) != -1)
                                || (line.indexOf('TARGET_MCU_' + util.env.target) != -1
                                    && line.indexOf('TARGET_' + variant) != -1)
                        });

                        const source = files[0];
                        return new Promise(function(resolve, reject) {
                            gulp.src(source)
                                .pipe(rename('pins.js'))
                                .pipe(gulp.dest('./build/js/'))
                                .on('end', resolve);
                        });
                    }));
            });
        });
    });

    function dependencies(obj) {
        console.log(obj.dependencies)
        return obj.dependencies.map(Object.keys) + obj.dependencies.map(dependencies);
    }

    function list_libs() {
        return new Promise(function(resolve, reject) {
            npm.load({ production: true, depth: 0, progress: false }, function(err, npm) {
                var native_packages = [];
                npm.commands.ls([], true, function dependencies(err, data, lite) {
                    function recurse_dependencies(list) {
                        if (!list) {
                            return;
                        }

                        let keys = Object.keys(list);

                        for (let i = 0; i < keys.length; i++) {
                            if (list[keys[i]] && !list[keys[i]].missing) {
                                // check for mbedjs.json
                                var path = list[keys[i]].path + '/mbedjs.json';

                                try {
                                    fs.statSync(path);
                                } catch (e) {
                                    recurse_dependencies(list[keys[i]].dependencies);
                                    continue;
                                }

                                list[keys[i]].path = list[keys[i]].path.replace(new RegExp(/\\/, 'g'), "/");

                                var json_data = JSON.parse(fs.readFileSync(path));

                                native_packages.push({
                                    name: list[keys[i]].name,
                                    abs_source: json_data.source.map(function(dir) {
                                        return list[keys[i]].path.replace("\\", "/") + '/' + dir
                                    }),
                                    config: json_data
                                });
                                recurse_dependencies(list[keys[i]].dependencies);
                            }
                        }
                    }

                    recurse_dependencies(data.dependencies);

                    resolve(native_packages);
                });
            });
        });
    }

    function parse_pins(path) {
        return promisify(fs.readFile)(path, { encoding: 'utf-8' }).then(function(pin_data) {
            return pin_data.split('\n')
                    .filter(function(line) {
                        let bits = line.split(' ');
                        return bits.length == 4;
                    })
                    .map(function(line) {
                        let bits = line.split(' ');

                        return {
                            name: bits[1],
                            value: bits[3].slice(0, -1)
                        };
                    });
        });
    }

    gulp.task('build', ['cppify', 'ignorefile', 'makefile'], function() {
        return list_libs()
                .then(function(libs) {
                    var native_list = libs.map(function(p) { return util.colors.cyan(p.name) });

                    if (native_list.length > 0) {
                        util.log("Found native packages: " + native_list.join(", "));
                    } else {
                        util.log("Found no native packages.");
                    }

                    var gulp_stream = gulp.src(__dirname + '/tmpl/main.cpp.tmpl')
                                        .pipe(rename('main.cpp'))
                                        .pipe(template({
                                            libraries: libs
                                        }))
                                        .pipe(gulp.dest('./build/source/'));

                    return new Promise(function(resolve, reject) {
                        gulp_stream.on('end', function() {
                            // include the native_extras library if it exists
                            fs.stat("./native_extras", function(err) {
                                var lib_dirs = libs.map(function(lib) { return lib.abs_source.join(';'); });

                                if (!err) {
                                    lib_dirs.push("../../../../native_extras/");
                                }

                                var lib_source_files = lib_dirs.join(';');

                                resolve(run('make BOARD=' + util.env.target + ' EXTRAS=' + lib_source_files, { cwd: './build', verbosity: 3 }).exec()
                                .pipe(print())
                                .pipe(rename('build.log'))
                                .pipe(gulp.dest('./build')));
                            });
                        });
                    });
                })
    });

    gulp.task('default', ['build']);
};
