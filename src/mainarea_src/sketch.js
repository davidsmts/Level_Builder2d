/**
* @Author: David Schmotz <David>
* @Date:   2018-05-01T20:06:17+02:00
* @Email:  davidschmotz@gmail.com
* @Filename: sketch.js
* @Last modified by:   David
* @Last modified time: 2018-10-01T23:50:57+02:00
*/

//"use strict";

const xml2json = require("xml2json");
const fs = require('fs');
const {ipcRenderer} = require("electron");
const maps = require('../assets/typeMaps');
const BLOCK_ATTRIBUTES = maps.block_attributes
// const actions = require('./actions');


//  global vars that are getting edited by outside aka. public smh
const STANDARD_ZOOM = 50;
let CubeWidthAndHeight = STANDARD_ZOOM;
let CurrentZoomLevel = 1.0;
let LevelWidth = 1000;
let LevelHeight = 1000;
let Path = "";
// let SpritePositions = new Array();
// let SpriteTypes = new Array();
let Sprites = new Array()
let Interactives = new Array()
var Header = new Array()


const Level = (path) => {
  return new Promise((resolve, reject) => {
    //const path  = __dirname + '/output2.xml';
    console.log(path);
    fs.readFile(path, function(err, data) {
      var options = {
        object: true,
        reversible: false,
        coerce: false,
        sanitize: true,
        trim: true,
        arrayNotation: false,
        alternateTextNode: false
      };
      let json = xml2json.toJson(data, options)
      resolve(json)
    });
  })
}



function sketch(p) {

  //  function dependant constants
  let NORMAL_TEXTURE;
  let WOOD_TEXTURE;
  let STONE_TEXTURE;
  let PLAYER_TEXTURE;
  let FINISH_TEXTURE;
  let OPPONENT1_TEXTURE;
  let WAYPOINT_TEXTURE;
  let GRASS_TEXTURE;
  let DIRT_TEXTURE;
  let CHECKPOINT_TEXTURE;
  let FIRE_TEXTURE;
  let SPIKE_TEXTURE;
  let COIN_TEXTURE;
  let COLLECTABLE_TEXTURE;

  //  constants
  const PARENT_ID = "p5Area";
  const CANVAS_CLASSNAME = "sketch";

  //  generel global vars
  let opponentIdCounter = 0;
  let canvas;
  let selectedBlockType = "normal_block";
  let selectedBackground = "dirt.png";
  let waypointLogic = {
    createdBlocksCounter: 0,
    preWaypointBlockType: "",
    opponentsId: 0
  }
  let menuLogic = {
    currentMenuIndex: 0,
    currentMenuType: ""
  }
  let sketchElement
  let sketchPosition
  let sketchSize
  let parentElement
  let bgDisplay
  let currentLayer = 0
  let currentBackgroundTexturesPath = ""
  let backgroundImages = new Array()

  p.preload = () => {
    //initialising constants
    NORMAL_TEXTURE = p.color("#cc6600ff")
    WOOD_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.wood_block.imagePath);
    STONE_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.stone_block.imagePath);
    PLAYER_TEXTURE = p.color("#00c800ff")
    FINISH_TEXTURE = p.color("#ff0000ff")
    OPPONENT1_TEXTURE = p.color("#000000ff")
    WAYPOINT_TEXTURE = p.color("#7e33d4ff")
    GRASS_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.grass_block.imagePath);
    DIRT_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.dirt_block.imagePath);
    SPIKE_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.spike_block.imagePath);
    console.log(SPIKE_TEXTURE)
    FIRE_TEXTURE = "00FF00"
    CHECKPOINT_TEXTURE = p.color("#32b464ff")
    COIN_TEXTURE = p.loadImage(BLOCK_ATTRIBUTES.coin.imagePath);
    COLLECTABLE_TEXTURE = p.color(0, 255, 0)
  }

  p.setup = () => {
    // Create the canvas
    canvas = p.createCanvas(LevelWidth, LevelHeight);
    canvas.parent(PARENT_ID);
    canvas.id(CANVAS_CLASSNAME);
    sketchElement = document.getElementById(CANVAS_CLASSNAME)
    sketchPosition = p.createVector(sketchElement.offsetLeft, sketchElement.offsetTop)
    sketchSize = p.createVector(sketchElement.width, sketchElement.height)
    parentElement = document.getElementById(PARENT_ID);
    bgDisplay = document.getElementById("bg-display")
    renderStatusBar()
    p.noLoop();
  }


  //
  //
  //
  p.draw = () => {
    p.background(200);
    p.fill(255);
    // console.log("draw: " + LevelHeight + " - " + LevelWidth)
    //  Draw Vertical Lines
    for (var i=0; i<LevelWidth; i+=CubeWidthAndHeight) {
      p.line(i, 0, i, LevelHeight);
    }
    //  Draw Horizontal Lines
    for (var i=0; i<LevelHeight; i+=CubeWidthAndHeight) {
      p.line(0, i, LevelWidth, i);
    }

    //  Draw Sprites
    for (let sprite of Sprites) {
      drawSprite(sprite)
    }

    //  Draw Interactives
    for (let interactive of Interactives) {
      drawInteractive(interactive)
    }

    // for (let sprite of Sprites) {
    //   if (sprite.layer == currentLayer) {
    //     drawSprite(sprite)
    //   }
    // }
  }


  //  draws passed sprite
  //
  const drawSprite = (sprite) => {
    p.push()
    let position = sprite.position
    //  renderPosition is the position at which the cube is to be displayed in the Builder
    //  because the position is 50:1 while we actually need it to be zoom:1
    let renderPosition = p.createVector(position.x * CurrentZoomLevel, position.y * CurrentZoomLevel)
    let {hasImage, texture} = getTextureOfElement(sprite);
    if (hasImage) { //  width and height get set into relation of the images size
      let width = (texture.width / 32) * CubeWidthAndHeight
      let height = (texture.height / 32) * CubeWidthAndHeight
      if (sprite.layer != currentLayer) {
        p.tint(255, 127)
      }

      p.image(texture, renderPosition.x, renderPosition.y, width, height)
    } else {
      // console.log("at fill")
      if (sprite.layer != currentLayer) {
        p.fill(p.unhex(texture));
      } else {
        p.fill(texture)
      }

      p.rect(renderPosition.x, renderPosition.y, CubeWidthAndHeight, CubeWidthAndHeight);
    }

    p.pop();
  }

  //  draws a passed interactive
  //
  const drawInteractive = (interactive) => {
    p.push();

    //  renderPosition is the position at which the cube is to be displayed in the Builder
    //  because the position is 50:1 while we actually need it to be zoom:1
    let renderPosition = p.createVector(interactive.position.x * CurrentZoomLevel, interactive.position.y * CurrentZoomLevel)
    let {hasImage, texture} = getTextureOfElement(interactive);
    if (hasImage) {
      let width = (texture.width / 32) * CubeWidthAndHeight
      let height = (texture.height / 32) * CubeWidthAndHeight
      p.image(texture, renderPosition.x, renderPosition.y, width, height)
    } else {
      p.fill(texture);
      p.rect(renderPosition.x, renderPosition.y, CubeWidthAndHeight, CubeWidthAndHeight);
    }

    if (interactive.additionals != undefined && interactive.additionals != null && interactive.additionals instanceof Array) {
      if (interactive.additionals.length >= 1) {
        for (let additional of interactive.additionals) {
          if (additional.draw) {  //  Because some additionals are not supposed to be drawn
            let additonalRenderPosition = p.createVector(additional.xPosition * CurrentZoomLevel, additional.yPosition * CurrentZoomLevel)
            let {hasImage, texture} = getTextureOfElement(additional);
            if (hasImage) {
              let width = (texture.width / 32) * CubeWidthAndHeight
              let height = (texture.height / 32) * CubeWidthAndHeight
              p.image(texture, additonalRenderPosition.x, additonalRenderPosition.y, width, height)
            } else {
              p.fill(texture);
              //  + zoom * 25 damit die ellipse in der mitte ist
              p.ellipse(additonalRenderPosition.x + CurrentZoomLevel * 25, additonalRenderPosition.y + CurrentZoomLevel * 25, CubeWidthAndHeight/2, CubeWidthAndHeight/2);
            }
          } else {
            console.log("draw additional")
            console.log(additional)
            p.fill(0)
            p.textSize(20)
            p.text(additional.value, renderPosition.x + 20, renderPosition.y + 30)
          }
        }
      }
    }
    p.pop();
  }


  //  Called when you press anything on the Electron Window what means that everything outside
  //  the sketch has to be catched
  p.mousePressed = () => {
    const mouse = p.createVector(p.mouseX, p.mouseY);
    if (rectContains(sketchPosition, sketchSize, mouse)) {
      // console.log("in bound")
      handleBlock(mouse)
    } else {
      console.log("not in bounds")
    }
  }

  p.touchMoved = (touch) => {
    const mouse = p.createVector(p.mouseX, p.mouseY);
    if (rectContains(sketchPosition, sketchSize, mouse)) {
      let shiftIsPressed = touch.shiftKey
      // console.log(shiftIsPressed)
      // console.log(mouse)
      // console.log(p.mouseY)
      handleDragBlock(mouse, shiftIsPressed)
    } else {
      console.log("not in bounds")
    }

  }


  //
  //
  const showMenu = (index) => {
    console.log(index)
    let type = Interactives[index].type
    console.log(type)
    let defaultActions = ["Delete", "Close"]
    let actionMenu = document.getElementById("action_menu")
    let specificActions = maps.ACTION_MENU[type]
    let actions = defaultActions.concat(specificActions)
    for (let data of actions) {
      var button = document.createElement("div");
      var node = document.createTextNode(data)
      button.appendChild(node)
      button.classList.add("topBut")
      let action = actionForIdentifier(data)
      console.log(action)
      button.addEventListener("click", () => {
        console.log(data)
        action(index)
        flushMenu();
      });
      actionMenu.appendChild(button)
    }
  }


  //
  //
  const setRadius = () => {
    checkIfHeaderContains("sight_radius")
    let headerElement = Object.assign({}, maps.DEFAULT_HEADER_ELEMENT)
    Header.push()
  }


  //
  //
  const startOrderSetting = (index) => {
    menuLogic.currentMenuIndex = index
    menuLogic.currentMenuType = "order"
    let generelInputContainer = document.getElementById("generelInput_container");
    generelInputContainer.style.display = "inline-block"
  }

  //
  //
  const setOrder = (value) => {
    let position = p.createVector(0,0)
    createAdditional(position, value, menuLogic.currentMenuIndex, menuLogic.currentMenuType)
  }


  //
  //
  const flushMenu = () => {
    let actionMenu = document.getElementById("action_menu")
    console.log(actionMenu.children)
    while (actionMenu.firstChild) {
      actionMenu.removeChild(actionMenu.firstChild);
    }  }


    //
    let defaultAction = (index) => {
      console.log(index)
      console.log("default action")
    }


    //
    const actionForIdentifier = (action) => {

      switch (action) {
        case "Waypoint":
        console.log("Waypoint")
        return startWaypointSetting
        break;
        case "Delete":
        console.log("Delete")
        return removeObject
        break;
        case "Close":
        console.log("Delete")
        return flushMenu
        break;
        case "Set Radius":
        console.log("Set Radius")
        return setRadius
        break;
        case "Set Order":
        console.log("Set Order")
        return startOrderSetting
        break;
        default:
        console.log("default")
        return defaultAction
        break;
      }

    }


    //
    const handleDragBlock = (point, deleteOnly) => {
      const renderedPoint = p.createVector(point.x * CurrentZoomLevel, point.y * CurrentZoomLevel)
      const toRoundX = renderedPoint.x % 50;
      const toRoundY = renderedPoint.y % 50;
      const x = renderedPoint.x - toRoundX;
      const y = renderedPoint.y - toRoundY;
      const blockPosition = p.createVector(x,y);
      let {doesContain, index, container} = doesPointExist(blockPosition)
      //  Waypoints must be set over other blocks as well
      if (selectedBlockType == "waypoint") {
        return;
      } else if (selectedBlockType == "background") {
        createEnvironment(blockPosition)
        return;
      }

      if (!doesContain && !deleteOnly) { //  doesnt already contain the block
        createNewBlock(blockPosition)
      } else if (doesContain && deleteOnly) {            //  already contains the block
        console.log(container)
        if (container == "Objects") {
          handleExistingObjectClick(blockPosition, index)
        } else if (container == "Elements") {
          removeElement(index);
        } else {
          console.log("unknown collection returned in handleBlock");
        }
      }
      p.redraw();
    }


    //
    const handleBlock = (point) => {
      console.log("hanldeblock")
      const renderedPoint = p.createVector(point.x * CurrentZoomLevel, point.y * CurrentZoomLevel)
      const toRoundX = renderedPoint.x % 50;
      const toRoundY = renderedPoint.y % 50;
      const x = renderedPoint.x - toRoundX;
      const y = renderedPoint.y - toRoundY;
      const blockPosition = p.createVector(x,y);
      let {doesContain, index, container} = doesPointExist(blockPosition)
      //  Waypoints must be set over other blocks as well
      if (selectedBlockType == "waypoint") {
        createNewBlock(blockPosition)
        return;
      } else if (selectedBlockType == "background") {
        createEnvironment(blockPosition)
        return;
      }

      if (!doesContain) { //  doesnt already contain the block
        createNewBlock(blockPosition)
      } else {            //  already contains the block
        console.log(container)
        if (container == "Objects") {
          handleExistingObjectClick(blockPosition, index)
        } else if (container == "Elements") {
          removeElement(index);
        } else {
          console.log("unknown collection returned in handleBlock");
        }
      }
      p.redraw();
    }


    //
    //
    const createNewBackground = (position) => {
      console.log(selectedBackground)

    }


    //  this function creates a new block at the given position
    //  blockPos : p.Vector2d => position(x and y) of the new block in pixels
    const createNewBlock = (blockPos) => {
      //console.log("createNewBlock")
      let attributes = Object.assign({}, BLOCK_ATTRIBUTES[selectedBlockType])
      if (attributes.collection == "environment") {
        createEnvironment(blockPos)
      } else if (attributes.collection == "interactive") {
        if (attributes.isAdditional) {  // also means that it has to be a waypoint
          createAdditional(blockPos, "", waypointLogic.opponentsId, "waypoint")
        } else {
          createInteractive(blockPos)
        }
      } else {
        console.log("unknown collection")
      }
      p.redraw();
    }

    //  Creates a new Interactive at the given position
    const createInteractive = (position) => {
      console.log(position)
      let tempInteractive = Object.assign({}, maps.DEFAULT_LOCAL_INTERACTIVE)
      console.log(tempInteractive)
      tempInteractive.position = position
      tempInteractive.type = selectedBlockType
      tempInteractive.additionals = new Array();
      Interactives.push(tempInteractive)
    }

    //  Creates new environment element at given position with currently selectedBlockType
    const createEnvironment = (position) => {
      let tempElement = Object.assign({}, maps.DEFAULT_LOCAL_ELEMENT)
      tempElement.position = position
      let name = selectedBlockType == "background" ? selectedBlockType : selectedBackground
      tempElement.type = selectedBlockType
      tempElement.layer = currentLayer
      tempElement.filename = selectedBlockType == "background" ? selectedBackground : ""
      Sprites.push(tempElement)
    }


    //  Creates a new Additional for an Interactive, that is saved in the waypointLogic,
    //  at the given position
    //
    const createAdditional = (position, value, index, type) => {
      let attributes = Object.assign({}, BLOCK_ATTRIBUTES[type])
      let canBeAdded = checkForAdditionalsOccurence(index, type, attributes.maxOccurence)
      console.log(canBeAdded)
      if (!canBeAdded) {
        return
      }
      let additional = Object.assign({}, maps.DEFAULT_ADDITIONAL)
      additional.type = type
      additional.xPosition = position.x
      additional.yPosition = position.y
      additional.pointsTo = index
      additional.pointsToType = Interactives[index].type
      additional.value = value
      additional.draw = attributes.draw
      let interactive = Interactives[index]
      if (interactive.additionals == undefined) {
        interactive.additionals = new Array();
      }
      console.log(interactive)
      console.log(additional)
      interactive.additionals.push(additional)
      //  specialCases
      if (type == "waypoint") {
        waypointLogic.createdBlocksCounter++;
        if (waypointLogic.createdBlocksCounter >= 2) {
          selectedBlockType = waypointLogic.preWaypointBlockType
          waypointLogic.createdBlocksCounter = 0
        }
      }
    }


    //  This function is called to decide wether or not to add additionals when
    //  the object is clicked.
    //
    const handleExistingObjectClick = (position, index) => {
      console.log("handleExistingObjectClick")
      let typeAttributes = maps.block_attributes[Interactives[index].type]
      if (typeAttributes.hasAdditionals) {  //  This is basically checking wether or not we need to display a menu
        showMenu(index)
      } else {
        removeObject(index)
      }
      p.redraw();
    }

    //
    //
    const removeElement = (index) => {
      console.log("removeElement")
      Sprites.splice(index, 1)
      p.redraw();
    }

    //
    //
    const removeObject = (index) => {
      console.log("removeObject")
      Interactives.splice(index, 1)
      p.redraw()
    }


    const startWaypointSetting = (index) => {
      removeWaypointsFor(index)
      waypointLogic.createdBlocksCounter = 0
      waypointLogic.preWaypointBlockType = selectedBlockType
      waypointLogic.opponentsId = index
      selectedBlockType = "waypoint"
    }

    //  Function removes Waypoints from the Additionals array of the Interactive Object
    //  at the given index. It does so by looping over the array until it finds an additional
    //  with the type: waypoint. The iterator variable "i" has to be decremented by one in
    //  that case because otherwise you would either leave out an element because the
    //  next element is now at the current "i" value which is going to be inceremented by one
    //  in the next iteration, or you could get an error because you ran out of the array if the
    //  deleted element was the last one.
    //
    const removeWaypointsFor = (index) => {
      console.log("removeWaypointsFor")
      let additionals = Interactives[index].additionals
      console.log(Interactives[index])
      if (additionals == undefined) {
        Interactives[index].additionals = new Array()
        return
      }
      for (let i = 0; i < additionals.length; i++) {
        if (additionals[i].type == "waypoint") {
          additionals.splice(i, 1);
          i--;
        }
      }
      p.redraw()
    }

    //
    //
    const interpretLevelBroker = (obj) => {
      flushCurrentLevel()
      let versionStr = obj.collection.header.info[0].value
      console.log(versionStr)
      switch (versionStr) {
        case "1":
        interpretLevelObject(obj);
        break;
        case "2":
        interpretLevelObjectV2(obj);
        break;
        default:
        console.log("!!CAN'T READ LEVEL VERSION!!")
        interpretOldLevelObject(obj)
        break;
      }
    }


    //  Loops thorugh the elements of the received xml and pushes the Values into
    //  prepared arrays
    const interpretLevelObject = (obj) => {
      console.log("interpretLevelObjectV2")
      console.log(obj)
      //  Merge different element collections
      let elements = mergeElements(obj)
      //  Read Header
      let header = obj.collection.header.info
      handleHeader(header)
      //  Fill Sprites with the parsed elements
      handleElements(elements)
      p.redraw()
    }

    //  Version with Additionals
    const interpretLevelObjectV2 = (obj) => {
      console.log("interpretLevelObjectV2")
      console.log(obj)
      //  Read Header
      let header = obj.collection.header.info
      handleHeader(header)
      //  Fill Sprites with the parsed elements
      handleElements(obj.collection.environment.element)
      //  Fill Interactives with the parsed elements
      handleInteractives(obj.collection.interactive.object)
      p.redraw()
    }

    //
    const interpretOldLevelObject = (obj) => {
      let elements = obj.elementCollection.element
      handleElements(elements)
      p.redraw()
    }

    //
    const mergeElements = (obj) => {
      let environment = obj.collection.environment.element
      let interactive = obj.collection.interactive.object
      if (environment == undefined || environment == null) {
        return interactive
      }
      if (interactive == undefined || interactive == null) {
        return environment
      }
      let elements = environment.concat(interactive)
      return elements
    }

    //
    const handleHeader = (header) => {
      Header.splice(0, Header.length)
      for (let info of header) {
        Header.push(info);
      }
      //  Adjust p5 Workspace to Header Values
      LevelWidth = parseInt(Header[1].value*CubeWidthAndHeight)
      LevelHeight = parseInt(Header[2].value*CubeWidthAndHeight)
      changeSizeOfWorkspace(LevelWidth, LevelHeight)
    }

    //
    const handleElements = (elements) => {
      if (elements == undefined || elements == null) {
        return
      }
      if (elements instanceof Array) {
        for (let element of elements) {
          //  positions get multiplied by CubeWidthAndHeight because thats how we lay out the window
          const vector = p.createVector(element.xPosition*CubeWidthAndHeight, element.yPosition*CubeWidthAndHeight)
          const type = element.type
          const layer = element.zPosition
          let tempElement = Object.assign({}, maps.DEFAULT_LOCAL_ELEMENT)
          tempElement.position = vector
          tempElement.type = type
          tempElement.layer = setWithCheck(layer, 0)
          tempElement.filename = setWithCheck(element.filename, "")
          Sprites.push(tempElement)
        }
      } else {
        //  positions get multiplied by CubeWidthAndHeight because thats how we lay out the window
        const vector = p.createVector(element.xPosition*CubeWidthAndHeight, element.yPosition*CubeWidthAndHeight)
        const type = element.type
        const layer = element.layer
        let tempElement = Object.assign({}, maps.DEFAULT_LOCAL_ELEMENT)
        tempElement.position = vector
        tempElement.type = type
        tempElement.layer = setWithCheck(layer, 0)
        tempElement.filename = setWithCheck(element.filename, "")
        Sprites.push(tempElement)
      }
    }

    //
    //
    const handleInteractives = (interactives) => {
      if (interactives == undefined || interactives == null) {
        return
      }
      if (interactives instanceof Array) {
        for (let interactive of interactives) {
          const vector = p.createVector(interactive.xPosition*CubeWidthAndHeight, interactive.yPosition*CubeWidthAndHeight)
          const type = interactive.type
          let tempInteractive = Object.assign({}, maps.DEFAULT_LOCAL_INTERACTIVE)
          tempInteractive.position = vector
          tempInteractive.type = type
          tempInteractive.additionals = handleAdditionals(interactive.additionals)
          Interactives.push(tempInteractive)
        }
      } else {
        const vector = p.createVector(interactives.xPosition*CubeWidthAndHeight, interactives.yPosition*CubeWidthAndHeight)
        const type = interactives.type
        let tempInteractive = Object.assign({}, maps.DEFAULT_LOCAL_INTERACTIVE)
        tempInteractive.position = vector
        tempInteractive.type = type
        tempInteractive.additionals = handleAdditionals(interactives.additionals)
        Interactives.push(tempInteractive)
      }
      p.redraw()
    }


    //
    //  Checks wether or not a variable is undefined and sets it in case it is
    const setWithCheck = (variable, defaultValue) => {
      if (variable == undefined || variable == null || variable == "") {
        return defaultValue
      } else {
        return variable
      }
    }


    //
    //
    const handleAdditionals = (additionals) => {
      if (additionals == undefined || additionals == null) {
        return
      }
      if (additionals instanceof Array) {
        for (let additional of additionals) {
          console.log(additional.xPosition)
          additional.xPosition = additional.xPosition*CubeWidthAndHeight
          additional.yPosition = additional.yPosition*CubeWidthAndHeight
          console.log(additional.xPosition)
          if (additional.draw == "true") {
            additional.draw = true
          } else {
            additional.draw = false
          }
        }
        return additionals
      } else {
        let newAdditionals = new Array()
        additionals.xPosition = additionals.xPosition*CubeWidthAndHeight
        additionals.yPosition = additionals.yPosition*CubeWidthAndHeight
        if (additionals.draw == "true") {
          additionals.draw = true
        } else {
          additionals.draw = false
        }
        newAdditionals.push(additionals)
        return newAdditionals
      }
    }


    //  this function checks if the given rectangle contains the given point
    //  rectPosition    : p.Vector2d => Position(x and y) of the rectangle
    //  rectPosition    : p.Vector2d => size(width and height) of the rectangle
    //  pointToCheckFor : p.Vector2d => Position of the rectangle
    const rectContains = (rectPosition, rectSize, pointToCheckFor) => {
      const x = pointToCheckFor.x - parentElement.scrollLeft
      const y = pointToCheckFor.y - parentElement.scrollTop
      const lowerBound = bgDisplay.offsetTop - parentElement.offsetTop
      // console.log("b: ", lowerBound, " and y: ", y)
      if (x > 0 && y > 0 && y < lowerBound) {
        return true
      }
      return false
    }


    //  checks if any Element Container contains the passed point
    const doesPointExist = (point) => {
      for (let i = 0; i < Sprites.length; i++) {
        const sprite = Sprites[i];
        if (sprite.position.x == point.x && sprite.position.y == point.y && sprite.layer == currentLayer) {
          return {doesContain: true, index: i, container: "Elements"};
        }
      }
      for (let i = 0; i < Interactives.length; i++) {
        const position = Interactives[i].position;
        if (position.x == point.x && position.y == point.y && currentLayer == 0) {
          return {doesContain: true, index: i, container: "Objects"};
        }
      }
      return {doesContain: false, index: 0, container: "none"};
    }

    //  This function is used to check how many times an additionals is in an
    //  interactive and how often its maximally supposed to appear.
    //  returns -> false for appearing to the maximum (or to often),
    //             true for not having reached the maxOccurence yet
    const checkForAdditionalsOccurence = (index, type, maxOccurence) => {
      console.log("checkForAdditionalsOccurence")
      let additionals = Interactives[index].additionals
      if (additionals == undefined) {
        Interactives[index].additionals = new Array()
        return
      }

      if (maxOccurence == 1) {
        for (let i = 0; i < additionals.length; i++) {
          if (additionals[i].type == type) {
            return false
          }
        }
      } else if (maxOccurence == 2) {
        let cnt = 0
        for (let i = 0; i < additionals.length; i++) {
          if (additionals[i].type == type) {
            cnt++
          }
        }

        if (cnt >= 2) {
          return false
        }
      }
      return true
    }

    //
    //
    const renderStatusBar = () => {
      let bar = document.getElementById("status-bar")
      bar.innerHTML = ""
      bar.innerHTML += "<p class='status-element'>Layer: " + currentLayer + "</p>"
      bar.innerHTML += "<p class='status-element'>Block: " + selectedBlockType + "</p>"
      bar.innerHTML += "<p class='status-element'>Background: " + selectedBackground + "</p>"
    }

    //
    //
    const flushCurrentLevel = () => {
      Sprites.splice(0, Sprites.length)
      Interactives.splice(0, Interactives.length)
      p.redraw();
    }


    //
    const changeSizeOfWorkspace = (width, height) => {
      console.log(width)
      console.log(height)
      LevelWidth = width
      LevelHeight = height
      module.exports.LevelWidth = width
      module.exports.LevelHeight = height
      p.resizeCanvas(width, height);
      p.redraw();
    }


    //
    const syncExports = () => {
      module.exports.LevelWidth = LevelWidth
      module.exports.LevelHeight = LevelHeight
      module.exports.CubeWidthAndHeight = CubeWidthAndHeight
      module.exports.Header = Header
      module.exports.Level = Level
      module.exports.Path = Path
      module.exports.Sprites = Sprites
      // module.exports.SpriteTypes = SpriteTypes
      module.exports.Interactives = Interactives
    }

    //
    const loadBackgroundImages = () => {
      console.log("bg img")
      return new Promise((resolve, reject) => {
        const bgElements = document.getElementsByClassName("bg-element")
        for (let element of bgElements) {
          let texture = p.loadImage(currentBackgroundTexturesPath + "/" + element.id + ".png", () => {
            console.log(texture)
            backgroundImages[element.id] = texture
          })
        }
        resolve()
      })
    }

    //
    //
    ipcRenderer.on('load-background-images', (event, files) => {
      console.log(files)
      loadBackgroundImages().then((result) => {
        console.log(result)
        p.redraw()
      }, (err) => {
        console.log(err)
      })
    })


    //
    //
    ipcRenderer.on('bgPath', (event, path) => {
      console.log(path)
      currentBackgroundTexturesPath = path
      loadBackgroundImages().then((result) => {
        console.log(result)
        p.redraw()
      }, (err) => {
        console.log(err)
      })
    })

    //
    //
    ipcRenderer.on("new-layer", (event,arg) => {
      console.log("sketch: ", arg)
      currentLayer = arg
      renderStatusBar()
      p.redraw()
    })

    //
    ipcRenderer.on('new-doc-sketch', (event, arg) => {
      console.log("sketch: " + arg)
      Level(arg).then((result) => {
        console.log(result);
        interpretLevelBroker(result)
      }, (err) => {
        console.log(err)
      })
    })


    //
    ipcRenderer.on('change-selected-block', (event, passedBlockType) => {
      console.log("change-selected-block: " + passedBlockType)
      selectedBlockType = passedBlockType
      console.log("selectedBlockType after: " + selectedBlockType)
      renderStatusBar()
    })


    //
    ipcRenderer.on('change-selected-background', (event, passedBackground) => {
      console.log("change-selected-block: " + passedBackground)
      selectedBackground = passedBackground
      console.log("selectedBackground after: " + passedBackground)
      renderStatusBar()
    })


    //
    ipcRenderer.on('clean-all', (event) => {
      console.log("clean-all sketch")
      flushCurrentLevel();
      p.redraw();
    })


    //
    ipcRenderer.on('redraw-sketch', (event) => {
      console.log("redraw-sketch sketch")
      p.redraw();
    })


    //
    ipcRenderer.on('changeSize-sketch', (event, width, height) => {
      console.log("changeSize sketch")
      changeSizeOfWorkspace(width, height)
    })

    //
    ipcRenderer.on('changeZoom-sketch', (event, newZoom) => {
      console.log("changeZoom sketch")
      CubeWidthAndHeight = STANDARD_ZOOM * newZoom
      CurrentZoomLevel = newZoom
      p.redraw();
    })

    //
    ipcRenderer.on('generelInputConfirm-sketch', (event, value) => {
      console.log("generelInputConfirm sketch")
      setOrder(value)
      p.redraw();
    })

    const getTextureOfElement = (element) => {
      let type = element.type
      let hasImage = BLOCK_ATTRIBUTES[type].hasImage
      let texture = p.color(0,0,0)
      if (type == "background") {
        texture = backgroundImages[element.filename]
        return {hasImage, texture}
      }

      switch (type) {
        case "normal_block":
        texture = NORMAL_TEXTURE
        break;
        case "wood_block":
        texture = WOOD_TEXTURE
        break;
        case "stone_block":
        texture = STONE_TEXTURE
        break;
        case "player":
        texture = PLAYER_TEXTURE
        break;
        case "finish":
        texture = FINISH_TEXTURE
        break;
        case "opponent1":
        texture = OPPONENT1_TEXTURE
        break;
        case "waypoint":
        texture = WAYPOINT_TEXTURE
        break;
        case "dirt_block":
        texture = DIRT_TEXTURE
        break;
        case "grass_block":
        texture = GRASS_TEXTURE
        break;
        case "checkpoint":
        texture = CHECKPOINT_TEXTURE
        break;
        case "fire_block":
        texture = FIRE_TEXTURE
        break;
        case "spike_block":
        texture = SPIKE_TEXTURE
        break;
        case "coin":
        texture = COIN_TEXTURE
        break;
        case "collectable":
        texture = COLLECTABLE_TEXTURE
        break;
        default:
        console.log("!!!!!DEFAULT COLOR STATE!!!!!");
        break;
      }
      return {hasImage, texture};
    }

  }
  // END OF SKETCH



  module.exports = {
    //  global vars that are getting edited by outside
    sketch,
    CubeWidthAndHeight,
    LevelWidth,
    LevelHeight,
    Header,
    Level,
    Path,
    Sprites,
    Interactives
  }
