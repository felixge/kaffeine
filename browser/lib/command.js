require.module('./command', function(module, exports, require) {
// start module: command

var Kaffeine = require("./kaffeine").Kaffeine
var fs =             require('fs')
var path =           require('path')
var optparse =       require('./optparse')
var options = {},
    sources = [],
    optionParser = null,
    puts = require("sys").puts

function watch(source, base) {
  fs.watchFile(source, {persistent: true, interval:  500}, function(curr, prev) {
    if(curr.mtime.getTime() === prev.mtime.getTime()) return
    fs.readFile(source, function(err, code) { compileScript(source, code.toString(), base)})
  })
}


function loadPlugins(source) {

  fs.readdir(source, function(err, files) {
    for(var i =0; i< files.length;i++) {
      var file = files[i]
      if(!file.match(/\.js$/)) continue
      file = file.replace(/\.js$/, "")
    
      
      var path = "./plugins/" + file
      // puts(file, path)
      //       puts(Kaffeine.plugins)
      Kaffeine.plugins[file] = require(path)[file]
      // puts(Kaffeine.plugins)
    }
  })
}

loadPlugins("./lib/plugins")


exports.run = function() {
  parseOptions()
  if(options.help) return usage()                              
  if(options.version) return version()                            
  //if(options.interactive) return require './repl'                     
  //if(options.stdio) return compileStdio()                      
  //if(options.eval) return compileScript('console', sources[0] )
  //if(!sources.length) return require './repl'                      
  var separator = sources.indexOf('--')
  var flags = []
  if(separator >= 0) {
    flags = sources.slice((separator + 1), sources.length)
    sources = sources.slice(0, separator-1)
  }
  process.ARGV = process.argv = flags
  compileScripts()
}


function compileScripts() {
  for(var i =0; i < sources.length; i++) {
    var source = sources[i]
    var base = source
    var compile = function(source, topLevel) {
      path.exists(source, function (exists) {
        if(!exists) throw(new Error("File not found = " + source)) 
        fs.stat( source, function(err, stats) {
          if(stats.isDirectory()) {
            fs.readdir(source, function(err, files) {
              for(var j=0; j<files.length;j++) {
                var file = files[j]
                compile(path.join(source, file))
              }
            })
          }
          else if(topLevel || path.extname(source) == '.k') {
            fs.readFile(source, function(err, code) { compileScript(source, code.toString(), base) })
            if(options.watch) watch(source, base)
          }
        })
      })
    }
    compile(source, true)
  }
}

// Compile a single source script, containing the given code, according to the
// requested options. If evaluating the script directly sets `__filename`,
// `__dirname` and `module.filename` to be correct relative to the script's path.
function compileScript(source, code, base) {
  var o = options
  var codeOpts = compileOptions(source)
  try {
    //if(o.tokens)      printTokens(Kaffeine.tokens, code) 
    //else if(o.nodes)  puts( Kaffeine.nodes(code).toString())
    //if(o.run)     Kaffeine.run(code, codeOpts)
    //else {
      var js = new Kaffeine(codeOpts).compile(code)
      if(o.print)         print(js)
      else if(o.compile)  writeJs(source, js, base)
      //else if(o.lint)     lint(js)
    //}
  } 
  catch(err) {
    if(!o.watch) {
      require("sys").puts(err.stack)
      process.exit(1) 
    }
    puts(err.message)
  }
}

// The compile-time options to pass to the Kaffeine compiler.
function compileOptions(source) {
  o = {source: source}
  o['no_wrap'] = options['no-wrap']
  return o
}


// Write out a JavaScript source file with the compiled code. By default, files
// are written out in `cwd` as `.js` files with the same name, but the output
// directory can be customized with `--output`.
function writeJs(source, js, base) {
  var filename = path.basename(source, path.extname(source)) + '.js'
  var srcDir   = path.dirname(source)
  var baseDir  = srcDir.substring(base.length)
  var dir      = options.output ? path.join(options.output, baseDir) : srcDir
  var jsPath   = path.join(dir, filename)
  var compile  = function() {
    fs.writeFile(jsPath, js, function(err) {
      if(options.compile && options.watch) puts("Compiled " + source) 
    })
  }
  path.exists(dir, function(exists) {
    exists ? compile() : exec("mkdir -p " + dir, compile)
  })    
}


var BANNER = "kaffeine compiles Kaffeine source files into JavaScript.\nUsage = \nkaffeine path/to/script.k"

// The list of all the valid option flags that `coffee` knows how to handle.
var SWITCHES = [
  ['-c', '--compile',       'compile to JavaScript and save as .js files'],
  ['-i', '--interactive',   'run an interactive Kaffeine REPL'],
  ['-o', '--output [DIR]',  'set the directory for compiled JavaScript'],
  ['-w', '--watch',         'watch scripts for changes, and recompile'],
  ['-p', '--print',         'print the compiled JavaScript to stdout'],
  ['-l', '--lint',          'pipe the compiled JavaScript through JSLint'],
  ['-s', '--stdio',         'listen for and compile scripts over stdio'],
  ['-e', '--eval',          'compile a string from the command line'],
  [      '--no-wrap',       'compile without the top-level function wrapper'],
  ['-t', '--tokens',        'print the tokens that the lexer produces'],
  ['-n', '--nodes',         'print the parse tree that Jison produces'],
  ['-v', '--version',       'display Kaffeine version'],
  ['-h', '--help',          'display this help message']
]

function parseOptions() {
  // require("sys").puts(SWITCHES)
  // require("sys").puts(process.argv)
  optionParser = new optparse.OptionParser(SWITCHES, BANNER)
  var o = options =  optionParser.parse(process.argv)
  options.run =   !(o.compile || o.print || o.lint)
  options.print = !!(o.print || (o.eval || o.stdio && o.compile))
  sources = options.arguments.slice(2, options.arguments.length)
}


// Print the `--help` usage message and exit.
function usage() {
  puts(optionParser.help())
  process.exit(0)
}
  
// Print the `--version` message and exit.
function version() {
  puts("Kaffeine version " + Kaffeine.VERSION)
  process.exit(0)
}

// end module: command
});