var http = require('http');
var fs = require('fs');
var url = require('url');
var _ = require('underscore');
var Backbone = require('backbone');
var mime = require('mime');

var todos = [];
var apiLoc = "/todos_v1";

//Generates a closed over counter
//  defaults to starting at 0, otherwise starts at passed in value
function makeCounter(start){
		if(typeof(start) == 'undefined'){
				start = 0;
		}
		var next = start;
		return function(){
				return next++;
		};
}

var getNextId = makeCounter(1);

function jsonHead(res){
		res.setHeader('Content-Type', 'application/json');
}

function findTodoById(id){
		if(typeof(id) == undefined) return undefined;
		//Find returns a reference to the actual object, so can be modified in place
		return _.find(todos, function(elt){return elt.id == id});
}

function addOrUpdateTodo(todo){
		var existing = findTodoById(todo.id);
		if(existing){
				_.extend(existing, todo);
				return existing;
		}else{
				todos.push(todo);
				return todo;
		}
}

function deleteTodo(id){
		todos = _.reject(todos, function(elt){return elt.id == id});
}

function todoFetch(req, res){
		//  /collection[/id]
		var reqUrl = url.parse(req.url);
		var urlParts = reqUrl.path.split('/');
		console.log('GET');
		if(urlParts.length == 3){
				var found = findTodoById(urlParts[2]);
				if(typeof(found) == 'undefined'){
						res.writeHead(404);
						res.end();
				}else{
						jsonHead(res);
						res.writeHead(200);
						res.end(JSON.stringify(found));
				}
		}else{
				jsonHead(res);
				res.writeHead(200);
				res.end(JSON.stringify(todos));
		}
}

function todoCreate(req, res){
		//Create
		//  /collection
		console.log('POST');
		req.on('data', function (data){
				data = JSON.parse(data.toString());
				if(typeof(data.id) == 'undefined'){
						data['id'] = getNextId();
				}
				addOrUpdateTodo(data);
				console.log("Data: %j", data);
				console.log("todos: %j", todos);

				jsonHead(res);
				res.writeHead("201", {"Location": apiLoc + "/" + data.id});
				//Need to return the object created, including the ID for backbone to process it properly
				res.end(JSON.stringify(data));
		});
}

function todoPatch(req, res){
		//Patch
		// /collection/id
		console.log('PATCH');
		var reqUrl = url.parse(req.url);
		var id = reqUrl.path.split('/')[2];
		req.on('data', function(data){
				data = JSON.parse(data.toString());
				console.log("Data: %j", data);
				var existing = findTodoById(id);
				existing = _.extend(existing, data);
				res.writeHead("200");
				res.end(JSON.stringify(existing));
		});
}

function todoUpdate(req, res){
		//Update
		//  /collection/id
		console.log('PUT');
		req.on('data', function(data){
				data = JSON.parse(data.toString());
				console.log("Data: %j", data);
				console.log("todos: %j", todos);
				data = addOrUpdateTodo(data);
				res.writeHead("200");
				res.end(JSON.stringify(data));
		});
}

function todoDelete(req, res){
		//  /collection/id
		console.log('DELETE');
		var reqUrl = url.parse(req.url);
		var id = reqUrl.path.split('/')[2];
		deleteTodo(id);
		console.log("todos: %j", todos);
		res.writeHead("200");
		res.end("deleted");
}

function handleAPICall(req, res){
		var method = req.method;
		var APIMethodHandlers = {"GET": todoFetch,
														 "POST": todoCreate,
														 "PUT": todoUpdate,
														 "PATCH": todoPatch,
														 "DELETE": todoDelete};

		try{
				APIMethodHandlers[method](req, res);
		}catch(e){
				res.writeHead(500);
				res.end("Invalid request type");
		}
}

function handler(req, res){
		var reqUrl = url.parse(req.url);
		if(reqUrl.pathname.indexOf(apiLoc) == 0){
				console.log('api call');
				handleAPICall(req, res);
		}else{
				var path = reqUrl.pathname;
				if(path == '/'){
						path = "todos.html";
				}
				if(path.indexOf('/') == 0){
						path = path.substr(1);
				}
				fs.readFile("./src/resources/" + path,
										function(err, data){
												if(err){
														console.log(err);
														res.writeHead(500);
														return res.end('Error loading file: ' + path);
												}
												res.writeHead(200, {'Content-Type' : mime.lookup(path)});
												res.end(data);
										});
		}
}

var app = http.createServer(handler);

app.listen(8000);