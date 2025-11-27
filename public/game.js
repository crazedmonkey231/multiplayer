const socket = io(); // connects back to the server that served the page

const config = {
  type: Phaser.WEBGL,
  parent: "phaser-parent",
  canvas: undefined, // Phaser creates its own canvas
  transparent: true,
  fps: {
    min: 60,
    target: 75,
    smoothStep: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%",
  },
  dom: {
    createContainer: true,
  },
  backgroundColor: "#ffffffff",
  physics: {
    default: "arcade",
  },
  scene: {
    preload,
    create,
    update,
  },
};

const game = new Phaser.Game(config);

let cursors;
let otherKeys;
let playerSprites = {}; // { id: phaserSprite }

let syncTimer = 0;
let myId = null;
let lastInputState = { up: false, down: false, left: false, right: false };

function preload() {}

function create() {
  cursors = this.input.keyboard.createCursorKeys();
  otherKeys = this.input.keyboard.addKeys({
    W: Phaser.Input.Keyboard.KeyCodes.W,
    A: Phaser.Input.Keyboard.KeyCodes.A,
    S: Phaser.Input.Keyboard.KeyCodes.S,
    D: Phaser.Input.Keyboard.KeyCodes.D,
  });

  // Listen for initial players
  socket.on("currentPlayers", (players) => {
    myId = socket.id;
    for (const id in players) {
      addOrUpdatePlayerSprite(this, id, players[id]);
    }
  });

  // New player joins
  socket.on("newPlayer", (player) => {
    addOrUpdatePlayerSprite(this, player.id, player);
  });

  // Player disconnects
  socket.on("playerDisconnected", (id) => {
    if (playerSprites[id]) {
      playerSprites[id].destroy();
      delete playerSprites[id];
    }
  });

  // Regular state updates
  socket.on("stateUpdate", (players) => {
    for (const id in players) {
      addOrUpdatePlayerSprite(this, id, players[id]);
    }

    // Remove sprites that no longer exist on server
    for (const id in playerSprites) {
      if (!players[id]) {
        playerSprites[id].destroy();
        delete playerSprites[id];
      }
    }
  });
}

function update(time, delta) {
  const ms = delta / 1000;

  // Gather input state
  const inputState = {
    up: cursors.up.isDown || otherKeys.W.isDown,
    down: cursors.down.isDown || otherKeys.S.isDown,
    left: cursors.left.isDown || otherKeys.A.isDown,
    right: cursors.right.isDown || otherKeys.D.isDown,
  };

  // Only emit when input actually changes
  if (!sameInput(inputState, lastInputState)) {
    socket.emit("playerInput", inputState);
    lastInputState = inputState;
  }

  // Periodic sync
  syncTimer += ms;
  if (syncTimer >= 0.1) {
    syncTimer = 0;
    playerState = {
      inputState: inputState
    }
    socket.emit("playerStateUpdate", playerState);
    lastInputState = inputState;
  } else {
    return;
  }
}

function addOrUpdatePlayerSprite(scene, id, playerData) {
  let sprite = playerSprites[id];

  if (!sprite) {
    sprite = scene.add.circle(playerData.x, playerData.y, 12, 0xffffff);
    if (id === myId) {
      // Make your own player a different color
      sprite.setFillStyle(0x00ff00);
    } else {
      sprite.setFillStyle(0xff0000);
    }
    playerSprites[id] = sprite;
  } else {
    sprite.x = playerData.x;
    sprite.y = playerData.y;
  }
}

function sameInput(a, b) {
  return (
    a.up === b.up &&
    a.down === b.down &&
    a.left === b.left &&
    a.right === b.right
  );
}
