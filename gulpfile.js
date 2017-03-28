const gulp = require('gulp');
const eslint = require('gulp-eslint');

gulp.task('default', ['lint']);

gulp.task('lint', () => {
  return gulp.src(['gulpfile.js', 'index.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});
