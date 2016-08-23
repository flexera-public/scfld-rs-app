var gulp = require('gulp');
var templatecache = require('gulp-angular-templatecache');
var watch = require('gulp-watch');
var sourcemaps = require('gulp-sourcemaps');
var inject = require('gulp-inject');

var karma = require('karma');

var _ = require('lodash');
var fs = require('fs');

var config = require('./config.json');

var localConfig = {};
try {
  localConfig = JSON.parse(fs.readFileSync('config.local.json') || '');
}
catch (e) { }

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
  var rollup = require('rollup');
  var babel = require('rollup-plugin-babel');
  var typescript = require('rollup-plugin-typescript');
  var commonjs = require('rollup-plugin-commonjs');
  var nodeResolve = require('rollup-plugin-node-resolve');
  var uglify = require('rollup-plugin-uglify');

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

function images(source, destination, moduleName) {
  var svgmin = require('gulp-svgmin');

  return gulp.src(source)
    .pipe(svgmin())
    .pipe(templatecache({
      filename: 'images.js',
      module: moduleName
    }))
    .pipe(gulp.dest(destination));
}

function templates(source, destination, moduleName) {
  var htmlhint = require('gulp-htmlhint');
  var htmlmin = require('gulp-htmlmin');

  return gulp.src(source)
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(watching ? htmlhint.reporter() : htmlhint.failReporter())
    .pipe(htmlmin(htmlMinOptions))
    .pipe(templatecache({ module: moduleName }))
    .pipe(gulp.dest(destination));
}

function styles(entryPoint, source, destination) {
  var sass = require('gulp-sass');
  var postcss = require('gulp-postcss');
  var atImport = require("postcss-import");
  var autoprefixer = require('autoprefixer');
  var mqpacker = require('css-mqpacker');
  var csswring = require('csswring');

  return gulp.src(entryPoint)
    .pipe(sourcemaps.init())
    .pipe(inject(gulp.src(source), {
      starttag: '/* inject:imports */',
      endtag: '/* endinject */',
      transform: filepath => '@import ".' + filepath + '";'
    }))
    .pipe(sass())
    .pipe(postcss([
      atImport(),
      autoprefixer({ browsers: ['last 2 versions'] }),
      mqpacker({ sort: true }),
      csswring({ removeAllComments: true })
    ]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(destination))
}

/**********************************************************************
 * Tasks to build the app
 */

gulp.task('images', () => {
  return images('src/**/*.svg', '.tmp/', config.moduleName);
});

gulp.task('templates', () => {
  return templates(['src/**/*.html', '!src/*.html'], '.tmp/', config.moduleName);
});

gulp.task('styles', () => {
  return styles('src/main.scss', 'src/**/_*.scss', './build/css');
})

gulp.task('compile', () => {
  return compile('src/index.ts', './build/js/main.js');
})

gulp.task('build', ['images', 'templates', 'styles', 'compile'], () => {
  return gulp.src('src/index.html')
    .pipe(gulp.dest('./build'));
});


/**********************************************************************
 * Running the app
 */

var bs = require('browser-sync').create();

gulp.task('reload', ['build'], () => {
  var cache = require('gulp-cached');
  var ignore = require('gulp-ignore');

  return gulp.src(['./build/**/*'])
    .pipe(cache()) // ignore files that haven't changed
    .pipe(ignore(file => !file.contents)) // ignore directories
    .pipe(bs.stream()); // reload the page or inject CSS
})


gulp.task('default', ['reload'], () => {
  var modRewrite = require('connect-modrewrite');

  watch(['src/**/*'], () => {
    gulp.start('reload');
  });

  bs.init({
    open: false,
    reloadOnRestart: true,
    ghostMode: false,
    server: {
      baseDir: ['./build'],
      middleware: [
        modRewrite([
          '!\\.\\w+(\\?.*)?$ /index.html [L]' // this is for angular's HTML5 mode
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
