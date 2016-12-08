# devination

devination is a documentation browser for different programming languages similar to Dash (https://kapeli.com/dash). 
The goal is to provide a modern interface to browse documentation on multiple plattforms, 
especially targeting Linux and Windows.

_screenshot here_

## Download
 - RPM (tested on fedora): 
 - 

## Contribute

If you would like to contribute, please look at the todo list below. 
Help/Suggestions regarding graphics or UX are most welcome.

### Compilation

Prerequisites:

1. `npm i -g chokidar-cli`
make sure you have elm >= 0.18 and have run `npm install`. 
make your have the following folders in the root of the project: 
`docsets`, `app`, `dist` --> `mkdir docset app dist`

2. compile to elm.js with: 
`npm run elm`

3. run:
`npm run start`

### Auto compile on changes

`npm run watch`


### Todo

- [x] Save installed packages to preferences
- [ ] After downloading package, get actual name of package on FS and return it (bootstrap.js, see node-targz issue #xx for details regarding callback)
- [ ] Add option to reset to default settings and remove all installed packages
- [ ] Add option to download specific version of documentation
- [ ] Add option to update documentation (including checking if update is available)
- [ ] Make sure paths are cleaned (no traversal attacks)
- [ ] Add link to Dash
- [ ] Create github page
- [ ] Windows build
- [ ] OSX build
- [ ] Support different unix flavors/add to repos
- [ ] Migrate from gitlab to github? Mirror?
- [ ] Create documentation/FAQ
- [ ] Add screenshot
