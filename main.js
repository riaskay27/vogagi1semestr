'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let InputCounter = 0.0;
let angle = 0.0;

const scale = 8;
const teta = Math.PI/2;
const a0 = 0;
const r = 1;
const c = 2;
const d = 1;

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iNormalVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    this.iWorldMatrix = -1;
    this.iWorldInverseTranspose = -1;
    this.iLightWorldPosition = -1;
    this.iLightDirection = -1;
    this.iViewWorldPosition = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    
    /* Set the values of the projection transformation */
    let projection = m4.orthographic(-20, 20, -20, 20, -20, 20);
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();


    let WorldMatrix = m4.translation(0, 0, -15);


    let matAccum1 = m4.multiply(WorldMatrix, modelView );
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    var worldInverseMatrix = m4.inverse(matAccum1);
    var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    gl.uniform3fv(shProgram.iViewWorldPosition, [0, 0, 0]);

    gl.uniform3fv(shProgram.iLightWorldPosition, GetCircleLightPoint());
    gl.uniform3fv(shProgram.iLightDirection, [0, 0, 0]);
   
    
    gl.uniformMatrix4fv(shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iWorldMatrix, false, matAccum1 );
    
    gl.uniform4fv(shProgram.iColor, [0.5,0.9,0.2,1] );

    surface.Draw();
}



function getX (t,a, param = 15) {
    return ((r * Math.cos(a) - (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.sin(a)) / param) * scale;
}
function getY (t,a, param = 15) {
    return ((r * Math.sin(a) + (r * (a0 - a) + t * Math.cos(teta) - c * Math.sin(d * t) * Math.sin(teta)) * Math.cos(a)) / param) * scale;
}
function getZ (t, height = 15) {
    return ((t * Math.sin(teta) + c * Math.sin(d * t) * Math.cos(teta)) / (-height)) * scale;
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalsList = [];

    let deltaT = 0.0005;
    let deltaA = 0.0005;

    const step = 0.5

    for (let t = -15; t <= 15; t += step) {
        for (let a = 0; a <= 15; a += step) {
            const tNext = t + step;
            vertexList.push(getX(t, a, 10), getY(t, a, 10), getZ(t, 20));
            vertexList.push(getX(tNext, a, 10), getY(tNext, a, 10), getZ(tNext, 20));

            let result = m4.cross(calcDerT(t, a, deltaT), calcDerA(t, a, deltaA));
            normalsList.push(result[0], result[1], result[2])

            result = m4.cross(calcDerT(tNext, a, deltaT), calcDerA(tNext, a, deltaA));
            normalsList.push(result[0], result[1], result[2]);
        }
    }


    return [vertexList, normalsList];
}

const calcDerT = (t, a, tDelta) => ([
    (getX(t + tDelta, a, 10) - getX(t, a, 10)) / degriesToRadians(tDelta),
    (getY(t + tDelta, a, 10) - getY(t, a, 10)) / degriesToRadians(tDelta),
    (getZ(t + tDelta, a) - getZ(t, a)) / degriesToRadians(tDelta),
])

const calcDerA = (t, a, aDelta) => ([
    (getX(t, a + aDelta, 10) - getX(t, a, 10)) / degriesToRadians(aDelta),
    (getY(t, a + aDelta, 10) - getY(t, a, 10)) / degriesToRadians(aDelta),
    (getZ(t, a + aDelta) - getZ(t, a)) / degriesToRadians(aDelta),
])


function degriesToRadians(angle) {
    return angle * Math.PI / 180;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iNormalVertex              = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.iWorldInverseTranspose     = gl.getUniformLocation(prog, "WorldInverseTranspose");
    shProgram.iWorldMatrix               = gl.getUniformLocation(prog, "WorldMatrix");
    shProgram.iLightWorldPosition        = gl.getUniformLocation(prog, "LightWorldPosition");
    shProgram.iLightDirection            = gl.getUniformLocation(prog, "LightDirection");
    shProgram.iViewWorldPosition         = gl.getUniformLocation(prog, "ViewWorldPosition");

    surface = new Model('Surface');
    let data = CreateSurfaceData();
    console.log(data[0].length)
    surface.BufferData(data[0], data[1]);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

function GetCircleLightPoint()
{
    let radius = 10;
    angle = degriesToRadians(InputCounter);
    console.debug(angle);
    let x = radius * Math.cos(angle );
    let y = radius * Math.sin(angle );
    let z = 0;
    return [x,y,z];
}

window.addEventListener("keydown", function (event) {  
    switch (event.key) {
      case "ArrowLeft":
        ProcessArrowLeftDown();
        break;
      case "ArrowRight":
        ProcessArrowRightDown();
        break;
      default:
        return; 
    }
});

function ProcessArrowLeftDown()
{
    InputCounter -= 3;
    draw();
}

function ProcessArrowRightDown()
{
    InputCounter += 3;
    draw();
}