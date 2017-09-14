const jquery = require('jquery');

var ENTER_KEY = 13;
var newTodoDom = document.getElementById('new-todo');
var syncDom = document.getElementById('sync-wrapper');

// EDITING STARTS HERE (you dont need to edit anything above this line)
var db = new PouchDB('todos-auth');
var username = '906df5f9-8a59-420f-beac-e4bc7427fce1-bluemix';
var pwd = 'c93540a1411c433bfde99af4b290ff4a79746f4c56cc5041080600934f53e93b';
var cloudant_host = '906df5f9-8a59-420f-beac-e4bc7427fce1-bluemix.cloudant.com';
var remote_dbname = 'todos-auth';
var remoteCouch = 'https://' + username + ':' + pwd + '@' + cloudant_host + '/' + remote_dbname;
var authenticatedUser = "";
var authUserData = {}
var role = 'user';
// button listeners
jquery('#btnShowAll').on('click',function(){
  role = 'admin';
  myPouch.sync();
  myPouch.showTodos();
});

jquery('#btnShowCurrentUser').on('click',function(){
  role = 'user';
  myPouch.sync();
  myPouch.showTodos();
});


var myPouch  = {};
myPouch = {

  // Initialise functions
  init: function(currentUser) {

    console.log("init for ", currentUser);
    authenticatedUser = currentUser;
    myPouch.sync();
    //  console.log("sync-complete");
    myPouch.showTodos();

    myPouch.addEventListeners();
    myPouch.listen();
  },

  delete: function() {
    db.destroy().then(function (response) {
      // success
      console.log("indexedDB has been destroyed")
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
  // Show the current list of todos by reading them from the database
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
      ul.appendChild(myPouch.createTodoListItem(todo.doc));
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

  // Initialise a sync with the remote server
  sync: function() {
    console.log("syncing!!!",authenticatedUser);

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
        return doc.createdBy === authenticatedUser;
      }
    }

    syncDom.setAttribute('data-sync-state', 'syncing');
    db.replicate.to(remoteCouch, optsTo);
    db.replicate.from(remoteCouch,optsFrom)
  },

  // There was some form or error syncing
  syncError:function() {
    syncDom.setAttribute('data-sync-state', 'error');
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

/*
// db change listener
db.changes({
  since: 'now',
  live: true
}).on('change', myPouch.showTodos());

addEventListeners();
//showTodos();

if (remoteCouch) {
  sync();
}
*/
