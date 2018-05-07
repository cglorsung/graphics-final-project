var planetTexture

function getTexture() {
    planetTexture = gl.createTexture()
    planetTexture.image = new Image()
    planetTexture.image.onload = function() {
        handleLoadedTexture(planetTexture)
    }

    planetTexture.image.src = "../mars.png"
}

function start() {

    function initGL(canvas) {
        gl = canvas.getContext("webgl")
        gl.viewportWidth  = canvas.width
        gl.viewportHeight = canvas.height

        if(!gl) {
            alert("No WebGL detected in this browser.")
            return;
        }
    }

    function initShaders() {
        var fragShader = getShader(gl, "shader-fs")
        var vertShader = getShader(gl, "shader-vs")

        shaderProgram = gl.createProgram()
        gl.attachShader(shaderProgram, vertShader)
        gl.attachShader(shaderProgram, fragShader)
        gl.linkProgram(shaderProgram)

        gl.useProgram(shaderProgram)

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    }

    function handleLoadedTexture(texture) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }
        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }
        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }
        gl.shaderSource(shader, str);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }


    canvas = document.getElementById("gl-canvas")
    initGL(canvas)
    initShaders()
    initBuffers()
    initTexture()

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.enable(gl.DEPTH_TEST)

    canvas.onmousedown   = handleMouseDown
    document.onmouseup   = handleMouseUp
    document.onmousemove = handleMouseMove

    tick();
}

function tick() {
    requestAnimFrame(tick)
    drawScene()
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix)

    var lighting = document.getElementById("lighting").checked
    gl.uniform1i(shaderProgram.useLightingUniform, lighting)
    if(lighting) {
        gl.uniform3f(
            shaderProgram.ambientColorUniform,
            parseFloat(document.getElementById("ambientR").value),
            parseFloat(document.getElementById("ambientG").value),
            parseFloat(document.getElementById("ambientB").value)
        )

        var lightDir = [
            parseFloat(document.getElementById("lightX").value),
            parseFloat(document.getElementById("lightY").value),
            parseFloat(document.getElementById("lightZ").value)
        ]

        var adjustLD = vec3.create()
        vec3.normalize(lightDir, adjustLD)
        vec3.scale(adjustLD, -1)
        gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustLD)

        gl.uniform3f(
            shaderProgram.directionalColorUniform,
            parseFloat(document.getElementById("dirR").value),
            parseFloat(document.getElementById("dirG").value),
            parseFloat(document.getElementById("dirB").value)
        )
    }

    mat4.identity(mvMatrix)
    mat4.translate(mvMatrix, [0, 0, -6])
    mat4.multiply(mvMatrix, rotationMatrix)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, planetTexture)
    gl.uniform1i(shaderProgram.samplerUniform, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, planetVertexPositionBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, planetVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, planetVertexTextureCoordBuffer)
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, planetVertexTextureCoordBuffer.itemSize, gl.FLOAT, flase, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, planetVertexNormalBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, planetVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planetVertexIndexBuffer)
    setMatrixUniforms()
    gl.drawElements(gl.TRIANGLES, planetVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0)
}

var planetVertexPositionBuffer
var planetVertexNormalBuffer
var planetVertexTextureCoordBuffer
var planetVertexIndexBuffer

function initBuffers() {
    var latitudes = 30
    var longitudes = 30
    var radius = 2

    var vPositionData = []
    var normData = []
    var textureCoordData = []

    for(var i = 0; i <= latitudes; i++) {
        var theta  = i * Math.PI / latitudes
        var sTheta = Math.sin(theta)
        var cTheta = Math.cos(theta)

        for(var n = 0; n <= longitudes; n++) {
            var phi = n * 2 * Math.PI / longitudes
            var sPhi = Math.sin(phi)
            var cPhi = Math.cos(phi)

            var x = cPhi * sTheta
            var y = cTheta
            var z = sPhi * sTheta
            var u = 1 - (n / longitudes)
            var v = 1 - (i / latitudes)

            normData.push(x)
            normData.push(y)
            normData.push(z)

            textureCoordData.push(u)
            textureCoordData.push(v)

            vPositionData.push(radius * x)
            vPositionData.push(radius * y)
            vPositionData.push(radius * z)
        }
    }

    var indexData = []
    for(var i = 0; i < latitudes; i++) {
        for(var n = 0; n < longitudes; n++) {
            var first = (i * (longitudes + 1)) + n
            var secon = first + longitudes + 1

            indexData.push(first)
            indexData.push(secon)
            indexData.push(first + 1)

            indexData.push(secon)
            indexData.push(secon + 1)
            indexData.push(first + 1)
        }
    }

    var mouseDown = false
    var mouseX = null;
    var mouseY = null;

    var planetRotationMatrix = mat4.create()
    mat4.identity(planetRotationMatrix)

    function handleMouseDown(event) {
        mouseDown = true
        mouseX = event.clientX
        mouseY = event.clientY
    }

    function handleMouseUp(event) {
        mouseDown = false
    }

    function handleMouseMove(event) {
        if(!mouseDown) {
            return
        }

        var newX = event.clientX
        var newY = event.clientY

        var dX = newX - mouseX
        var newRotationMatrix = mat4.create()

        mat4.identity(newRotationMatrix)
        mat4.rotate(newRotationMatrix, degToRad(dX / 10), [0, 1, 0])

        var dY = newY - mouseY
        mat4.rotate(newRotationMatrix, degToRad(dY / 10), [1, 0, 0])

        mat4.multiply(newRotationMatrix, planetRotationMatrix, planetRotationMatrix)

        mouseX = newX
        mouseY = newY
    }
}