console.log("app.js");

// needed npm modules
const jquery = require('jquery');

// variables
var ENTER_KEY = 13;
var syncDom = document.getElementById('sync-wrapper');
var db = new PouchDB('todos2');
var userDb = new PouchDB('users');
var newTodoDom = document.getElementById('new-todo');
var username = '906df5f9-8a59-420f-beac-e4bc7427fce1-bluemix';
var pwd = 'c93540a1411c433bfde99af4b290ff4a79746f4c56cc5041080600934f53e93b';
var cloudant_host = '906df5f9-8a59-420f-beac-e4bc7427fce1-bluemix.cloudant.com';
var remote_dbname = 'todos2';
var remoteCouch = 'https://' + username + ':' + pwd + '@' + cloudant_host + '/' + remote_dbname;
var onlineUrlCheck = 'https://login.microsoftonline.com/common/oauth2/authorize?';
var authenticatedUser = null;
var authUserData = {}
var role = 'user';
var onlineMode = null;
var viewLogin = jquery('#loginapp');
var viewRegister = jquery('#registerapp');
var viewMain = jquery('#todoapp');
console.log(remoteCouch)
// button listeners
jquery('#btn-login').on('click',function(){
  console.log("login");
  if (onlineMode == true) {
      myPouch.loginUser();
  } else {
      myPouch.loginUserOffline();
  }
});

jquery('#btn-register').on('click',function(){
    console.log("register new ");
    // O365 Authentication Goes HERE
    azureAuth.init();

    viewLogin.hide();
    viewRegister.show();
});

jquery('div#delete-dbs').on('click',function(){
  myPouch.delete();
});

jquery('#btn-register-submit').on('click',function(){
    console.log("submit registration");
    if (jquery('#register-password-confirm').val() == jquery('#register-password-confirm').val()) {
          myPouch.registerUser();
    } else {
      jquery('#register-password').val('');
      jquery('#register-password-confirm').val('');
      jquery('#register-message').html('<div style="color:red">Passwod and Confirm Password do not match, please try again</div>')
    }
});

jquery('#btn-manual-sync').on('click',function(){
    console.log("attempt to sync");
    var urlExists = require('url-exists');
    urlExists(remoteCouch, function(err, exists) {
      console.log('exists',exists)
      onlineMode = exists;
      if (exists == true) {
        console.log("reconnecting")
        jquery('#connect-mode').html('You are working ONLINE');
        jquery('#btn-manual-sync').hide();
        jquery('#sync-message').html('');
        console.log("now sync");
        myPouch.sync(authenticatedUser);
      } else {
        jquery('#connect-mode').html('You are working OFFLINE');
        jquery('#sync-message').html('<div style="color:red">Server still not available, online mode will continue</div>');
        jquery('#new-todo').focus();
      }
    });
});

//myPouch class definition
var myPouch  = {};
myPouch = {

  // Initialise functions
  init: function(currentUser) {
    //check connectivity
    var urlExists = require('url-exists');
    urlExists(remoteCouch, function(err, exists) {
      console.log('exists',exists)
      onlineMode = exists;
      if (exists == true) {
        jquery('#connect-mode').html('You are working ONLINE');
        jquery('#btn-manual-sync').hide();
      } else {
        jquery('#connect-mode').html('You are working OFFLINE');
        jquery('#btn-register').hide();
      }
    })

    //myPouch.sync(authenticatedUser);
    //myPouch.showTodos();
    myPouch.addEventListeners();
    myPouch.listen();
  },


  loginUserOffline: function() {
    console.log('login offline')
    login_username = jquery('#login-username').val().toLowerCase();
    var userDb = new PouchDB('users');
    userDb.get(login_username).then(function (doc) {
      // verify password
      var passwordHash = require('password-hash');
      var inputPassword = jquery('#login-password').val();
      var hashedPassword = doc.password;
      var passwordValid = passwordHash.verify(inputPassword,hashedPassword);
      if (passwordValid == true) {
        console.log("AUTHENTICATED",login_username);
        authenticatedUser = login_username;
        // UI Updates
        viewMain.show();
        viewLogin.hide();
        myPouch.showTodos();
        // show reconnect button
        jquery('#btn-manual-sync').show();
      } else {
        console.log("Login failed")
        jquery('#login-message').html('<div style="color:red">You have entered an incorrect username or password</div>');
      }
    }).catch(function (err) {
      console.log(err);
      jquery('#login-message').html('<div style="color:red">You have entered an incorrect username or password.  Please try again or connect to create an offline account.</div>');
    });
  },

  loginUser: function() {
    console.log('login online')
    login_username = jquery('#login-username').val().toLowerCase();
    if (userDb != undefined) {
      console.log("destroy and rebuild userdb")
      userDb.destroy().then(function (response) {
        console.log("userdb destroyed")
      }).catch(function (err) {
        console.log(err);
      });
    }


    var userOpts = {
      filter: function(doc) {
        return doc._id === login_username;
      }
    }
    var userDb = new PouchDB('users');
    userDb.replicate.from(remoteCouch,userOpts).on('complete',function(info){
      userDb.get(login_username).then(function (doc) {
        // verify password
        var passwordHash = require('password-hash');
        var inputPassword = jquery('#login-password').val();
        var hashedPassword = doc.password;
        var passwordValid = passwordHash.verify(inputPassword,hashedPassword);
        if (passwordValid == true) {
          console.log("AUTHENTICATED",login_username);
          //prepare sync options usings authenticated user
          var syncOptionsFrom = {
            live: true,
            retry: true,
            filter: function(doc) {
              return doc.createdBy === login_username;
            }
          }
          var syncOptionsTo = {
            live: true,
            retry: true
          }
          // sync
          authenticatedUser = login_username;
          db.replicate.to(remoteCouch, syncOptionsTo);
          db.replicate.from(remoteCouch,syncOptionsFrom);
          // UI Updates
          viewMain.show();
          viewLogin.hide();
          myPouch.showTodos();
        } else {
          console.log("Login failed")
          jquery('#login-message').html('<div style="color:red">You have entered an incorrect username or password</div>');
        }
      }).catch(function (err) {
        console.log(err);
        jquery('#login-message').html('<div style="color:red">You have entered an incorrect username or password</div>');
      });
    });
  },

  // user registration methods
  registerUser: function() {
    //TODO  validate password and confirm password are the same
    //TODO  validate email address is validate
    //TODO  mask password fields

    // retrieve entered password and create a hash of it
    var passwordHash = require('password-hash');
    var hashedPassword = passwordHash.generate(jquery('#register-password').val());
    var username = jquery('#register-username').val().toLowerCase();
    // create user objecft
    var user = {
      _id: username,
      type: 'UserRegistration',
      createdBy: username,
      username: username,
      password: hashedPassword
    };

    //add user document to database
    db.put(user, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a todo!');
      } else {
        console.log("error",err)
      }
    });

    viewRegister.hide();
    viewLogin.show();
    jquery('#login-username').val('');
    jquery('#login-password').val('');
    jquery('#login-message').html('<div style="color:red">Offline account has been created, please procced with login</div>');
    myPouch.sync(authenticatedUser);
    myPouch.validateUsername(user.username);
},

validateUsername: function(username) {
  // checks the username against existing userRegistration documents and
  // returns true if this username has not been used yet, otherwise returns false
  console.log("validating username ",username)
  // lookup to pouch to find this username as a user
  //db.allDocs({include_docs: true, descending: true}, function(err, doc) {
  //  console.log('docs',doc);
  //});

  //return false;
},


  // utility functions
  // Initialise a sync with the remote server
  sync: function(authUser) {
    console.log("syncing!!!",authUser);

    // replicate all docs going from remote
    var optsTo = {
      live: true,
      retry: true
    }
    // replicate only filtered docs coming to remote
    var optsFrom = {
      live: true,
      retry: true,
      filter: function(doc) {
        return doc.createdBy === authUser;
      }
    }
    console.log("setAttribute")
    syncDom.setAttribute('data-sync-state', 'syncing');
    console.log("to")
    db.replicate.to(remoteCouch, optsTo);
    console.log("from: ",authUser)
    db.replicate.from(remoteCouch,optsFrom);
    console.log("from crep complete")
  },
  // There was some form or error syncing
  syncError:function() {
    syncDom.setAttribute('data-sync-state', 'error');
  },
  delete: function() {
    db.destroy().then(function (response) {
      // success
      console.log("main database has been destroyed")
    }).catch(function (err) {
      console.log(err);
    });
    userDb.destroy().then(function (response) {
      // success
      console.log("userDB has been destroyed")
    }).catch(function (err) {
      console.log(err);
    });
  },
  // listen for changes
  listen: function() {
    console.log("in listen function");
    console.log(db)
    db.changes({
      since: 'now',
      live: true
    }).on('change', myPouch.showTodos);
  },
  // Main application functions
  showTodos: function() {
    console.log("show all todos")
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      console.log('docs',doc);
      myPouch.redrawTodosUI(doc.rows);
    });
  },
  showTodosOld: function(mode,userData) {
    //console.log('userData',userData)
    if (userData == undefined || typeof(userData.mail) == 'undefined') {
      console.log("don't update user data")
    } else {
      console.log("update user data")
      authUserData = userData;
    }

    if (mode == 1) {
      console.log("show all")
      db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        console.log('docs',doc);
        myPouch.redrawTodosUI(doc.rows);
      });
    } else {
      console.log("filter on current user");
      db.search({
        query: authUserData.mail,
        include_docs:true,
        fields: ['createdBy']
      }).then(function(res) {
        //console.log('search docs',res);
        myPouch.redrawTodosUI(res.rows);
      }).catch(function(err){
        console.log("search error",err)
      })
    }
  },
  redrawTodosUI: function(todos) {
    var ul = document.getElementById('todo-list');
    ul.innerHTML = '';
    todos.forEach(function(todo) {
      if (todo.doc.type != 'UserRegistration') {
        ul.appendChild(myPouch.createTodoListItem(todo.doc));
      }
    });
  },
  // We have to create a new todo document and enter it in the database
  addTodo: function(text) {
    console.log("adding todo")
    var todo = {
      _id: new Date().toISOString(),
      title: text,
      completed: false,
      createdBy: authenticatedUser
    };
    console.log(todo)
    db.put(todo, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a todo!');
      }
    });
  },
  checkboxChanged: function(todo, event) {
    todo.completed = event.target.checked;
    db.put(todo);
  },
  // User pressed the delete button for a todo, delete it
  deleteButtonPressed: function(todo) {
    db.remove(todo);
  },
  // The input box when editing a todo has blurred, we should save
  // the new title or delete the todo if the title is empty
  todoBlurred: function(todo, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(todo);
    } else {
      todo.title = trimmedText;
      db.put(todo);
    }
  },
  // User has double clicked a todo, display an input so they can edit the title
  todoDblClicked: function(todo) {
    var div = document.getElementById('li_' + todo._id);
    var inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  },
  // If they press enter while editing an entry, blur it to trigger save
  // (or delete)
  todoKeyPressed: function(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditTodo = document.getElementById('input_' + todo._id);
      inputEditTodo.blur();
    }
  },
  // Given an object representing a todo, this will create a list item
  // to display it.
  createTodoListItem: function(todo) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', myPouch.checkboxChanged.bind(this, todo));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(todo.title));
    label.addEventListener('dblclick', myPouch.todoDblClicked.bind(this, todo));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', myPouch.deleteButtonPressed.bind(this, todo));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditTodo = document.createElement('input');
    inputEditTodo.id = 'input_' + todo._id;
    inputEditTodo.className = 'edit';
    inputEditTodo.value = todo.title;
    inputEditTodo.addEventListener('keypress', myPouch.todoKeyPressed.bind(this, todo));
    inputEditTodo.addEventListener('blur', myPouch.todoBlurred.bind(this, todo));

    var li = document.createElement('li');
    li.id = 'li_' + todo._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditTodo);

    if (todo.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  },
  newTodoKeyPressHandler: function(event) {
    if (event.keyCode === ENTER_KEY) {
      myPouch.addTodo(newTodoDom.value);
      newTodoDom.value = '';
    }
  },
  addEventListeners: function() {
    newTodoDom.addEventListener('keypress', myPouch.newTodoKeyPressHandler, false);
  }
}
