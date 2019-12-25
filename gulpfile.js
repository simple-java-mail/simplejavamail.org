'use strict';

const browserSync = require('browser-sync').create();
const del = require('del');
const env = require('gulp-util').env;
const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const rename = require('gulp-rename');
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');

const config = {
  src: './src',
  dest: './dist',
  watchers: [{
    match: ['./src/**/*.hbs'],
    tasks: ['html']
  }, {
    match: ['./src/**/*.less'],
    tasks: ['less']
  }, {
    match: ['./src/**/*.ts', './tsconfig.json'],
    tasks: ['ts']
  }, {
    match: ['./src/assets/**/*'],
    tasks: ['copy-assets']
  }, {
    match: ['./gulpfile.js'],
    tasks: ['html', 'less', 'ts', 'copy-assets', 'copy-lib', 'copy-sitemap']
  }]
};

gulp.task('clean', () => del.sync(config.dest));

gulp.task('build', ['clean', 'html', 'less', 'ts', 'copy-assets', 'copy-lib', 'copy-sitemap'], () => {
  // noinspection JSUnusedGlobalSymbols
  return gulp.src(`${config.src}/pages/*.hbs`)
      .pipe(handlebars({}, {
        ignorePartials: true,
        batch: [`${config.src}/partials`],
        helpers : {
          valueWhenEqual : function(valA, valB, returnVal){
            return valA === valB ? returnVal : '';
          }
        }
      }))
      .pipe(rename({ extname: '.html' }))
      .pipe(gulp.dest(config.dest));
});

gulp.task('html', [], () => {
  // noinspection JSUnusedGlobalSymbols
  return gulp.src(`${config.src}/pages/*.hbs`)
      .pipe(handlebars({}, {
        ignorePartials: true,
        batch: [`${config.src}/partials`],
        helpers : {
          valueWhenEqual : function(valA, valB, returnVal){
            return valA === valB ? returnVal : '';
          }
        }
      }))
      .pipe(rename({
        extname: '.html'
      }))
      .pipe(gulp.dest(config.dest));
});

gulp.task('ts', function () {
  return gulp.src('src/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(ts({ module: 'es6' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('less', function () {
  return gulp.src(`${config.src}/**/main.less`)
      .pipe(less())
      .pipe(gulp.dest(config.dest));
});

gulp.task('copy-assets', function () {
  return gulp.src(`${config.src}/assets/**/*`)
      .pipe(gulp.dest(`${config.dest}/assets`));
});

gulp.task('copy-lib', function () {
  return gulp.src(`${config.src}/lib/**/*`)
      .pipe(gulp.dest(`${config.dest}/assets/lib`));
});

gulp.task('copy-sitemap', function () {
  return gulp.src(`${config.src}/sitemap.xml`)
      .pipe(gulp.dest(`${config.dest}`));
});

gulp.task('serve', () => {
  browserSync.init({
    open: false,
    notify: false,
    files: [`${config.dest}/**/*`],
    server: config.dest
  });
});

gulp.task('watch', () => {
  config.watchers.forEach(item => {
    gulp.watch(item.match, item.tasks);
  });
});

gulp.task('default', ['build'], done => {
  if (env.watch) {
    gulp.start('serve');
    gulp.start('watch');
  }
  done();
});