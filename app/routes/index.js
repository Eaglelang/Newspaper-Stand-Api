/* eslint-disable */
/**
 * This file scans through the current directory using each file as a route with the name of the file(without the extension) as the route
 * @param app
 */
const fs = require('fs');

module.exports = (app) => {
  fs.readdirSync(__dirname).forEach((fileName) => {
    if (fs.lstatSync(`${__dirname}/${fileName}`).isDirectory()) {
      const directoryName = fileName;
      fs.readdirSync(`${__dirname}/${directoryName}`).forEach((fileName) => {
        const routeName = fileName.split('.')[0];
        app.use(`/${directoryName}/${routeName}`, require(`./${directoryName}/${fileName}`));
      });
    } else {
      const routeName = fileName.split('.')[0];
      if (routeName !== 'index') { app.use(`/${routeName}`, require(`./${fileName}`)); }
    }
  });
};
