(function () {
	var Game = function (screenId) {
		var canvas = document.getElementById(screenId);
		var screen = canvas.getContext("2d");
		var gameSize = {x: canvas.width, y: canvas.height};

		this.bodies = [new Player(this, gameSize)].concat(createInvaders(this, gameSize));

		var self = this;
		loadSound(["shoot", "win", "loose"], function (sounds) {
			self.sounds = sounds;
			self.ended = false;

			var tick = function () {
				self.update();
				self.draw(screen, gameSize);
				if(!this.ended){
					requestAnimationFrame(tick);
				}
			};
			tick();
		});
	};

	Game.prototype = {
		update : function(){
			var bodies = this.bodies;
			function notCollidingWithAnything(b1) {
				return bodies.filter(function (b2) {
					return doCollide(b1, b2);
				}).length === 0;
			}

			this.bodies = this.bodies.filter(notCollidingWithAnything);

			for (var i = 0; i < this.bodies.length; i++) {
				this.bodies[i].update();
			}
		},
		draw: function (screen, gameSize) {
			screen.clearRect(0, 0, gameSize.x, gameSize.y);

			// clear away bullets outside screen from bodies
			function bulletOutsideScreen (b) {
				var isBullet = b instanceof Bullet;
				var outside = b.center.y < 0 || b.center.y > gameSize.y;					
				return !(isBullet && outside);
			}

			this.bodies = this.bodies.filter(bulletOutsideScreen);
		
			for (var i = 0; i < this.bodies.length; i++) {
				drawRect(screen, this.bodies[i]);
			}
			if(!(this.bodies[0] instanceof Player)){
				this.gameOver(false, screen);
			}
			if(this.bodies.length === 1){
				this.gameOver(true, screen);
			}
		},
		addBody: function (body) {
			this.bodies.push(body);
		},
		invadersBelow : function (invader) {
			return this.bodies.filter(function (b) {
				return b instanceof Invader && 
					b.center.y > invader.center.y &&
					Math.abs(b.center.x - invader.center.x) < invader.size.x/2;
			}).length > 0;
		},
		gameOver: function (userWon, screen) {		
			screen.font="30px Georgia";
			var txt = !userWon ? "You Loose!" : "You Win!";
			var txtSize = screen.measureText(txt);
			screen.strokeText(txt, screen.canvas.width / 2 - (txtSize.width/2), screen.canvas.height/2-15);
			(!userWon ? this.sounds.loose : this.sounds.win).play();
			this.ended = true;
		}
	};

	var Player = function (game, gameSize) {
		this.game = game;
		this.size = {x:15, y:15};
		this.center = {x: gameSize.x/2, y: gameSize.y - this.size.y};
		this.keyboarder = new Keyboarder();
		this.spaceUp = true;
	};
	Player.prototype = {
		update: function () {
			if(this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)){
				this.center.x -= 2;
			}
			if(this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)){
				this.center.x += 2;
			}
			if(this.spaceUp && this.keyboarder.isDown(this.keyboarder.KEYS.SPACE)){
				this.spaceUp = false;
				var bullet = new Bullet({x: this.center.x, y: this.center.y - this.size.y/2 }, {x: 0, y: -6});
				this.game.addBody(bullet);
				this.game.sounds.shoot.load();
				this.game.sounds.shoot.play();
			}
			if(!this.keyboarder.isDown(this.keyboarder.KEYS.SPACE)){
				this.spaceUp = true;
			}
		}
	};

	var Bullet = function (center, velocity) {
		this.size = {x:2, y:2};
		this.center = center;
		this.velocity = velocity;
	};
	Bullet.prototype = {
		update: function () {
			this.center.x += this.velocity.x;
			this.center.y += this.velocity.y;
		}
	};

	var Invader = function (game, gameSize, center) {
		this.game = game;
		this.gameSize = gameSize;
		this.size = {x:15, y:15};
		this.center = center;
		this.patrolX = 0;
		this.speedX = 0.3;
	};
	Invader.prototype = {
		update: function () {
			if (this.patrolX < -20 || this.patrolX > 50) {
				this.speedX = -this.speedX;
			}
			this.center.x += this.speedX;
			this.patrolX +=  this.speedX;

			if (Math.random() > 0.995 && !this.game.invadersBelow(this)) {
				var bullet = new Bullet({
					x:this.center.x, 
					y:this.center.y+this.size.y/2},
					{x:Math.random() - 0.5, y: +2});
				this.game.addBody(bullet);
			}
		}
	};

	var Keyboarder = function () {
		var keyState = {};

		window.onkeydown = function (e) {
			keyState[e.keyCode] = true;
		};
		window.onkeyup = function (e) {
			keyState[e.keyCode] = false;
		};

		this.isDown = function (keyCode) {
			return keyState[keyCode] === true;
		};

		this.KEYS =  { LEFT: 37, RIGHT: 39, SPACE: 32 };
	};

	// functions
	var doCollide = function (b1, b2) {
		return !(b1 === b2 ||
				b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
				b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
				b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
				b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2);
	};

	var createInvaders = function (game, gameSize) {
		var invaders = [];
		for (var i = 0; i < 24; i++) {
			var x = 30 + (i % 8) * 30 ;
			var y = 30 + (i % 3) * 30 ;
			invaders.push(new Invader(game, gameSize, {x: x, y:y}));
		}
		return invaders;
	};

	var drawRect = function (screen, body) {
		screen.fillRect(body.center.x - body.size.x/2,
						body.center.y - body.size.y/2,
						body.size.x, body.size.y);
	};

	var loadSound = function (soundNames, callback) {
		var sounds = {}, counter = soundNames.length;
		var loaded = function (audio, name) {
			sounds[name] = audio;
			counter--;
		 	audio.removeEventListener('canplaythrough', loaded);
		 	if(counter === 0){ callback(sounds); }
		};
		soundNames.forEach(function (name) {
			var audio = new Audio('sound/' + name + '.wav');
			audio.addEventListener('canplaythrough', loaded.bind(this, audio, name));
			audio.load();
		});
	};

	window.onload = function () {
		window.game = new Game("screen");
	};
}());