'use strict';

const autoprefixer = require( 'gulp-autoprefixer' );
const browserSync  = require( 'browser-sync' ).create();
const cleanCSS     = require( 'gulp-clean-css' );
const concat       = require( 'gulp-concat' );
const chalk        = require( 'chalk' );
const gulp         = require( 'gulp' );
const header       = require( 'gulp-header' );
const pump         = require( 'pump' );
const rename       = require( 'gulp-rename' );
const replace      = require( 'gulp-replace' );
const sass         = require( 'gulp-sass' );
const uglify       = require( 'gulp-uglify' );
const watch        = require( 'gulp-watch' );

console.log(chalk`{blue.bold MGRS Mapper}\n`);

// Build the app styles.
gulp.task( 'styles', function() {
	console.log(chalk`{red Building app.min.css}`);
	gulp.src( './src/scss/**/*.scss')
		.pipe( sass({ outputStyle: 'expanded' }).on( 'error', sass.logError ) )
		.pipe( autoprefixer())
		.pipe( cleanCSS() )
		.pipe( rename({ suffix: '.min' }) )
		.pipe( gulp.dest( './dist/css') )
		.pipe( browserSync.stream() );
});

// Build the app's header scripts.
gulp.task( 'scripts:header', function( cb ) {
	console.log(chalk`{red Building app-header.min.js}`);
	pump(
		[
			gulp.src([
				'./src/js/vendor/marconistdlib.js',
				'./src/js/vendor/marconimap.js',
				'./src/js/marconiusnggraticule.js',
				'./src/js/vendor/usng2.js',
				'./src/js/vendor/map.js'
			]),
			concat('app-header.js'),
			uglify(),
			rename({ suffix: '.min' }),
			gulp.dest('./dist/js/'),
			browserSync.stream()
		],
		cb
	);
});

// Build the app's footer scripts.
gulp.task( 'scripts:footer', function( cb ) {
	console.log(chalk`{red Building app-footer.min.js}`);
	pump(
		[
			gulp.src([
				'./src/js/mgrs-mapper.js',
			]),
			concat('app-footer.js'),
			uglify({
				mangle: {
					except: ['milsymbolUnitGenerator']
				}
			}),
			rename({ suffix: '.min' }),
			gulp.dest('./dist/js/'),
			browserSync.stream()
		],
		cb
	);
});

// Build the milsymbol-unit-generator file.
// Made into a separate job due to it's size.
gulp.task( 'scripts:symbols', function( cb ) {
	console.log(chalk`{red Building milsymbol-unit-generator.min.js}`);
	pump(
		[
			gulp.src([
				'./src/js/milsymbol-unit-generator.js',
			]),
			concat('app-symbols.js'),
			uglify(),
			rename({ suffix: '.min' }),
			gulp.dest('./dist/js/'),
			browserSync.stream()
		],
		cb
	);
});

// Initialize BrowserSync server.
gulp.task( 'browser-sync', function() {
	browserSync.init({
		server: {
			baseDir: './'
		}
	});
});

// Watch for changes across project.
gulp.task( 'watch', function() {

	// Watch for SUI styling changes.
	gulp.watch( './src/scss/**/*.scss', ['styles'] );

	// Watch for js changes.
	gulp.watch( ['./src/js/**/*.js', '!./src/js/milsymbol-unit-generator.js'], ['scripts'] );

	// Watch for js changes in the symbols file.
	gulp.watch( './src/js/milsymbol-unit-generator.js', ['scripts:symbols'] );

	// Watch for HTML changes.
	gulp.watch( '*.html' ).on( 'change', browserSync.reload );

});

// Build the app's header & footer scripts.
gulp.task( 'scripts', [
	'scripts:header',
	'scripts:footer'
]);

// Build all app files.
gulp.task( 'build', [
	'styles',
	'scripts'
]);

// Start development environment.
gulp.task( 'dev', [
	'build',
	'browser-sync',
	'watch'
]);
