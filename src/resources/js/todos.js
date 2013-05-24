$(function(){
		//==========Model============
		var Todo = Backbone.Model.extend({
				//Default attributes
				defaults: function(){
						return {
								title: "empty todo",
								order: Todos.nextOrder(),
								done: false
						};
				},

				//Toggle the done field of this todo item
				toggle: function() {
						this.save({done: !this.get("done")}, {patch: true});
				}
		});

		//==========Collection============
		//The collection of todos, stored in localStorage instead of a remote server
		var TodoList = Backbone.Collection.extend({
				//Link this collection to a model
				model: Todo,
				//Save all of the items into a LocalStorage with the todos-backbone namespace
				//localStorage: new Backbone.LocalStorage("todos-backbone"),
				//Use the node.js app I made as the storage
				url: '/todos_v1',

				//Filter for finished todos
				done: function() {
						return this.where({done: true});
				},
				//Filter for unfinished todos
				remaining: function(){
						return this.without.apply(this, this.done());
						//return this.where({done: false}); //would also work
				},
				//Generate a new number based on insertion order
				nextOrder: function(){
						if(!this.length) return 1; //start at 1
						return this.last().get('order') + 1; //otherwise increment last element
				},
				//Todos are sorted by their original insertion order
				comparator: 'order'
		});

		//Create our global list of Todos
		var Todos = new TodoList;

		//==========Item View============
		var TodoView = Backbone.View.extend({
				//This is a list item
				//By default, views are divs
				tagName: 'li',

				//Use the contents of the elt with id item-template for a template
				template: _.template($('#item-template').html()),

				//Specify the events for this view
				events: {
						'click .toggle' : 'toggleDone', //when .toggle is clicked, call toggleDone
						'dblclick .view' : 'edit',
						'click .destroy' : 'clear',
						'keypress .edit' : 'updateOnEnter',
						'blur .edit' : 'close'
				},

				//Since there is a 1-to-1 ratio of Todo Models and this view, we will just
				//  directly link the model to the view
				//--model is set on view creation
				initialize: function(){
						//listenTo is used instead of On so that the reference to the event handler
						//  will be cleaned up properly
						//Instead of the model holding on to the event handler, the view does, so that on
						//  remove, it will be cleaned up properly
						this.listenTo(this.model, 'change', this.render);
						this.listenTo(this.model, 'destroy', this.remove);
				},

				//(re)render this todo item
				//render needs to update the el field for this view
				//  by convention, returning itself to facilitate chained calls
				render: function(){
						//this.el -- DOM element for this fiew
						//this.$el -- jquery wrapped this.el
						this.$el.html(this.template(this.model.toJSON()));
						this.$el.toggleClass('done', this.model.get('done'));
						this.input = this.$('.edit');
						//not required, but allows for chained calls
						// and is a convention with backbone
						return this;
				},

				toggleDone: function(){
						this.model.toggle();
				},

				edit: function(){
						this.$el.addClass('editing');
						this.input.focus();
				},

				//Finish editing
				close: function() {
						var value = this.input.val();
						if(!value){
								//Destroy this todo if we empty it out
								this.clear();
						}else{
								this.model.save({title: value}, {patch: true});
								this.$el.removeClass('editing');
						}
				},

				//When enter is hit while editing, save
				updateOnEnter: function(e){
						if(e.keyCode == 13) this.close();
				},

				//Delete this TODO
				clear: function(){
						this.model.destroy();
				}
		});

		//==========App View============
		var AppView = Backbone.View.extend({
				//Bind to an existing element instead of creating a new one
				//  Everything generally is within this element
				el: $('#todoapp'),
				//Statistics template for stats at bottom of app
				statsTemplate: _.template($('#stats-template').html()),
				//Delegated events for creating/clearing items
				events: {
						'keypress #new-todo': 'createOnEnter',
						'click #clear-completed': 'clearCompleted',
						'click #toggle-all': 'toggleAllComplete'
				},
				//On init, bind relavent events on the Todos collection
				//  for when items are added/changed
				//Also load any preexisting todos
				initialize: function(){
						this.input = this.$('#new-todo');
						this.allCheckbox = this.$('#toggle-all')[0];

						this.listenTo(Todos, 'add', this.addOne);
						//reset is for replacing a whole collection instead of adding/removing one at a time
						this.listenTo(Todos, 'reset', this.addAll);
						//all is to listen to all events, the first arg is the event name
						this.listenTo(Todos, 'all', this.render);
						//"add" (model, collection) — when a model is added to a collection.
						//"remove" (model, collection) — when a model is removed from a collection.
						//"reset" (collection) — when the collection's entire contents have been replaced.
						//"change" (model, collection) — when a model's attributes have changed.
						//"change:[attribute]" (model, collection) — when a specific attribute has been updated.
						//"destroy" (model, collection) — when a model is destroyed.
						//"error" (model, collection) — when a model's validation fails, or a save call fails on the server.
						//"route:[name]" (router) — when one of a router's routes has matched.
						//"all" — this special event fires for any triggered event, passing the event name as the first argument.

						this.footer = this.$('footer');
						this.main = $('#main');

						Todos.fetch();
				},

				//Rerendering app just means refreshing statistics, items take care of themselves
				render: function(){
						var done = Todos.done().length;
						var remaining = Todos.remaining().length;

						if(Todos.length){
								this.main.show();
								this.footer.show();
								this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
						}else{
								this.main.hide();
								this.footer.hide();
						}

						this.allCheckbox.checked = !remaining;
				},

				//Add a single todo item to the list
				//Creates the view, renders it, and appends it to the main ul
				addOne: function(todo){
						var view = new TodoView({model: todo});
						this.$('#todo-list').append(view.render().el);
				},

				createOnEnter: function(e){
						if(e.keyCode != 13) return;
						if(!this.input.val()) return;

						Todos.create({title: this.input.val()});
						this.input.val('');
				},

				//Clear all done todo items, destroying their models
				clearCompleted: function(){
						//call a method on each object in the passed in list
						//  any additional args are passed to method
						//ex: this calls <todo>.destroy on all Todos
						_.invoke(Todos.done(), 'destroy');
						return false;
				},

				toggleAllComplete: function(){
						var done = this.allCheckbox.checked;
						Todos.each(function(todo) { todo.save({'done': done}, {patch: true}); });
						//Todos.each(function(todo) { todo.save({'done': done}, {wait: true}); });
						//Todos.sync();
				}
		});

		//Kick things off by creating the app
		var App = new AppView;
});