const gulp = require('gulp');
const eslint = require('gulp-eslint');
const mocha = require('gulp-mocha');

gulp.task('default', ['lint', 'test']);

gulp.task('lint', () => {
  return gulp.src(['gulpfile.js', 'index.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('test', () => {
  return gulp.src('tests/**/*.js', { read: false })
    .pipe(mocha({
      reporter: 'spec',
      bail: true,
      checkLeaks: true,
      fullTrace: true
    }));
});
