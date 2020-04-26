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
};

gulp.task('clean', done => {
	del.sync(config.dest);
	done();
});

gulp.task('html', () => {
  // noinspection JSUnusedGlobalSymbols
  return gulp.src(`${config.src}/pages/*.hbs`)
      .pipe(handlebars({}, {
        ignorePartials: true,
        batch: [`${config.src}/partials`],
        helpers : {
          valueWhenEqual : (valA, valB, returnVal) => valA === valB ? returnVal : ''
		}
      }))
      .pipe(rename({
        extname: '.html'
      }))
      .pipe(gulp.dest(config.dest));
});

gulp.task('ts', () => {
	return gulp.src('src/**/*.ts')
		.pipe(sourcemaps.init())
		.pipe(ts({module: 'es6'}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist'));
});

gulp.task('less', () => {
	return gulp.src(`${config.src}/**/main.less`)
		.pipe(less())
		.pipe(gulp.dest(config.dest));
});

gulp.task('copy-assets', () => {
	return gulp.src(`${config.src}/assets/**/*`)
		.pipe(gulp.dest(`${config.dest}/assets`));
});

gulp.task('copy-lib', () => {
	return gulp.src(`${config.src}/lib/**/*`)
		.pipe(gulp.dest(`${config.dest}/assets/lib`));
});

gulp.task('copy-sitemap', () => {
	return gulp.src(`${config.src}/sitemap.xml`)
		.pipe(gulp.dest(`${config.dest}`));
});

gulp.task('serve', done => {
	browserSync.init({
		open: false,
		notify: false,
		files: [`${config.dest}/**/*`],
		server: config.dest
	});
	gulp.watch('./src/**/*.hbs', gulp.series('html'));
	gulp.watch('./src/**/*.less', gulp.series('less'));
	gulp.watch('./src/**/*.ts', gulp.series('ts'));
	gulp.watch('./src/assets/**/*', gulp.series('copy-assets'));
	gulp.watch('./gulpfile.js', gulp.parallel('html', 'less', 'ts', 'copy-assets', 'copy-lib', 'copy-sitemap'));
	done();
});

gulp.task('build', gulp.series('clean', gulp.parallel('html', 'less', 'ts', 'copy-assets', 'copy-lib', 'copy-sitemap', () => {
	// noinspection JSUnusedGlobalSymbols
	return gulp.src(`${config.src}/pages/*.hbs`)
		.pipe(handlebars({}, {
			ignorePartials: true,
			batch: [`${config.src}/partials`],
			helpers : {
				valueWhenEqual : (valA, valB, returnVal) => valA === valB ? returnVal : ''
			}
		}))
		.pipe(rename({ extname: '.html' }))
		.pipe(gulp.dest(config.dest));
})));

gulp.task('server', gulp.series('build', 'serve'));

gulp.task('default', gulp.series('server'));