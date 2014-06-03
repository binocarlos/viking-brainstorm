#!/usr/bin/env node
var fs = require('fs');

var st = "hello " + process.env.TEST + ' ' + process.argv[2]
fs.writeFileSync('/test1/store/output.txt', st, 'utf8')
console.log(st)