var azure_config = {};
var myApiOauth = null;
var windowParams = null;
var options = null;
var azureAuth = {};
var request = null;

azureAuth = {

  init: function() {
    const electronOauth2 = require('electron-oauth2');
    request = require('superagent');
    azure_config = {
        clientId: '468c71e7-703e-4fc7-adf7-d79da4d6ea17',
        clientSecret: '2tIDx+/jRfFJXOybNOh2UGJA4sDT5XCZXQBCt1Pt/8E=',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/authorize?',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/token',
        useBasicAuthorizationHeader: false,
        redirectUri: 'http://localhost:3000/token',
        resource: 'https://graph.microsoft.com/'
    };
    windowParams = {
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
          nodeIntegration: false
      }
    }
    options = {
      scope: 'SCOPE',
      accessType: 'ACCESS_TYPE'
    };
    myApiOauth = electronOauth2(azure_config, windowParams);
    azureAuth.getToken();
  },

  getUserData: function(accessToken) {
    request
     .get('https://graph.microsoft.com/v1.0/me')
     .set('Authorization', 'Bearer ' + accessToken)
     .end((err, res) => {
       console.log('error',err);
       console.log('results',res);
       jquery('#register-username').val(res.body.mail.toLowerCase())
       jquery('#user-data').html(res.body.displayName + ' | ' + res.body.jobTitle + ' | ' + res.body.mail + ' | ' + res.body.officeLocation)
     });
  },

  getToken: function() {
    myApiOauth.getAccessToken(options)
      .then(token => {
        var userData = azureAuth.getUserData(token.access_token);
      }, err => {
        console.log("error getting token",err)
      });
  }
}
