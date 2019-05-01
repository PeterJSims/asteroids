const FPS = 30; // Frames per second for interval
const friction = 0.7; // friction coefficient of space (0 to 1 range)
const game_lives = 3; //startinglives
const ship_size = 30; //ship size in pixels
const laser_max = 10; //maximum number of lasers on screen
const laser_speed = 500; //laser speed in pixels per second
const laser_dist = 0.6; //max laser distance as fraction of canvas width
const laser_explode_dur = 0.1; //duration of lasers exploding in seconds
const roids_num = 3; // starting asteroids
const roids_pts_lge = 20; // points scored for large asteroid
const roids_pts_med = 50; // points scored for large asteroid
const roids_pts_sml = 100; // points scored for large asteroid
const roids_jag = 0.4; // jaggedness of the asteroids (from 0 to 1)
const roids_size = 100; // starting size of asteroids in pixels
const roids_speed = 50; // starting speed of asteroids in pixels per second
const roids_vert = 10; // average number of vertices on each asteroid
const turn_speed = 360; // degrees per second
const save_key_score = 'highscore'; //local storage key
const ship_explode_dur = 0.3; //duration of explosion
const ship_inv_dur = 3; //duration of ship invulnerability
const ship_blink_dur = 0.1; //duration of ship's blink during invul.;
const ship_thrust = 5; // acceleration of pixels per second
const show_bounding = false; // show or hide collisin bounding
let sound_on = true; //sound on or off (press s to toggle)
let music_on = true; //music on or off (press m to toggle)
const text_fade_time = 2.5; //text fade time in seconds
const text_size = 40; //text font height in pixels

var canv = document.getElementById('gameCanvas');
var ctx = canv.getContext('2d');

//set up sound effects
var fxExplode = new Sound('sounds/explode.m4a');
var fxHit = new Sound('sounds/hit.m4a', 5, 0.4);
var fxThrust = new Sound('sounds/thrust.m4a');
var fxLaser = new Sound('sounds/laser.m4a', 5, 0.15);

//set up the music
var music = new Music('sounds/music-low.m4a', 'sounds/music-high.m4a');
var roidsLeft, roidsTotal;

//set up the game parameters
var level, roids, ship, text, textAlpha, scoreHigh, score;
newGame();

//Event handlers
document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

//Game loop
setInterval(update, 1000 / FPS);

function createAsteroidBelt() {
	roids = [];
	roidsTotal = (roids_num + level) * 7;
	roidsLeft = roidsTotal;
	var x, y;
	for (var i = 0; i < roids_num + level; i++) {
		do {
			x = Math.floor(Math.random() * canv.width);
			y = Math.floor(Math.random() * canv.height);
		} while (distBetweenPoints(ship.x, ship.y, x, y) < roids_size * 2 + ship.r);
		roids.push(newAsteroid(x, y, Math.ceil(roids_size / 2)));
	}
}

function destroyAsteroid(index) {
	var x = roids[index].x;
	var y = roids[index].y;
	var r = roids[index].r;

	//split the asteroid in two if necessary
	if (r === Math.ceil(roids_size / 2)) {
		roids.push(newAsteroid(x, y, Math.ceil(roids_size / 4)));
		roids.push(newAsteroid(x, y, Math.ceil(roids_size / 4)));
		score += roids_pts_lge;
	} else if (r === Math.ceil(roids_size / 4)) {
		roids.push(newAsteroid(x, y, Math.ceil(roids_size / 8)));
		roids.push(newAsteroid(x, y, Math.ceil(roids_size / 8)));
		score += roids_pts_med;
	} else {
		score += roids_pts_sml;
	}

	//check high score
	if (score > scoreHigh) {
		scoreHigh = score;
		localStorage.setItem(save_key_score, scoreHigh);
	}

	//destroy the asteroid
	roids.splice(index, 1);
	fxHit.play();

	//calculate the ratio of remaining asteroids for tempo
	roidsLeft--;
	music.setAsteroidRatio(roidsLeft === 0 ? 1 : roidsLeft / roidsTotal);

	//new level when no more asteroids
	if (roids.length === 0) {
		level++;
		newLevel();
	}
}

function distBetweenPoints(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawShip(x, y, a, color = 'white') {
	ctx.strokeStyle = color;
	ctx.lineWidth = ship_size / 20;
	ctx.beginPath();
	ctx.moveTo(
		// nose of the ship
		x + 4 / 3 * ship.r * Math.cos(a),
		y - 4 / 3 * ship.r * Math.sin(a)
	);
	ctx.lineTo(
		// rear left
		x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
	);
	ctx.lineTo(
		// rear right
		x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
	);
	ctx.closePath();
	ctx.stroke();
}

function explodeShip() {
	ship.explodeTime = Math.ceil(ship_explode_dur * FPS);
	fxExplode.play();
}

function gameOver() {
	ship.dead = true;
	text = 'GAME OVER';
	textAlpha = 1.0;
}

function keyDown(e) {
	if (ship.dead) {
		return;
	}
	switch (e.keyCode) {
		case 83: //mute sound
			sound_on = !sound_on;
			break;
		case 77: //mute music
			music_on = !music_on;
			break;
		case 32: //shoot laser
			shootLaser();
			break;
		case 37: //left
			ship.rot = turn_speed / 180 * Math.PI / FPS;
			break;
		case 38: //forward
			ship.thrusting = true;
			break;
		case 39: //right
			ship.rot = -turn_speed / 180 * Math.PI / FPS;
			break;
	}
}

function keyUp(e) {
	if (ship.dead) {
		return;
	}
	switch (e.keyCode) {
		case 32: // allow shooting again
			ship.canShoot = true;
			break;
		case 37: // stop turning left
			ship.rot = 0;
			break;
		case 38: //stop thrusting forward
			ship.thrusting = false;
			break;
		case 39: //stop turning right
			ship.rot = 0;
			break;
	}
}

function newAsteroid(x, y, r) {
	var lvlMult = 1 + 0.1 * level;
	var roid = {
		x: x,
		y: y,
		xv: Math.random() * roids_speed * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
		yv: Math.random() * roids_speed * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
		r: r,
		a: Math.random() * Math.PI * 2,
		vert: Math.floor(Math.random() * (roids_vert + 1) + roids_vert / 2),
		offs: []
	};

	// create the vertex offsets array
	for (var i = 0; i < roid.vert; i++) {
		roid.offs.push(Math.random() * roids_jag * 2 + 1 - roids_jag);
	}
	return roid;
}

function newGame() {
	level = 0;
	lives = game_lives;
	score = 0;
	ship = newShip();

	//get the high score from local storage
	var scoreStr = localStorage.getItem(save_key_score);
	if (scoreStr == null) {
		scoreHigh = 0;
	} else {
		scoreHigh = parseInt(scoreStr);
	}
	newLevel();
}

function newLevel() {
	text = `LEVEL ${level + 1}`;
	textAlpha = 1.0;
	createAsteroidBelt();
}

function newShip() {
	return {
		x: canv.width / 2,
		y: canv.height / 2,
		r: ship_size / 2,
		a: 90 / 180 * Math.PI,
		blinkNum: Math.ceil(ship_inv_dur / ship_blink_dur),
		blinkTime: Math.ceil(ship_blink_dur * FPS),
		explodeTime: 0,
		canShoot: true,
		lasers: [],
		rot: 0,
		dead: false,
		thrusting: false,
		thrust: {
			x: 0,
			y: 0
		}
	};
}

function shootLaser() {
	//create the laser object
	if (ship.canShoot && ship.lasers.length < laser_max) {
		ship.lasers.push({
			//from the nose of the ship
			x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
			y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
			xv: laser_speed * Math.cos(ship.a) / FPS,
			yv: -laser_speed * Math.sin(ship.a) / FPS,
			dist: 0,
			explodeTime: 0
		});
		fxLaser.play();
	}
	//prevent further shooting
	ship.canShoot = false;
}

function Music(srcLow, srcHigh) {
	this.soundLow = new Audio(srcLow);
	this.soundHigh = new Audio(srcHigh);
	this.low = true;
	this.tempo = 1.0; // seconds per beat
	this.beatTime = 0; //frames until next beat

	this.play = function() {
		if (music_on) {
			if (this.low) {
				this.soundLow.play();
				this.soundLow.volume = 0.5;
			} else {
				this.soundHigh.play();
				this.soundHigh.volume = 0.5;
			}
			this.low = !this.low;
		}
	};

	this.setAsteroidRatio = function(ratio) {
		this.tempo = 1.0 - 0.75 * (1.0 - ratio);
	};

	this.tick = function() {
		if (this.beatTime === 0) {
			this.play();
			this.beatTime = Math.ceil(this.tempo * FPS);
		} else {
			this.beatTime--;
		}
	};
}

function Sound(src, maxStreams = 1, vol = 0.7) {
	this.streamNum = 0;
	this.streams = [];
	for (var i = 0; i < maxStreams; i++) {
		this.streams.push(new Audio(src));
		this.streams[i].volume = vol;
	}

	this.play = function() {
		if (sound_on) {
			this.streamNum = (this.streamNum + 1) % maxStreams;
			this.streams[this.streamNum].play();
		}
	};
	this.stop = function() {
		this.streams[this.streamNum].pause();
		this.streams[this.streamNum].currentTime = 0;
	};
}

function update() {
	var blinkOn = ship.blinkNum % 2 === 0;
	var exploding = ship.explodeTime > 0;

	// tick the music
	music.tick();

	//draw space
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canv.width, canv.height);

	//thrust the ship
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += ship_thrust * Math.cos(ship.a) / FPS;
		ship.thrust.y -= ship_thrust * Math.sin(ship.a) / FPS;
		fxThrust.play();

		//draw the thruster
		if (!exploding && blinkOn) {
			ctx.fillStyle = 'yellow';
			ctx.strokeStyle = 'red';
			ctx.lineWidth = ship_size / 40;
			ctx.beginPath();
			ctx.moveTo(
				// rear left
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
			);
			//Rear center behind the ship
			ctx.lineTo(ship.x - ship.r * (5 / 3 * Math.cos(ship.a)), ship.y + ship.r * (5 / 3 * Math.sin(ship.a)));
			//Rear right
			ctx.lineTo(
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
			);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	} else {
		ship.thrust.x -= friction * ship.thrust.x / FPS;
		ship.thrust.y -= friction * ship.thrust.y / FPS;
		fxThrust.stop();
	}

	//draw ship
	if (!exploding) {
		if (blinkOn && !ship.dead) {
			drawShip(ship.x, ship.y, ship.a);
		}

		//handle blinking
		if (ship.blinkNum > 0) {
			//reduce the blink time
			ship.blinkTime--;
			//reduce the blinkNum
			if (ship.blinkTime === 0) {
				ship.blinkTime = Math.ceil(ship_blink_dur * FPS);
				ship.blinkNum--;
			}
		}
	} else {
		//draw the explosion
		ctx.fillStyle = 'darkred';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
		ctx.fillStyle = 'red';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.fillStyle = 'orange';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.fillStyle = 'yellow';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
		ctx.fill();
	}

	if (show_bounding) {
		ctx.strokeStyle = 'lime';
		ctx.beginPath();
		ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
		ctx.stroke();
	}

	//draw the lasers
	for (var i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime === 0) {
			ctx.fillStyle = 'white	';
			ctx.beginPath();
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship_size / 15, 0, Math.PI * 2, false);
			ctx.fill();
		} else {
			//draw the explosion
			ctx.fillStyle = 'grey	';
			ctx.beginPath();
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
			ctx.fill();
			ctx.fillStyle = 'white	';
			ctx.beginPath();
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
			ctx.fill();
			ctx.fillStyle = 'grey	';
			ctx.beginPath();
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.1, 0, Math.PI * 2, false);
			ctx.fill();
		}
	}

	//draw the game text
	if (textAlpha >= 0) {
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = 'rgba(255, 255, 255, ' + textAlpha + ')';
		ctx.font = `small-caps ${text_size}px Righteous `;
		ctx.fillText(text, canv.width / 2, canv.height * 0.75);
		textAlpha -= 1.0 / text_fade_time / FPS;
	} else if (ship.dead) {
		newGame();
	}

	//draw the score
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'white';
	ctx.font = ` ${text_size}px Righteous `;
	ctx.fillText(score, canv.width - ship_size / 2, ship_size);

	//draw the high score
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'white';
	ctx.font = ` ${text_size * 0.5}px Righteous `;
	ctx.fillText(`HIGHSCORE: ${scoreHigh}`, canv.width / 2, ship_size);

	//draw the lives
	var lifeColor;
	for (var i = 0; i < lives; i++) {
		lifeColor = exploding && i === lives - 1 ? 'red' : 'white';
		drawShip(ship_size + i * ship_size * 1.2, ship_size, 0.5 * Math.PI, lifeColor);
	}

	//detect laser hits
	var ax, ay, ar, lx, ly;
	for (var i = roids.length - 1; i >= 0; i--) {
		//grab the asteroid properties
		ax = roids[i].x;
		ay = roids[i].y;
		ar = roids[i].r;

		//loop over the lasers
		for (var j = ship.lasers.length - 1; j >= 0; j--) {
			//grab the laser properties
			lx = ship.lasers[j].x;
			ly = ship.lasers[j].y;

			//detect hits
			if (ship.lasers[j].explodeTime === 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {
				//destroy the asteroid and activate laser explosion
				destroyAsteroid(i);
				ship.lasers[j].explodeTime = Math.ceil(laser_explode_dur * FPS);
				break;
			}
		}
	}

	//draw the asteroids

	var x, y, r, a, vert, offs;
	for (var i = 0; i < roids.length; i++) {
		ctx.strokeStyle = 'slategrey';
		ctx.lineWidth = ship_size / 20;
		//get the asteroid properties
		x = roids[i].x;
		y = roids[i].y;
		r = roids[i].r;
		a = roids[i].a;
		vert = roids[i].vert;
		offs = roids[i].offs;

		//draw a path
		ctx.beginPath();
		ctx.moveTo(x + r * offs[0] * Math.cos(a), y + r * offs[0] * Math.sin(a));
		//draw the polygon
		for (var j = 1; j < vert; j++) {
			ctx.lineTo(
				x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
			);
		}
		ctx.closePath();
		ctx.stroke();

		if (show_bounding) {
			ctx.strokeStyle = 'lime';
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2, false);
			ctx.stroke();
		}
	}

	//check for collisions
	if (!exploding) {
		if (ship.blinkNum === 0 && !ship.dead) {
			for (var i = 0; i < roids.length; i++) {
				if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
					explodeShip();
					destroyAsteroid(i);
					break;
				}
			}
		}

		//rotate ship
		ship.a += ship.rot;

		//move ship
		ship.x += ship.thrust.x;
		ship.y += ship.thrust.y;
	} else {
		//reduce the explode time
		ship.explodeTime--;
		//reset the ship after explosion
		if (ship.explodeTime === 0) {
			lives--;
			if (lives === 0) {
				gameOver();
			} else {
				ship = newShip();
			}
		}
	}

	//handle the edge of the screen
	if (ship.x < 0 - ship.r) {
		ship.x = canv.width + ship.r;
	} else if (ship.x > canv.width + ship.r) {
		ship.x = 0 - ship.r;
	}
	if (ship.y < 0 - ship.r) {
		ship.y = canv.height + ship.r;
	} else if (ship.y > canv.height + ship.r) {
		ship.y = 0 - ship.r;
	}

	//move the lasers
	for (var i = ship.lasers.length - 1; i >= 0; i--) {
		//check distance travelled
		if (ship.lasers[i].dist > laser_dist * canv.width) {
			ship.lasers.splice(i, 1);
			continue;
		}

		//handle the explosion
		if (ship.lasers[i].explodeTime > 0) {
			ship.lasers[i].explodeTime--;

			//destroy the laser after the duration is up
			if (ship.lasers[i].explodeTime === 0) {
				ship.lasers.splice(i, 1);
				continue;
			}
		} else {
			//move the lasers themselves
			ship.lasers[i].x += ship.lasers[i].xv;
			ship.lasers[i].y += ship.lasers[i].yv;

			//calculate the distance travelled
			ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
		}
		//handle edge of screen
		if (ship.lasers[i].x < 0) {
			ship.lasers[i].x = canv.width;
		} else if (ship.lasers[i].x > canv.width) {
			ship.lasers[i].x = 0;
		}
		if (ship.lasers[i].y < 0) {
			ship.lasers[i].y = canv.height;
		} else if (ship.lasers[i].y > canv.height) {
			ship.lasers[i].y = 0;
		}
	}

	//move the asteroids
	for (var i = 0; i < roids.length; i++) {
		roids[i].x += roids[i].xv;
		roids[i].y += roids[i].yv;

		//handle edge of screen
		if (roids[i].x < 0 - roids[i].r) {
			roids[i].x = canv.width + roids[i].r;
		} else if (roids[i].x > canv.width + roids[i].r) {
			roids[i].x = 0 - roids[i].r;
		}
		if (roids[i].y < 0 - roids[i].r) {
			roids[i].y = canv.height + roids[i].r;
		} else if (roids[i].y > canv.height + roids[i].r) {
			roids[i].y = 0 - roids[i].r;
		}
	}
	//center
	ctx.fillStyle = 'red';
	// ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
}
