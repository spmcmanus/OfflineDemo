const jquery = require('jquery');
const pouch = require('./js/app.js');
const electronOauth2 = require('electron-oauth2');
console.log("electronOAuth2")

var config = {
    clientId: '14730b4d-c7b4-4f78-be5a-8794d1c87185',
    clientSecret: 'NwMa3apFKdrCtczGAEbwXog',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/authorize?',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/token',
    useBasicAuthorizationHeader: false,
    redirectUri: 'http://localhost:3000/token',
    resource: 'https://graph.microsoft.com/'
};

const request = require('superagent');
function getUserData(accessToken) {
  request
   .get('https://graph.microsoft.com/v1.0/me')
   .set('Authorization', 'Bearer ' + accessToken)
   .end((err, res) => {
     console.log('error',err);
     console.log('results',res);
     //callback(err, res);
     jquery('#user-data').html(res.body.displayName + ' | ' + res.body.jobTitle + ' | ' + res.body.mail + ' | ' + res.body.officeLocation)
     myPouch.init(res.body.mail);
   });
}

function showResults() {
  console.log("showing results")
}

console.log('config',config);

//app.on('ready', () => {
const windowParams = {
  alwaysOnTop: true,
  autoHideMenuBar: true,
  webPreferences: {
      nodeIntegration: false
  }
}

const options = {
  scope: 'SCOPE',
  accessType: 'ACCESS_TYPE'
};

const myApiOauth = electronOauth2(config, windowParams);
console.log(myApiOauth)

//function authenticate() {
console.log("authenticating...");

myApiOauth.getAccessToken(options)
  .then(token => {
    // use your token.access_to
    console.log('token',token)

    var userData = getUserData(token.access_token);

    console.log(userData)





    /*
    myApiOauth.refreshToken(token.refresh_token)
      .then(newToken => {
        //use your new token
        console.log('create window')
        createWindow()
        console.log("use new token",newTokens)
      },err => {
        console.log("error refreshing token",err)
      });
      */
  }, err => {
    console.log("error getting token",err)
  });
