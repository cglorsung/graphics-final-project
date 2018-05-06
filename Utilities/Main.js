// File: matMovingGlobe.js

// Program to draw a rocking image between two walls;
// objects are displayed with varying materials under a single light source.
// Adapted from Angel & Shreiner 2D Sierpinski Gasket, Color Cube programs
// and recursive sphere and Whitford Holey's textured moving ovoid program.
// by J. Andrew Whitford Holey, March 15, 2016


/****************************************************************************
 *
 * GLOBAL VARIABLE DECLARATIONS
 *
 ****************************************************************************/

var canvas;
var gl;


// parameters for the walls 
const numWallPoints = 36;  // 6 faces * 2 triangles * 3 vertices/triangle
const wallWidth     =  0.125;
const wallDX        =  1 - wallWidth / 2; // move wall +|-15/16

// parameters and variables for creating the rectangle
const numRectPoints = 6;   // two triangles
const maxRectDim    = 0.8;

// parameters for the rectangle
var sx, sy, sz  =  1.0; // scale factors
var theta       =  0.0; // x-rotation
var maxTheta    = 60.0; // maximum x-rotation magnitude
var deltaTheta  =  0.5; // x-rotation change

const numPoints = numWallPoints + numRectPoints;


// parameters for colors, lighting properties and material properties
const darkGray  = vec4(0.2, 0.2, 0.2, 1.0);
const white     = vec4(1.0, 1.0, 1.0, 1.0);

const lightAmb  = darkGray;
const lightDiff = white;
const lightSpec = white;
const lightPos  = vec4(2.0, 2.0, 5.0, 0.0);

const matAmb    = white;
const matDiff   = white;
const matSpec   = white;
const wallShin  =  30.0;
const rectShin  = 600.0;

// uniform material variables
var light_position;
var ambient_product;
var diffuse_product;
var specular_product;
var shininess;

// constant matrices
const leftWall  = translate(-wallDX, 0.0, 0.0 );
const rightWall = translate(wallDX, 0.0, 0.0 );
const scaleRect = scalem(sx, sy, sz);

// parameters for viewer position
const initViewerDist  =  4.0;
const minViewerDist   =  2.0;
const maxViewerDist   = 10.0;
const maxOffsetRatio  =  1.0;
const deltaViewerDist =  0.25;
const deltaOffset     =  0.1;
var   eye             = vec3(0.0, 0.0, initViewerDist);
const at              = vec3(0.0, 0.0, 0.0);
const up              = vec3(0.0, 1.0, 0.0);

// Projection transformation parameters
var   fieldOfViewY = 40.0,
      aspectRatio  =  1.0, // actual value set in init
      zNear        =  1.0,
      zFar         = 20.0;

// Texture parameters and variables
const sandyTexSize     = 512;
var   sandyTexImg      = new Uint8Array(4*sandyTexSize*sandyTexSize);
// declarations from included script
   // skyTexture                  // array of texels
   // skyTextureHeight = 256      // height of this texture
   // skyTextureWidth  = 256      // width of this texture
var   sandyTexture, imageTexture; // uniform texture variables
var   isWallLoc;

var runAnimation = false;


// Variables for transformation matrix uniform locations
var modelViewLoc;  // uniform location of the modelView matrix
var projectionLoc; // uniform location of the projection matrix
var normalLoc;     // uniform location of the normal matrix

// Declare variables for points, normals, and texture coordinates
var points    = [];
var normals   = [];
var texCoords = [];



/****************************************************************************
 *
 * TEXTURE SET-UP
 *
 ****************************************************************************/

function initSandyTex() {
// Generate a texture of random texel colors in the dark gray range
// with a few bright texels

  const redMax   = 63;
  const greenMax = 47;
  const blueMax  = 79;
  const brightCount  = sandyTexSize * sandyTexSize / 64;

  // initialize texture to orange
  for (i = 0; i < sandyTexSize; i++) {
    for (j = 0; j < sandyTexSize; j++) {
      sandyTexImg[4*(i*sandyTexSize+j)] =
          Math.round(Math.random() * redMax);
      sandyTexImg[4*(i*sandyTexSize+j)+1] =
          Math.round(Math.random() * greenMax);
      sandyTexImg[4*(i*sandyTexSize+j)+2] =
          Math.round(Math.random() * blueMax);
      sandyTexImg[4*(i*sandyTexSize+j)+3] = 255; // alpha
    }
  }

  // randomly brighten texels
  for (k = 0; k < brightCount; k++) {
    var s = Math.floor(Math.random() * sandyTexSize);
    var t = Math.floor(Math.random() * sandyTexSize);
    sandyTexImg[4*(s*sandyTexSize+t)]   = 223;
    sandyTexImg[4*(s*sandyTexSize+t)+1] = 223;
    sandyTexImg[4*(s*sandyTexSize+t)+2] = 255;
  }

}

/**
 * Configure the two textures used in this program from the
 * texture images sandyTexImg and imageTexImg created elsewhere.
 */
function configureTexture() {
    sandyTexture = gl.createTexture();       
    gl.bindTexture(gl.TEXTURE_2D, sandyTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sandyTexSize, sandyTexSize,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, sandyTexImg);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                     gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, skyTextureWidth, skyTextureHeight,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, skyTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                     gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, 
                     gl.NEAREST_MIPMAP_LINEAR);
}


/****************************************************************************
 *
 * WALL AND IMAGE RECTANGLE SET-UP
 *
 ****************************************************************************/

/**
 * Returns the vec3 normal vector of the three specified points
 */
function triangleNormal(p1, p2, p3) {
  var v1 = vec3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  var v2 = vec3(p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]);
  return normalize(cross(v1, v2));
}

/**
 * Generates triangles representing a box-shaped wall.
 *
 */
function initWall() {
  const numVertices  =  8;
  const numTriangles = 12;
  const numTexCoords =  6;

  const pointIndices = [ // numTriangles X 3
    [0, 1, 3], //  0 front face
    [0, 3, 2], //  1
    [2, 3, 5], //  2 right side face
    [2, 5, 4], //  3
    [4, 5, 7], //  4 rear face
    [4, 7, 6], //  5
    [6, 7, 1], //  6 left side face
    [6, 1, 0], //  7
    [6, 0, 2], //  8 top face
    [6, 2, 4], //  9
    [1, 7, 5], // 10 bottom face
    [1, 5, 3]  // 11
  ];

  const texIndices = [ // numTriangles X 3
    [0, 1, 3], //  0 front face
    [0, 3, 2], //  1
    [0, 1, 5], //  2 right side face
    [0, 5, 4], //  3
    [0, 1, 3], //  4 rear face
    [0, 3, 2], //  5
    [0, 1, 5], //  6 left side face
    [0, 5, 4], //  7
    [0, 1, 3], //  8 top face
    [0, 3, 2], //  9
    [0, 1, 3], // 10 bottom face
    [0, 3, 2]  // 11
  ];

  var vertices = [];
  var normVecs = [];
  var texVecs  = [];

  vertices.push(vec4(-wallWidth/2,  1.0,  1.0, 1.0)); // top front left
  vertices.push(vec4(-wallWidth/2, -1.0,  1.0, 1.0)); // bottom front left
  vertices.push(vec4( wallWidth/2,  1.0,  1.0, 1.0)); // top front right
  vertices.push(vec4( wallWidth/2, -1.0,  1.0, 1.0)); // bottom front right
  vertices.push(vec4( wallWidth/2,  1.0, -1.0, 1.0)); // top back right
  vertices.push(vec4( wallWidth/2, -1.0, -1.0, 1.0)); // bottom back right
  vertices.push(vec4(-wallWidth/2,  1.0, -1.0, 1.0)); // top back left
  vertices.push(vec4(-wallWidth/2, -1.0, -1.0, 1.0)); // bottom back left

  for (i = 0; i < numTriangles; i+=2) { // two triangles per face
    var faceNormal = triangleNormal(vertices[pointIndices[i][0]],
                                    vertices[pointIndices[i][1]],
                                    vertices[pointIndices[i][2]]);
    normVecs.push(faceNormal);
    normVecs.push(faceNormal);
  }

  texVecs.push(vec2(0.0,       1.0)); // top left
  texVecs.push(vec2(0.0,       0.0)); // bottom left
  texVecs.push(vec2(wallWidth, 1.0)); // short top right
  texVecs.push(vec2(wallWidth, 0.0)); // short bottom right
  texVecs.push(vec2(1.0,       1.0)); // top right
  texVecs.push(vec2(1.0,       0.0)); // bottom right

  // generate triangles in points, normals, and texCoords
  for (i = 0; i < numTriangles; i++) {
    for (j = 0; j < 3; j++) {
      normals.push(normVecs[i]);
      texCoords.push(texVecs[texIndices[i][j]]);
      points.push(vertices[pointIndices[i][j]]);
    }
  }
}

/**
 * Generates triangles with normals and texture coordinates for
 * a flat, vertical rectange..
 */
function initRectangle() {
  var normal = vec3(0.0, 0.0, 1.0); // all points have the same normal

  points.push(vec4(-1.0, 1.0, 0.0, 1.0 ));  // 0
  normals.push(normal);
  texCoords.push(vec2(0.0, 0.0));
  points.push(vec4(-1.0, -1.0, 0.0, 1.0 )); // 1
  normals.push(normal);
  texCoords.push(vec2(0.0, 1.0));
  points.push(vec4(1.0, -1.0, 0.0, 1.0 ));  // 2 
  normals.push(normal);
  texCoords.push(vec2(1.0, 1.0));
  points.push(vec4(-1.0, 1.0, 0.0, 1.0 ));  // 3
  normals.push(normal);
  texCoords.push(vec2(0.0, 0.0));
  points.push(vec4(1.0, -1.0, 0.0, 1.0 ));  // 4 
  normals.push(normal);
  texCoords.push(vec2(1.0, 1.0));
  points.push(vec4(1.0, 1.0, 0.0, 1.0 ));   // 5
  normals.push(normal);
  texCoords.push(vec2(1.0, 0.0));
}


/****************************************************************************
 *
 * INIT FUNCTION
 *
 ****************************************************************************/

window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    aspectRatio  =  canvas.width / canvas.height;
    
    gl = WebGLUtils.setupWebGL( canvas );
    if (!gl) { alert("WebGL isn't available"); }


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 0.9, 0.75, 1.0); // light yellow background
    
    gl.enable(gl.DEPTH_TEST);
    
    // Set up the walls and the rectangle
    initWall();
    initRectangle();
    
    // Initialize textures
    initSandyTex();
    initskyTexture();

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    /****** Note the change to 3 for the second parameter ******/
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    /****** Note the change to 2 for the second parameter ******/
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Configure textures and send them to the GPU
    configureTexture();
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sandyTexture);
    gl.uniform1i(gl.getUniformLocation(program, "sandyTexture"), 0);
            
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.uniform1i(gl.getUniformLocation(program, "imageTexture"), 1);

    // 
    modelViewLoc     = gl.getUniformLocation(program, "model_view");
    projectionLoc    = gl.getUniformLocation(program, "projection");
    normalLoc        = gl.getUniformLocation(program, "normal_mat");
    ambient_product  = gl.getUniformLocation(program, "ambient_product");
    diffuse_product  = gl.getUniformLocation(program, "diffuse_product");
    specular_product = gl.getUniformLocation(program, "specular_product");
    shininess        = gl.getUniformLocation(program, "shininess");
    light_position   = gl.getUniformLocation(program, "light_position");
    isWallLoc        = gl.getUniformLocation(program, "isWall");

    // set up global lighting properties
    gl.uniform4fv(ambient_product,  mult(lightAmb,  matAmb));
    gl.uniform4fv(diffuse_product,  mult(lightDiff, matDiff));
    gl.uniform4fv(specular_product, mult(lightSpec, matSpec));
    
    //event listeners for buttons
    document.getElementById("startButton").onclick = function () {
      runAnimation = true;
      requestAnimFrame(render);
    };
    document.getElementById("stopButton").onclick = function () {
      runAnimation = false;
    };
    var offsetRatio;
    document.getElementById("leftButton").onclick = function () {
      offsetRatio = eye[0] / eye[2];
      if (offsetRatio > -maxOffsetRatio) {
        offsetRatio -= deltaOffset;
        eye[0] = eye[2] * offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
    document.getElementById("rightButton").onclick = function () {
      offsetRatio = eye[0] / eye[2];
      if (offsetRatio < maxOffsetRatio) {
        offsetRatio += deltaOffset;
        eye[0] = eye[2] * offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
    document.getElementById("downButton").onclick = function () {
      offsetRatio = eye[1] / eye[2];
      if (offsetRatio > -maxOffsetRatio) {
        offsetRatio -= deltaOffset;
        eye[1] = eye[2] * offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
    document.getElementById("upButton").onclick = function () {
      offsetRatio = eye[1] / eye[2];
      if (offsetRatio < maxOffsetRatio) {
        offsetRatio += deltaOffset;
        eye[1] = eye[2] * offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
    document.getElementById("inButton").onclick = function () {
      if (eye[2] > minViewerDist) {
        eye[2] -= deltaViewerDist;
        offsetRatio = eye[2] / (eye[2] + deltaViewerDist);
        eye[0] *= offsetRatio;
        eye[1] *= offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
    document.getElementById("outButton").onclick = function () {
      if (eye[2] < maxViewerDist) {
        eye[2] += deltaViewerDist;
        offsetRatio = eye[2] / (eye[2] - deltaViewerDist);
        eye[0] *= offsetRatio;
        eye[1] *= offsetRatio;
      }
      if (!runAnimation) requestAnimFrame(render);
    };
        
    render();
}


/****************************************************************************
 *
 * RENDER FUNCTION
 *
 ****************************************************************************/

function render()
{
  // clear the window
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // set up projection matrix
  var projection = perspective(fieldOfViewY, aspectRatio, zNear, zFar);
  gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));

  // set up view position
  var viewer = lookAt(eye, at, up);

  // set up light position
  var newLightPos = vec4();
  for (i = 0; i < 4; i++) {
    newLightPos[i] = dot(viewer[i], lightPos);
  }
  gl.uniform4fv(light_position, newLightPos);


  // Set up and draw walls

  // tell fragment shader it's rendering a wall (1==true)
  gl.uniform1i(isWallLoc, 1);
  gl.uniform1f(shininess, wallShin);

  // draw the left wall
  var mv = mult(viewer, leftWall);
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(mv));
  var nm = normalMatrix(mv, true)
  gl.uniformMatrix3fv(normalLoc, false, flatten(nm));
  gl.drawArrays(gl.TRIANGLES, 0, numWallPoints);

  // draw the right wall
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(mult(viewer, rightWall)));
  // uses same normal matrix
  gl.drawArrays(gl.TRIANGLES, 0, numWallPoints);


  // Set up and draw rectangle
  // tell fragment shader it's rendering the rectangle (0==false)
  gl.uniform1i(isWallLoc, 0);
  gl.uniform1f(shininess, rectShin);
  mv = mult(viewer, rotate(theta, 1.0, 0.0, 0.0));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(mv));
  nm = normalMatrix(mv, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(nm));
  gl.drawArrays(gl.TRIANGLES, numWallPoints, numRectPoints);


  if (runAnimation) {
    // set up new animation frame
    theta += deltaTheta;
    if (theta > maxTheta) {
      deltaTheta = -deltaTheta;
      theta = maxTheta + deltaTheta;
    } else if (theta < -maxTheta) {
      deltaTheta = -deltaTheta;
      theta = -maxTheta + deltaTheta;
    }
    
    requestAnimFrame(render);
  }

}
