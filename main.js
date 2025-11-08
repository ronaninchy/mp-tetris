import { pieceColors, pieceSpawnPos, wallkickOffsets } from './pieceData.js'
import * as p2p from './peertopeerutil.js'
Math.sum = (...a) => a.reduce((a,b)=>a+b,0)

const root = document.querySelector(':root')
const unit = parseInt(getComputedStyle(root).getPropertyValue('--unitSize'))
const canvasOffset = 7 * unit

const startingRows = 23
const tickrate = 500
let softdropping = false

let settings = localStorage.getItem('settings') || { moveleft:'J', moveright:'L', rotateleft:'Z', rotateright:'X',
    hold:'C', harddrop:'K', softdrop:'I',DAS:1000/7.5,ARR:1000/30,softdroprate: Infinity}

let softdropspeed = settings.softdroprate === Infinity? 0 : tickrate/settings.softdroprate
if(typeof settings === 'string'){
    settings = JSON.parse(settings)
} 
console.log(settings,typeof settings)

let pieceimages = {}
for (let i in pieceColors) {
    pieceimages[i] = new Image(100, 100)
    pieceimages[i].src = `assets/${i}.png`
}

const garbageColor = 'rgb(153, 153, 153)'


class TetrisPlr {
    /*
    un/drawpiece func
    createpiece func
    rotate func
    tick func
    move func
    clearlines func
    place func
     */
    /*
    add instant softdrop, harddrop, settings, fix piecelock
    add line clearing
     */
    constructor(plr){
        this.lineclearstemp = 0
        this.currentPiece = {pos:{x:[],y:[]}}

        let container = document.createElement('div')
        container.innerHTML =
        `<div class="playfield${plr}">
            <canvas class="app${plr}" width="250" height="750"></canvas>
            <div class="grid${plr}"></div>
        </div>

        <div class="dmgbarcontainer${plr}">
        <div class="dmgbar"></div>
        </div>
        <canvas class="hold${plr}" width="100" height="100"></canvas>
        <canvas class="bag${plr}" width="100" height="500"></canvas>`
        
        this.mainCtx = container.querySelector(`.playfield${plr}`).querySelector(`.app${plr}`)
        this.bagCtx = container.querySelector(`.bag${plr}`)
        this.dmgbarContainer = container.querySelector(`.dmgbarcontainer${plr}`)
        this.dmgbar = this.dmgbarContainer.children[0]
        this.holdCtx = container.querySelector(`.hold${plr}`)
        this.mainCtx = this.mainCtx.getContext('2d'); this.holdCtx = this.holdCtx.getContext('2d'); this.bagCtx = this.bagCtx.getContext('2d')
        document.body.append(container)
        this.tickrate = tickrate
        this.isAlive = false
        this.shadow = {x:[0,0,0,0],y:[0,0,0,0]}
        this.resetGrid()
    }
    harddrop(){
        clearTimeout(this.locking)
        this.locking = null
        this.undrawPiece(this.currentPiece.pos)
        this.instantsoftdrop()
        this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.type],1)
        this.placePiece()
    }
    start(){
        clearTimeout(this.ticking)
        clearTimeout(this.locking)
        this.resetGrid()
        this.holdpiece = null
        this.mainCtx.clearRect(0,0,2000,2000)
        this.bagCtx.clearRect(0,0,2000,2000)
        this.holdCtx.clearRect(0,0,2000,2000)

        willHardDrop = true
        this.shadow = {x:[0,0,0,0],y:[0,0,0,0]}
        this.isAlive = true
        this.placed = []
        this.boardgarbage = []
        this.nextbag =  shuffle(['Z','S','O','I','J','L','T'])
        this.bag =  shuffle(['Z','S','O','I','J','L','T'])
        
        this.garbageQueue = []
        this.prevRowOffset = Math.sum(...this.garbageQueue)
        
        this.createPiece(this.bag.shift())
        
    }
    resetGrid() {
        this.grid = []
        for (let i = 0; i < startingRows; i++) {
            this.grid.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        }
    
    }
    placePiece(){
        for(let i=0;i<4;i++){
            this.grid[this.currentPiece.pos.y[i]][this.currentPiece.pos.x[i]] = 1
            this.placed.push({x:this.currentPiece.pos.x[i],y:this.currentPiece.pos.y[i], color:pieceColors[this.currentPiece.type]})
        }
        this.attemptLineclears()
        this.prevRowOffset = this.startingRowsOffset
        this.holding = false
        this.createPiece(this.bag.shift())
        
    }
    undrawPiece(pos){
        for (let i=0;i<4;i++){
            this.mainCtx.clearRect(pos.x[i] * unit,(pos.y[i]-this.startingRowsOffset) * unit + canvasOffset,unit,unit)
        }
    }
    drawPiece(pos,color,alpha){
        this.mainCtx.globalAlpha = alpha
        this.mainCtx.fillStyle = color

        for (let i=0;i<4;i++){
           
            this.mainCtx.fillRect(pos.x[i] * unit,(pos.y[i]-this.startingRowsOffset) * unit + canvasOffset,unit,unit)
        }
    }
    attemptPieceLock(){
        if (this.wontCollide(this.currentPiece.pos,{x:0,y:1})) return false

        this.locking = setTimeout(()=>{
                this.placePiece()
                this.locking = null
            },500)
        return true
    }
    tick(){
        if(this.attemptPieceLock()) return;
            
            this.undrawPiece(this.currentPiece.pos)
            for(let i=0;i<4;i++){
                this.currentPiece.pos.y[i] +=1
            } 
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos', data:{piece: this.currentPiece,shadow:this.shadow}}))
            }
            this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.type],1)
            if(this.attemptPieceLock()) return;
            
            this.ticking = setTimeout(this.tick.bind(this),this.tickrate)
        

        
    }
    rotate(dir){
        let newDir = dir + this.currentPiece.rotation
        if(newDir>3) newDir = 0
        else if(newDir<0) newDir = 3
        let rotationOffsets = wallkickOffsets[this.currentPiece.type]
        let xPosOffset = this.currentPiece.pos.x[0] - pieceSpawnPos[this.currentPiece.type][this.currentPiece.rotation][0].x
        let yPosOffset = this.currentPiece.pos.y[0] - pieceSpawnPos[this.currentPiece.type][this.currentPiece.rotation][0].y
       
        rotationOffsets = rotationOffsets[`from${this.currentPiece.rotation}To${newDir}`]
        outer: for(let j=0;j<5;j++){
            let offset = rotationOffsets[j]
            let rotatedX = []
            let rotatedY = []
            for(let i=0;i<4;i++){
                rotatedX[i] = offset.x + xPosOffset + pieceSpawnPos[this.currentPiece.type][newDir][i].x
                rotatedY[i] = yPosOffset + pieceSpawnPos[this.currentPiece.type][newDir][i].y - offset.y 
                if(rotatedY[i]>=this.grid.length || rotatedY[i] < 0 
                    || rotatedX[i]>9 || rotatedX[i] < 0||
                    this.grid[rotatedY[i]][rotatedX[i]]) continue outer;

            }
            this.undrawPiece(this.currentPiece.pos)
            this.currentPiece.pos.y = rotatedY
            this.currentPiece.pos.x = rotatedX
            this.currentPiece.rotation = newDir
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos', data:{piece: this.currentPiece,shadow:this.shadow}}))
            }
            this.attemptLockreset()
            this.rendershadow()
            this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.pos],1)
            this.lastmove = 'rotate'
            return
        }

    }
    moveLeft(){
        if(this.wontCollide(this.currentPiece.pos,{x:-1,y:0}) && !keymap[settings.moveright]){
            this.undrawPiece(this.currentPiece.pos)
            for(let i=0;i<4;i++){
                this.currentPiece.pos.x[i] -= 1
            }
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos', data:{piece: this.currentPiece,shadow:this.shadow}}))
            }
            this.attemptLockreset()
            this.rendershadow()
            this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.pos],1)
            this.lastmove = 'move'
        }
        this.moveleftTimeout = setTimeout(this.moveLeft.bind(this),settings.ARR)
    }
    moveRight(){
        if(this.wontCollide(this.currentPiece.pos,{x:1,y:0}) && !keymap[settings.moveleft]){
            this.undrawPiece(this.currentPiece.pos)
            for(let i=0;i<4;i++){
                this.currentPiece.pos.x[i] += 1
            }
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos',data:{piece: this.currentPiece,shadow:this.shadow}}))
            }
            this.attemptLockreset()
            this.rendershadow()
            this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.pos],1)
            this.lastmove = 'move'
        }
        this.moverightTimeout = setTimeout(this.moveRight.bind(this),settings.ARR)
    }
    wontCollide(positions,offset){
        let pos = structuredClone(positions)
        for (let i=0;i<4;i++){
            if((pos.x[i] += offset.x) > 9 || (pos.x[i]) < 0 ||
            (pos.y[i] += offset.y) >= this.grid.length || this.grid[pos.y[i]][pos.x[i]] === 1) return false
        }
        return true
    }
    rendershadow() {
        //this.undrawPiece(this.shadow)
        for (let i=0;i<4;i++){
            if(this.grid[this.shadow.y[i]] === undefined || !this.grid[this.shadow.y[i]][this.shadow.x[i]])
            this.mainCtx.clearRect(this.shadow.x[i] * unit,(this.shadow.y[i]-this.startingRowsOffset) * unit + canvasOffset,unit,unit)
            
            
            }
        this.shadow = structuredClone(this.currentPiece.pos)
        this.instantsoftdrop(this.shadow)
        this.drawPiece(this.shadow,pieceColors[this.currentPiece.type],0.5)
        
            /*this.mainCtx.globalAlpha = 0.5
            this.mainCtx.fillStyle = pieceColors[this.currentPiece.type]
            let pos = this.shadow
            for (let i=0;i<4;i++){
                if(pos.y[i]) continue;
                this.mainCtx.fillRect(pos.x[i] * unit,pos.y[i] * unit + canvasOffset,unit,unit)
            }*/
        
    }
    createPiece(pieceType){
        clearTimeout(this.ticking)
        clearTimeout(this.locking)
        this.lockresetcount = 0
        willHold = !keymap[settings.hold]
        
        if(this.bag.length < 1){
            this.bag = this.nextbag
            this.nextbag =  shuffle(['Z','S','O','I','J','L','T'])
        } 
        this.currentPiece.type = pieceType
        this.currentPiece.rotation = 0
        
        let render = true//false
        if (this.lineclearstemp === 0 && !this.holding){
            this.unrenderGarbage()
            
            while(this.garbageQueue.length){
                render = true
                
                this.receiveGarbage(this.garbageQueue.pop())
            }

        this.dmgbar.style.height = '0px'
        }
        this.startingRowsOffset = this.grid.length - startingRows
        if (render){
            for(const part of this.placed){
                this.grid[part.y][part.x] = 1
                this.mainCtx.fillStyle = part.color
                this.mainCtx.fillRect(part.x*unit,(part.y-this.startingRowsOffset)*unit + canvasOffset,unit,unit)
            }
            this.renderGarbage()
        }
            

        for (let i=0;i<4;i++){
            this.currentPiece.pos.x[i] = pieceSpawnPos[pieceType][0][i].x + 3
            this.currentPiece.pos.y[i] = pieceSpawnPos[pieceType][0][i].y + this.startingRowsOffset
        }
        
        if(!this.wontCollide(this.currentPiece.pos,{x:0,y:0})){p1.isAlive = false; return;}

        if(connected){
            if(!this.holding){
                while(this.garbageQueue.length>0 && this.lineclearstemp > 0){
                let min = Math.min(
                    this.garbageQueue[this.garbageQueue.length-1],
                    this.lineclearstemp
                )
                this.garbageQueue[this.garbageQueue.length-1] -= min
                this.lineclearstemp -= min
                if(this.garbageQueue[this.garbageQueue.length-1] === 0) this.garbageQueue.pop()
                this.dmgbar.style.height = parseInt(this.dmgbar.style.height) - (min*unit) + 'px'
                }
                dc.send(JSON.stringify({
                    type:'updateDmgBar',
                    data: this.dmgbar.style.height
                }))
            }
           
            
            dc.send(JSON.stringify({type:'pieceCreated',data:
                        {
                            grid:this.grid,
                            updatedPlaced: this.placed,
                            pieceData: this.currentPiece,
                            lines: this.lineclearstemp,
                            updatedGarb: this.boardgarbage,
                            tspin: this.isTspin
                        }
                    }))
            
        } 

        this.updatebagctx()
        this.rendershadow()
        this.drawPiece(this.currentPiece.pos,pieceColors[this.currentPiece.type],1)
        this.tick()
        
        
    }
    instantsoftdrop(pos = this.currentPiece.pos){
        while (this.wontCollide(pos,{x:0,y:1})) {
            for(let i=0;i<4;i++){
                pos.y[i]++
            }
            
        }
        if(connected){
            dc.send(JSON.stringify({type: 'updatePos', data:{piece: this.currentPiece,shadow:this.shadow}}))
        }
    }
    attemptLockreset(){
        
        if(!this.locking) return;

        /*if(this.wontCollide(this.currentPiece.pos,{y:1,x:0})){
            clearTimeout(this.locking)
            this.locking = null
            this.ticking = setTimeout(this.tick.bind(this),this.tickrate)
        }*/
        this.lockresetcount++
        if(this.lockresetcount<15 ){
            clearTimeout(this.locking)
            clearTimeout(this.ticking)
            if(this.wontCollide(this.currentPiece.pos,{x:0,y:1})){
                this.ticking = setTimeout(this.tick.bind(this),this.tickrate)
                this.locking = null
                return
            } 
            this.locking = setTimeout(()=>{
                this.placePiece()
                this.locking = null
            },tickrate)
        }
        

        
    }
    hold(){
        
        this.holding = true
        this.holdCtx.clearRect(0,0,500,500)
        if (!this.holdpiece){ // first hold
            this.undrawPiece(this.currentPiece.pos)
            this.holdpiece = this.currentPiece.type
            this.createPiece(this.bag.shift())
        }
        else {
            this.undrawPiece(this.currentPiece.pos)
            let temp = p1.holdpiece
            this.holdpiece = this.currentPiece.type
            this.createPiece(temp)

        }
        this.holdCtx.drawImage(pieceimages[this.holdpiece],0, 0, 100, 100)
    }
    updatebagctx(){
        this.bagCtx.clearRect(0,0,1000,1000)
        let combinedbags = [...this.bag, ...this.nextbag]
        for (let j = 0; j < 5; j++) {
            this.bagCtx.drawImage(pieceimages[combinedbags[j]], 0, j * 100, 100, 100)
        }
    }

    attemptLineclears(){
        /*
        for (const part of this.placed){
            this.mainCtx.clearRect(part.x*unit,(part.y-this.prevRowOffset)*unit + canvasOffset,unit,unit)
        }*/

        this.mainCtx.clearRect(0,0,2000,2000)
        this.lineclearstemp = 0
        
        
        if(this.currentPiece.type === 'T'){ // t spin
            let yCenter = this.currentPiece.pos.y[2], xCenter =this.currentPiece.pos.x[2]
            let sum = 0
            const miniTspinOffset = {x:[0,-1,0,1],y:[1,0,-1,0]}
            const combination = [[1,1],[-1,-1],[1,-1],[-1,1]]
            for (const offset of combination){
                let y = yCenter + offset[0], x = xCenter + offset[1]
                if(y>=this.grid.length || y<0 || x<0 || x>9) continue
                sum += this.grid[y][x]
            }

                
                let y = this.currentPiece.pos.y[2] - miniTspinOffset.y[this.currentPiece.rotation],
                x = this.currentPiece.pos.x[2] + miniTspinOffset.x[this.currentPiece.rotation]
            
                
            if(y >= this.grid.length || this.grid[y][x] === 1){
                
                this.isTspin = sum >= 3 && this.lastmove === 'rotate' 
    
                if(this.isTspin){
                    console.log('tspin')
                }

                 }
            //console.log(sum)
    
                
            
        }

        let y = 0
        let rendergarbagebool = true//false
        
        outer: while(y<this.grid.length){
            
            for(let x=0;x<10;x++){
                if(this.grid[y][x] === 0) {y++; continue outer;}
            }
            // column is full
            if(y < startingRows){
                this.clearline(y)
                y++
            } 
            else {
                    if(!rendergarbagebool){
                        //this.unrenderGarbage()
                        rendergarbagebool = true
                    }
                    this.clearGarbage(y)
                    
                 }
            this.lineclearstemp++
            
            
        }
        this.startingRowsOffset = this.grid.length - startingRows
        this.mainCtx.globalAlpha = 1
        
        if(rendergarbagebool) this.renderGarbage()
        //console.log(this.placed,this.grid)
        
        /*for(const part of this.placed){
            this.mainCtx.fillStyle = part.color
            
            if(this.grid[part.y] === undefined) console.log(part.y,this.grid,part.color)
            this.grid[part.y][part.x] = 1
            
            this.mainCtx.fillRect(part.x*unit,(part.y-this.startingRowsOffset)*unit + canvasOffset,unit,unit)
        }*/
        //this.garbageQueue = [2,3]
        
        
    }
    unrenderGarbage(){
        for(let i=0;i<this.boardgarbage.length;i++){
            let part = this.boardgarbage[i]
            this.mainCtx.clearRect(part.x*unit,(part.y-this.prevRowOffset)*unit + canvasOffset,unit,unit)
        }
    }
    renderGarbage(){
        this.mainCtx.globalAlpha = 1
        this.mainCtx.fillStyle = garbageColor
        for(let i=0;i<this.boardgarbage.length;i++){
            let part = this.boardgarbage[i]
            this.grid[part.y][part.x] = 1
            this.mainCtx.fillRect(part.x*unit,(part.y-this.startingRowsOffset)*unit+canvasOffset,unit,unit)
        }
    }
    clearGarbage(clearedY){
        console.log('garbage')
        
        this.mainCtx.clearRect(0,(clearedY - this.startingRowsOffset)*unit + canvasOffset,1000,unit)
        for(let i=0;i<this.placed.length;i++){
            let part = this.placed[i]
            if(part.y === clearedY){
                //if(this.grid[part.y]!= undefined) this.grid[part.y][part.x] = 0
                //else console.log(part.y,this.grid)
                this.placed.splice(i,1)
                i--;
            }
        }
        this.grid.splice(clearedY,1)
        for(let i=0;i<this.boardgarbage.length;i++){
            let part = this.boardgarbage[i]
            if(part.y>clearedY) part.y--
            else if(part.y === clearedY) {
                this.boardgarbage.splice(i,1)
                i--
                console.log('moving')
            }
            
        }
         
        for(let i=0;i<this.placed.length;i++){
            let part = this.placed[i]
            if(part.y === clearedY){
                this.grid[part.y][part.x] = 0
                this.placed.splice(i,1)
                i--;
                
            }
            else if(part.y > clearedY) part.y--
        }

       
    }
    clearline(clearedY){
        let i=0;
        
        while (i<this.placed.length){
            let part = this.placed[i]
            if(part.y === clearedY){
                this.grid[part.y][part.x] = 0
                this.placed.splice(i,1)
                
            }
            else{
        
                if(part.y<clearedY){
                    this.grid[part.y][part.x] = 0
                    part.y++
                    //this.grid[part.y][part.x] = 1
                }
                i++
            }
            
        }
        
        
    }
    receiveGarbage(lines,holeCol){
        if (lines <= 0) return;
        this.mainCtx.fillStyle = garbageColor
        if(holeCol === undefined) holeCol = Math.floor(Math.random() * 10);

        let arr = [1,1,1,1,1,1,1,1,1,1]
            arr[holeCol] = 0
            
            for(let i=0; i<10; i++){
                if(i === holeCol) continue;
                let part = {y: this.grid.length, x: i}
                //this.placed.push(part)
                this.boardgarbage.push(part)
                this.mainCtx.fillRect(part.x*unit,(part.y - this.startingRowsOffset)*unit + canvasOffset,unit,unit)
            }
            
        this.grid.push(arr)
        this.receiveGarbage(lines-1,holeCol)
        
    }
}

let p1 = new TetrisPlr('P1')
let p2// = new TetrisPlr('P2')

document.querySelector('#startBtn').onclick = function(){p1.start(); this.blur();}
let keymap = {}

let willRotateLeft = true
let willRotateRight = true
let willHardDrop = true
let DASRight = true
let DASLeft = true
let willHold = true

onkeydown = onkeyup = (e) => {
    
    if(!p1.isAlive) return;
    const key = e.key.toUpperCase()
    keymap[key] = e.type === 'keydown'

    if (keymap[settings.moveleft] && !keymap[settings.moveright] && DASLeft){
        DASLeft = false
        if(p1.wontCollide(p1.currentPiece.pos,{x:-1,y:0})){
            p1.undrawPiece(p1.currentPiece.pos)
            for(let i=0;i<4;i++){
                p1.currentPiece.pos.x[i] -= 1
            }
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos',data:{piece: p1.currentPiece,shadow:p1.shadow}}))
            }
            p1.attemptLockreset()
            p1.rendershadow()
            p1.drawPiece(p1.currentPiece.pos,pieceColors[p1.currentPiece.pos],1)
            p1.lastmove = 'move'
        }
        p1.moveleftTimeout = setTimeout(p1.moveLeft.bind(p1),settings.DAS)
    }
    else if(!keymap[settings.moveleft]){
        DASLeft = true
        clearTimeout(p1.moveleftTimeout)
    }

    if (keymap[settings.moveright] && !keymap[settings.moveleft] && DASRight){
        DASRight = false
        if(p1.wontCollide(p1.currentPiece.pos,{x:1,y:0})){
            p1.undrawPiece(p1.currentPiece.pos)
            for(let i=0;i<4;i++){
                p1.currentPiece.pos.x[i] += 1
            }
            if(connected){
                dc.send(JSON.stringify({type: 'updatePos', data:{piece: p1.currentPiece,shadow:p1.shadow}}))
            }
            p1.attemptLockreset()
            p1.rendershadow()
            p1.drawPiece(p1.currentPiece.pos,pieceColors[p1.currentPiece.pos],1)
            p1.lastmove = 'move'
        }
        p1.moverightTimeout = setTimeout(p1.moveRight.bind(p1),settings.DAS)
    }
    else if(!keymap[settings.moveright]){
        DASRight = true
        clearTimeout(p1.moverightTimeout)
    }

    if(keymap[settings.rotateleft]){
        if(willRotateLeft){
        p1.rotate(-1)
        willRotateLeft = false
        }
    }
    else {
        willRotateLeft = true
    }

    if(keymap[settings.rotateright]){
        if(willRotateRight){
            p1.rotate(1)
            willRotateRight = false
        }
    }
    else {
        willRotateRight = true
    }

    if(keymap[settings.softdrop]){
        if(!p1.locking){
            softdropping = true

            if(settings.softdroprate === 0){
                p1.undrawPiece(p1.currentPiece.pos)
                p1.instantsoftdrop()
                p1.drawPiece(p1.currentPiece.pos,pieceColors[p1.currentPiece.type],1)
            }
            else {
            p1.tickrate = softdropspeed
            clearTimeout(p1.ticking)
            p1.tick()
            }
            
        }
    }
    else if(softdropping){
        softdropping = false
        p1.tickrate = tickrate
        if(!p1.locking){
        clearTimeout(p1.ticking)
        p1.tick()
        }
    }
    if(keymap[settings.harddrop] && willHardDrop){
        p1.harddrop()
        willHardDrop = false
    }
    else if(!keymap[settings.harddrop]) willHardDrop = true
    if(keymap[settings.hold] && !p1.holding && willHold){
        p1.hold()
    }
    else if(!keymap[settings.hold]) willHold = true
}

function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array
}

const settingsBtn = document.querySelector('#settingsBtn')
const settingsContainer = document.querySelector('#settingsContainer')
settingsBtn.onclick = () => {
settingsContainer.style.display = settingsContainer.style.display === 'block'? 'none' : 'block'
}

settingsContainer.querySelectorAll('input[type="range"]').forEach((HTMLsetting) => {
    function changeSetting(){
        let rate = HTMLsetting.value
    if (HTMLsetting.name === 'softdroprate'){
        let val = parseInt(rate)
         
        if(val>40){
            
            HTMLsetting.parentElement.querySelector('label').innerHTML = '&infin;'
            settings.softdroprate = 0
            return
        }
        HTMLsetting.parentElement.querySelector('label').innerHTML = `${rate}x`
        settings.softdroprate = val
        softdropspeed = tickrate / val
        console.log(settings.softdroprate)
    }
    else {
        const frame = 1000/60
        HTMLsetting.parentElement.querySelector('label').innerHTML = `${rate}F`
        settings[HTMLsetting.parentElement.querySelector('label').htmlFor] = frame * rate
        }
    }
HTMLsetting.oninput = changeSetting
if(HTMLsetting.name === 'softdroprate'){
    if(settings.softdroprate === Infinity){
        HTMLsetting.value = 41
        HTMLsetting.parentElement.querySelector('label').innerHTML = '&infin;'
        return;
    }
    
    HTMLsetting.parentElement.querySelector('label').innerHTML = `${settings.softdroprate}x`
    HTMLsetting.value = settings.softdroprate

    return
}
HTMLsetting.parentElement.querySelector('label').innerHTML = settings[HTMLsetting.name] / (100/6)



})

settingsContainer.querySelector('button[name="save"]').onclick = function() {
    localStorage.setItem('settings',JSON.stringify(settings))
    console.log('saved settings')
    this.blur();
}

const modal = document.querySelector('#modal')

String.prototype.replaceAt = function(start,replacement){
    return this.substring(0,start) + replacement + this.substring(start+1)
}

settingsContainer.querySelectorAll('button.keybind').forEach((HTMLkeybind)=>{
    HTMLkeybind.innerHTML = settings[HTMLkeybind.name]
    HTMLkeybind.onclick = function(){
        modal.style.display = 'block'
        window.addEventListener('keydown',changeKey)
        function changeKey(key){
            key = key.key.toUpperCase()
            const Len = HTMLkeybind.parentElement.textContent.length
            HTMLkeybind.innerHTML = key
            console.log(HTMLkeybind.parentElement)
            settings[HTMLkeybind.name] = key
            console.log(settings)
            window.removeEventListener('keydown',changeKey)
            modal.style.display = 'none'
        }
        
        this.blur();
    }

})

/*
webrtc section



connect 2 clients
send events for:
    piece moving
    piece rotating
    piece place
    garbage send
    garbage cancel


FUNCTIONS TO RECEIEVE GARBAGE
 */
const DMG_Values = {
    0 : 0,
    1 : 0,
    2 : 1,
    3 : 2,
    4 : 4,

}


const eventFunctions = {
    //
    updatePos(pieceData) {
        p2.undrawPiece(p2.currentPiece.pos)
        p2.currentPiece = pieceData.piece
        p2.drawPiece(pieceData.shadow,pieceColors[p2.currentPiece.type],0.5)
        p2.drawPiece(p2.currentPiece.pos,pieceColors[p2.currentPiece.type],1)
        //p2.rendershadow()
        
    },
    pieceCreated(obj){
        console.log(obj,obj.updatedGarb)
        //console.log(obj.lines)
        p2.currentPiece = obj.pieceData
        p2.grid = obj.grid
        p2.startingRowsOffset = p2.grid.length - startingRows
        
        p2.mainCtx.clearRect(0,0,2000,2000) 
        for (const part of obj.updatedPlaced){
            p2.mainCtx.fillStyle = part.color
            p2.mainCtx.fillRect(part.x*unit,(part.y-p2.startingRowsOffset)*unit + canvasOffset,unit,unit)
        }

        p2.mainCtx.fillStyle = garbageColor
        for (const part of obj.updatedGarb){
            p2.mainCtx.fillRect(part.x*unit,(part.y-p2.startingRowsOffset)*unit + canvasOffset,unit,unit)
        }
                 
        
        let dmg = obj.tspin ? obj.lines*2 : DMG_Values[obj.lines]
        if(dmg){
            p1.dmgbar.style.height = parseInt(p1.dmgbar.style.height) + (dmg*unit) + 'px'
            p1.garbageQueue.push(dmg)
        }
        
    },
    updateDmgBar(height){
        console.log('updating')
        p2.dmgbar.style.height = height
    },
    start(){
        p1.start()
    }
}



let connected = false

const offerContainer = document.querySelector('#createOffer')
const answerContainer = document.querySelector('#createAnswer')
const addAnswerContainer = document.querySelector('#addAnswer')
const peerConnection = new RTCPeerConnection(p2p.serversConfig)
let dc = peerConnection.createDataChannel("Game State")

peerConnection.addEventListener("datachannel", (ev) => {
    let channel = ev.channel
    channel.onmessage = (e) =>{
        let msg = JSON.parse(e.data)
        //console.log('msg',e.data)
        eventFunctions[msg.type](msg.data)
        
    } 

});

offerContainer.querySelector('button').onclick = async function() {
    //const offer = await 
    p2p.createOffer(
        offerContainer.querySelector('textarea'),peerConnection
    )
    this.blur();
}

answerContainer.querySelector('button').onclick = async function() {
    let offer = JSON.parse(offerContainer.querySelector('textarea').value)
    //const answer = await 
    p2p.createAnswer(
        offer,answerContainer.querySelector('textarea'),peerConnection
    )
    this.blur();
}

addAnswerContainer.querySelector('button').onclick = function() {
    let answer = JSON.parse(answerContainer.querySelector('textarea').value)
    
    p2p.addAnswer(answer,peerConnection)
    this.blur();
}


dc.onopen = () => {
    connected = true
    p2 = new TetrisPlr('P2')
    console.log("datachannel open");
    document.querySelector('#startMP').disabled = false;
};

document.querySelector('#startMP').onclick = function() {
    if (!connected){
        this.disabled = true;
        return;
    }

    eventFunctions.start();
    dc.send(JSON.stringify({type: 'start', data: null}));
    this.disabled = true;
    this.blur();

}

peerConnection.onconnectionstatechange = (e) => {
    let state = peerConnection.connectionState
    if(state === 'failed' || state === 'disconnected' || state === 'closed'){
        connected = false
        document.querySelector('#startMP').onclick()
    }
console.log(e,peerConnection.connectionState)
}