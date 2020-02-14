var gulp = require('gulp'), del = require('del');
var install = require('gulp-install');
var flatten = require('gulp-flatten');
var flattenRequires = require('gulp-flatten-requires');
var exec = require('child_process').exec;
var zip = require('gulp-zip');
var del = require('del');
var replace = require('gulp-replace');
var install = require('gulp-install');
var merge = require('merge-stream');

var config = require('./configurationservice/src/configuration');
var args   = require('yargs').argv;
config.loadConfiguration(args.env);
var paramLookup = require('./configurationservice/src/parameterLookup');


//Notes on gulp:
//  All tasks run in parallel by default.  To force sequence, you must:
//      1. Show the dependency (in gulp.task declaration, put the parent tasks in hard brackets (['taskname'])
//      2. Include a return statement so gulp knows when current task is done

//cleanup the dist folder
gulp.task('cleandist', function () {
    return del([
        'dist/*.js',
        'dist/*.zip',
        'dist/node_modules/**/*'
    ]);
});

gulp.task('copynodejs', ['cleandist'], function () {
    var s1 = gulp.src('nodejsutilities/HttpResponse/httpResponse.js')
        .pipe(gulp.dest('dist'));

    var s2 = gulp.src('configurationservice/src/parameterLookup.js')
        .pipe(gulp.dest('dist'));

    var s3 = gulp.src('nodejsutilities/Logging/logging.js')
        .pipe(gulp.dest('dist'));

    return merge(s1, s2, s3);
});

//copy the JavaScript files (be sure to wait for clean:dist to finish)
gulp.task('move', ['cleandist'], function () {
    return gulp.src('src/**')
        .pipe(flatten())
        .pipe(flattenRequires())
        .pipe(gulp.dest('dist'));
});


gulp.task('copyval', ['move', 'copynodejs'], function () {
    return gulp.src('node_modules/validator/**/*.*' )
        .pipe(gulp.dest('dist/node_modules/validator'))
        .pipe(install({production: true}));
});

gulp.task('cleansrc', ['move', 'copynodejs' ], function () {
    return del([
        'dist/src/**'
    ]);
});

gulp.task('setEsOrigin', ['move', 'copynodejs'], function () {
    return gulp.src('dist/constants.js', { base : './' } )
        .pipe(replace('|SENTRYURL|', config.SentryUrl))
        .pipe(replace('|REGION|', config.Region))
        .pipe(replace('|DRREGION|', config.DRRegion))
        .pipe(replace('|ESURL|', config.ElasticSearchUrl))
        .pipe(replace('|IOTURL|', config.IotBidUrl))
        .pipe(replace('|PROXYSNS|', config.ProxyBidSns))
        .pipe(replace('|CORSORIGIN|', config.CorsAccessOrigin))
        .pipe(replace('999999999', config.RedisPort))
        .pipe(replace('|REDISHOST|', config.RedisHost))
        .pipe(gulp.dest('.'));
});

gulp.task('setenvRedis', ['move'], function () {
    return gulp.src('dist/redisconnection.js', { base : './' } )
        .pipe(replace('localhost', config.RedisHost))
        .pipe(gulp.dest('.'));
});

gulp.task('npm',['move'], function () {
    return gulp.src('./package.json')
        .pipe(gulp.dest('./dist/'))
        .pipe(install({ production: true }));
});

gulp.task('setFromAWSParamStore', ['move'], async()=> {
    let AWSSERVICES_LAMBDA_ROLE;

try{
    AWSSERVICES_LAMBDA_ROLE = await paramLookup.getStringParameterPromise('notifications_service_lambdaRole', config.Region);
    console.log("AWSSERVICES_LAMBDA_ROLE "+AWSSERVICES_LAMBDA_ROLE);

}
catch(err){
    console.log(err);
}

return gulp.src('dist/constants.js', { base : './' } )
    .pipe(replace('|AWSSERVICES_LAMBDA_ROLE|', AWSSERVICES_LAMBDA_ROLE))
    .pipe(gulp.dest('.'));
});

//ZIP up the files; wait for cleansrc
gulp.task('zipit', ['npm','setenvRedis','setEsOrigin','setFromAWSParamStore'], function () {
    if (process.platform === 'win32') {
        console.log('zipping for windows');
        del.sync('dist/package.json');
        var package = __dirname + '\\dist\\package.zip';
        var filesToZip = __dirname + '\\dist\\*';
        var command = '"C:\\Program Files\\7-Zip\\7z.exe" a ' + '"' + package + '" "' + filesToZip + '"';
        return exec(command, function (error, stdout, stderr) {
            if (error)
                console.log(error);
            console.log(stdout);
        });        
    } else {
        console.log('zipping for unix variant');
        del.sync('dist/package.json');
        gulp.src('dist/**/*')
            .pipe(zip('package.zip'))
            .pipe(gulp.dest('dist'));
    }
});

gulp.task('default', ['zipit']);
