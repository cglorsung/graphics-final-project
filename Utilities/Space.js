function Cube() {
    var Cube = {
        vertices: [
            [-1.0, -1.0, 1.0], //0 Bottom forward left
            [1.0, -1.0, 1.0], //1 Bottom forward right
            [1.0, 1.0, 1.0], //2 Top forward right
            [-1.0, 1.0, 1.0], //3 Top forward left
            [-1.0, -1.0, -1.0], //4 Bottom back left
            [1.0, -1.0, -1.0], //5 Bottom back right
            [1.0, 1.0, -1.0], //6 Top back right
            [-1.0, 1.0, -1.0]  //7 Top back left
        ],
        colors: [
            [1.0, 1.0, 1.0, 1.0], //White
            [1.0, 0.0, 0.0, 1.0], //Red
            [0.0, 1.0, 0.0, 1.0], //Green
            [0.0, 0.0, 1.0, 1.0], //Blue
            [1.0, 1.0, 0.0, 1.0], //Yellow
            [1.0, 0.0, 1.0, 1.0], //Purple
        ],
        getVerts: function () { return this.vertices },
        getColor: function () { return this.colors },
    }
    return Cube;
}