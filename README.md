# devination

https://devination-docs.github.io/devination/

devination is a documentation browser for different programming languages similar to Dash (https://kapeli.com/dash). 
The goal is to provide a modern interface to browse documentation on multiple plattforms, 
especially targeting Linux and Windows.

_screenshot here_

## Download
 - RPM (tested on fedora): 

## Contribute

If you would like to contribute, please look at the todo list below. 
Help/Suggestions regarding graphics or UX are most welcome. Get in touch on twitter @jorisdamian

Also, check: https://github.com/devination-docs/devination/wiki/Todo

### Compilation

Prerequisites:

make sure you have python 2.7 installed (for node-gyp)

1. `npm install` 

2. make sure you have elm >= 0.18 and have run `npm install`. 
make your have the following folders in the root of the project: 
`docsets`, `app`, `dist` --> `mkdir docset app dist`

3. compile to elm.js with: 
`npm run elm`

4. run:
`npm run fix_mismatch`

`npm run start`

### Auto compile on changes
once: `npm i -g chokidar-cli`

`npm run watch`


## Headless/interactive
devination --interactive
