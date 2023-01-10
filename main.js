'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let InputCounter = 0.0;
let angle = 0.0;

const scale = 8;
const teta0 = Math.PI/5;
const alpha0 = 0;
const r = 1;
const c = 1;
const d = 5;

const x = (alpha, t,param =15) => {
  return (( r * Math.cos(alpha) -
    (r * (alpha0 - alpha) +
      t * Math.cos(teta0) -
      c * Math.sin(d * t) * Math.sin(teta0)) *
      Math.sin(alpha))/param)*scale;
};

const y = (alpha, t, param =15) => {
  return (( r * Math.sin(alpha) +
    (r * (alpha0 - alpha) +
      t * Math.cos(teta0) -
      c * Math.sin(d * t) * Math.sin(teta0)) *
      Math.cos(alpha))/param)*scale;
};

const z = (t, height = 15) => {
  return ((t*Math.sin(teta0)+c*Math.sin(d*t)*Math.cos(teta0))/(-height))*scale;
}


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
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

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
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/2.3, 1, 1, 1000); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.7,-0.5,0], 1);
    let translateToPointZero = m4.translation(0,2,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    
    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1,1,0,1] );

    surface.Draw();
}

function CreateSurfaceData()
{
    let vertexList = [];
    let normalsList = [];

    let deltaT = 0.0005;
    let deltaA = 0.0005;

    const step = 0.5

    for (let t = -15; t <= 15; t += step) {
        for (let a = 0; a <= 15; a += step) {
            const tNext = t + step;
            vertexList.push(x(t, a, 10), y(t, a, 10), z(t, 20));
            vertexList.push(x(tNext, a, 10), y(tNext, a, 10), z(tNext, 20));

            let result = m4.cross(calcDerT(t, a, deltaT), calcDerA(t, a, deltaA));
            normalsList.push(result[0], result[1], result[2])

            result = m4.cross(calcDerT(tNext, a, deltaT), calcDerA(tNext, a, deltaA));
            normalsList.push(result[0], result[1], result[2]);
        }
    }


    return [vertexList, normalsList];
}

const calcDerT = (t, a, tDelta) => ([
    (x(t + tDelta, a, 10) - x(t, a, 10)) / degriesToRadians(tDelta),
    (y(t + tDelta, a, 10) - y(t, a, 10)) / degriesToRadians(tDelta),
    (z(t + tDelta, a) - z(t, a)) / degriesToRadians(tDelta),
])

const calcDerA = (t, a, aDelta) => ([
    (x(t, a + aDelta, 10) - x(t, a, 10)) / degriesToRadians(aDelta),
    (y(t, a + aDelta, 10) - y(t, a, 10)) / degriesToRadians(aDelta),
    (z(t, a + aDelta) - z(t, a)) / degriesToRadians(aDelta),
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
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    let data = CreateSurfaceData();
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
