var gulp = require('gulp');
var htmlhint = require('gulp-htmlhint');
var htmlmin = require('gulp-htmlmin');
var svgmin = require('gulp-svgmin');
var templatecache = require('gulp-angular-templatecache');
var watch = require('gulp-watch');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var inject = require('gulp-inject');

var karma = require('karma');

var rollup = require('rollup');
var babel = require('rollup-plugin-babel');
var typescript = require('rollup-plugin-typescript');
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');
var uglify = require('rollup-plugin-uglify');

var _ = require('lodash');

var config = require('./config.json');

var localConfig = {};
try {
  localConfig = JSON.parse(fs.readFileSync('config.local.json') || '');
}
catch (e) {}
localConfig = _.defaults(localConfig, {
  uglify: true
})

// set to true when the default task is running and we're watching
// for file changes. This is used to prevent errors from failing the
// build and exiting the process.
var watching = process.argv.length === 2 || process.argv[2] === 'default';

// Config for htmlmin when processing templates
var htmlMinOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true
}

// Compiles and bundles TypeScript to JavaScript
function compile(source, destination) {
  var plugins = [
    typescript({
      target: 'ES6',
      module: 'es2015',
      moduleResolution: 'node',
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      noImplicitAny: true,
      removeComments: true,
      typescript: require('typescript')
    }),
    babel({
      exclude: 'node_modules/**/*.js',
      presets: [['es2015', { modules: false }]],
      plugins: ['external-helpers']
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true,
      extensions: ['.js', '.ts', '.json'],
      preferBuiltins: false
    })
  ]

  if (localConfig.uglify) {
    plugins.push(uglify())
  }

  return rollup.rollup({
    entry: source,
    plugins: plugins,
    sourceMap: true
  }).then(bundle => {
    return bundle.write({ dest: destination, sourceMap: true });
  })
}


/**********************************************************************
 * Tasks to build the app
 */

gulp.task('images', () => {
  return gulp.src('src/**/*.svg')
    .pipe(svgmin())
    .pipe(templatecache({
      filename: 'images.js',
      module: config.moduleName
    }))
    .pipe(gulp.dest('.tmp/'));
});

gulp.task('templates', () => {
  return gulp.src(['src/**/*.html'])
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(watching ? htmlhint.reporter() : htmlhint.failReporter())
    .pipe(htmlmin(htmlMinOptions))
    .pipe(templatecache({ module: config.moduleName }))
    .pipe(gulp.dest('.tmp/'));
});

gulp.task('styles', () => {
  return gulp.src('src/main.scss')
    .pipe(sourcemaps.init())
    .pipe(inject(gulp.src('src/**/_*.scss'), {
      starttag: '/* inject:imports */',
      endtag: '/* endinject */',
      transform: filepath => '@import ".' + filepath + '";'
    }))
    .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/css'))
})

gulp.task('compile', () => {
  return compile('src/index.ts', './build/js/main.js')
})

gulp.task('build', ['images', 'templates', 'styles', 'compile'], () => {
  return gulp.src('src/index.html')
    .pipe(gulp.dest('./build'));
});


/**********************************************************************
 * Running the app
 */

gulp.task('default', ['build'], () => {
  var browserSync = require('browser-sync');
  var modRewrite = require('connect-modrewrite');

  var bs = browserSync.create();

  watch(['src/**/*'], () => {
    gulp.start('build');
  });

  bs.watch('build/**/*').on('change', bs.reload);

  bs.init({
    open: false,
    reloadOnRestart: true,
    ghostMode: false,
    server: {
      baseDir: ['./build'],
      middleware: [
        modRewrite([
          '!\\.\\w+$ /index.html [L]' // this is for angular's HTML5 mode
        ])
      ]
    }
  });
});


/**********************************************************************
 * Cleanup
 */

gulp.task('clean', cb => {
  var del = require('del');
  del(['build/**/*', '.tmp/**/*'], cb);
});


/**********************************************************************
 * Tasks to build and run the tests
 */

gulp.task('spec:inject', () => {
  return gulp.src('src/spec.ts')
    .pipe(inject(gulp.src('src/**/*.spec.ts'), {
      starttag: '/* inject:specs */',
      endtag: '/* endinject */',
      transform: filepath => "import '.." + filepath + "';"
    }))
    .pipe(gulp.dest('.tmp/'));
});

gulp.task('spec:compile', ['spec:inject'], () => {
  return compile('.tmp/spec.ts', '.tmp/spec.js');
})

gulp.task('spec', ['build', 'spec:compile'], (cb) => {
  var path = require('path');
  new karma.Server(
    { configFile: path.resolve('karma.conf.js') },
    exitCode => {
      console.log('exit code', exitCode)
      if (exitCode) {
        process.exit(1);
      }
      cb();
    }).start();
});

gulp.task('spec:debug', ['build', 'spec:compile'], () => {
  var path = require('path');
  new karma.Server(
    {
      configFile: path.resolve('karma.conf.js'),
      browsers: ['Chrome'],
      singleRun: false
    }).start();
});
