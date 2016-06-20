var UglifyJS = require("uglify-js"); // js concatter
var fs = require('fs');

module.exports = function(){
  try{
    var result = UglifyJS.minify([
      'scripts/RecordRTC.js'
    , 'scripts/lib/ccv.js'
    , 'scripts/lib/face.js'
    , 'scripts/adapter.js'
    , 'scripts/common.js'
    , 'scripts/helper.js'
    , 'scripts/main.js'
    ], {
      //compress: {disable:true}
      output: {beautify: process.env.DEBUG ? true : false}
      //outSourceMap: "script.js.map",
    });
  }catch(err) {
    console.log(err);
    console.log(err.stack);
  }
  fs.writeFile("public/js/script.js", result.code, function(err) {
    if(err)
      return console.log(err);
    console.log("script written");
  }); 
  //fs.writeFile("public/js/script.js.map", result.map, function(err) {
  //  if(err)
  //    return console.log(err);
  //}); 
}
