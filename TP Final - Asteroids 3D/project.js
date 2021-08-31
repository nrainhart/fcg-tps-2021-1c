// Estructuras globales e inicializaciones
let meshDrawers;         // clase para contener el comportamiento de la malla
let canvas, gl;         // canvas y contexto WebGL
let perspectiveMatrix;	// matriz de perspectiva

let cameraPosition = [0, 0, 0]
let camRotX = 0, camRotY = 0, rotX = 0, rotY = 0, autorot = 0;

// Funcion de inicialización, se llama al cargar la página
function InitWebGL() {
    // Inicializamos el canvas WebGL
    canvas = document.getElementById("canvas");
    gl = canvas.getContext("webgl", {antialias: false, depth: true});
    if (!gl) {
        alert("Imposible inicializar WebGL. Tu navegador quizás no lo soporte.");
        return;
    }

    // Inicializar color clear
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST); // habilitar test de profundidad

    // Inicializar los shaders y buffers para renderizar
    const coords = [];
    for (let i=0; i<2; i++) {
        for (let j=0; j<2; j++) {
            for (let k=0; k<2; k++) {
                coords.push([i*10, j*10, k*10]);
            }
        }
    }
    meshDrawers = coords.map(coord => new MeshDrawer(coord));
    LoadObj(loadFile('./models/asteroid.obj'));
    LoadTexture('./models/asteroid.jpg');

    // Setear el tamaño del viewport
    UpdateCanvasSize();
}

// Funcion para actualizar el tamaño de la ventana cada vez que se hace resize
function UpdateCanvasSize() {
    // 1. Calculamos el nuevo tamaño del viewport
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = pixelRatio * canvas.clientWidth;
    canvas.height = pixelRatio * canvas.clientHeight;

    const width = (canvas.width / pixelRatio);
    const height = (canvas.height / pixelRatio);

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // 2. Lo seteamos en el contexto WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);

    // 3. Cambian las matrices de proyección, hay que actualizarlas
    UpdateProjectionMatrix();
}

function CameraTransform(translation) {
    const matRotX = [
        [1, 0, 0, 0],
        [0, Math.cos(camRotX), -Math.sin(camRotX), 0],
        [0, Math.sin(camRotX), Math.cos(camRotX), 0],
        [0, 0, 0, 1]
    ];
    const matRotY = [
        [Math.cos(camRotY), 0, Math.sin(camRotY), 0],
        [0, 1, 0, 0],
        [-Math.sin(camRotY), 0, Math.cos(camRotY), 0],
        [0, 0, 0, 1]
    ];
    const rotateXY = (vector) => math.multiply(matRotY, math.multiply(matRotX, vector));
    const u = rotateXY([1, 0, 0, 0]);
    const v = rotateXY([0, 1, 0, 0]);
    const w = rotateXY([0, 0, 1, 0]);
    for (let i = 0; i < 3; i++) {
        cameraPosition[i] -= translation * w[i];
    }
    return MatrixMult([
        u[0], v[0], w[0], 0,
        u[1], v[1], w[1], 0,
        u[2], v[2], w[2], 0,
        0, 0, 0, 1,
    ], [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        -cameraPosition[0], -cameraPosition[1], -cameraPosition[2], 1,
    ]);
}

// Calcula la matriz de perspectiva (column-major)
function ProjectionMatrix(canvas, translation, fov_angle = 60) {
    // Hacemos esto primero porque `CameraTransform` actualiza la traslación en z de la cámara (cameraPosition[2])
    // que se usa más abajo
    const cameraTransform = CameraTransform(translation);

    const ratio = canvas.width / canvas.height;
    let boxDepthRadius = 100//1.74;
    let n = (cameraPosition[2] - boxDepthRadius);
    const min_n = 0.001;
    if (n < min_n) n = min_n;
    const f = (cameraPosition[2] + boxDepthRadius);
    const fov = Math.PI * fov_angle / 180;
    const s = 1 / Math.tan(fov / 2);
    return MatrixMult([
        s / ratio, 0, 0, 0,
        0, s, 0, 0,
        0, 0, (n + f) / (f - n), 1,
        0, 0, -2 * n * f / (f - n), 0
    ], cameraTransform);
}

// Devuelve la matriz de perspectiva (column-major)
function UpdateProjectionMatrix(translation = 0) {
    perspectiveMatrix = ProjectionMatrix(canvas, translation, undefined, camRotX, camRotY);
}

// Funcion que reenderiza la escena. 
function DrawScene() {
    // 2. Limpiamos la escena
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    meshDrawers.forEach(meshDrawer => {
        // 1. Obtenemos las matrices de transformación
        var mv = GetModelViewMatrix(meshDrawer.initialPosition[0], meshDrawer.initialPosition[1], meshDrawer.initialPosition[2] + 3/*+ transZ*/, 0/*rotX*/, autorot /*+rotY*/);
        var mvp = MatrixMult(perspectiveMatrix, mv);

        // 3. Le pedimos a cada objeto que se dibuje a si mismo
        var nrmTrans = [mv[0], mv[1], mv[2], mv[4], mv[5], mv[6], mv[8], mv[9], mv[10]];

        meshDrawer.draw(mvp, mv, nrmTrans)
    });
}

// Función que compila los shaders que se le pasan por parámetro (vertex & fragment shaders)
// Recibe los strings de cada shader y retorna un programa
function InitShaderProgram(vsSource, fsSource, wgl = gl) {
    // Función que compila cada shader individualmente
    const vs = CompileShader(wgl.VERTEX_SHADER, vsSource, wgl);
    const fs = CompileShader(wgl.FRAGMENT_SHADER, fsSource, wgl);

    // Crea y linkea el programa
    const prog = wgl.createProgram();
    wgl.attachShader(prog, vs);
    wgl.attachShader(prog, fs);
    wgl.linkProgram(prog);

    if (!wgl.getProgramParameter(prog, wgl.LINK_STATUS)) {
        alert('No se pudo inicializar el programa: ' + wgl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

// Función para compilar shaders, recibe el tipo (gl.VERTEX_SHADER o gl.FRAGMENT_SHADER)
// y el código en forma de string. Es llamada por InitShaderProgram()
function CompileShader(type, source, wgl = gl) {
    // Creamos el shader
    const shader = wgl.createShader(type);

    // Lo compilamos
    wgl.shaderSource(shader, source);
    wgl.compileShader(shader);

    // Verificamos si la compilación fue exitosa
    if (!wgl.getShaderParameter(shader, wgl.COMPILE_STATUS)) {
        alert('Ocurrió un error durante la compilación del shader:' + wgl.getShaderInfoLog(shader));
        wgl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Multiplica 2 matrices y devuelve A*B.
// Los argumentos y el resultado son arreglos que representan matrices en orden column-major
function MatrixMult(A, B) {
    var C = [];
    for (var i = 0; i < 4; ++i) {
        for (var j = 0; j < 4; ++j) {
            var v = 0;
            for (var k = 0; k < 4; ++k) {
                v += A[j + 4 * k] * B[k + 4 * i];
            }

            C.push(v);
        }
    }
    return C;
}

// ======== Funciones para el control de la interfaz ========

// Al cargar la página
window.onload = function () {
    InitWebGL();

    // Componente para la luz
    lightView = new LightView();

    canvas.onclick = canvas.requestPointerLock;
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    canvas.oncontextmenu = () => false;

    // Evento de zoom (ruedita)
    const zoom = s => {
        UpdateProjectionMatrix(s * 0.1);
        DrawScene();
    }
    const animate = () => requestAnimationFrame(() => {
        zoom(-0.8);
        animate();
    });
    animate();
    canvas.onwheel = () => zoom(0.3 * event.deltaY);

    SetShininess(document.getElementById('shininess-exp'));

    // Dibujo la escena
    DrawScene();
};

// Evento resize
function WindowResize() {
    UpdateCanvasSize();
    DrawScene();
}

const updatePosition = () => {
    // Si se mueve el mouse, actualizo las matrices de rotación
    rotY += event.movementX / canvas.width*5;
    rotX += event.movementY / canvas.height*5;
    camRotX = rotX;
    camRotY = rotY;
    UpdateProjectionMatrix();
    DrawScene();
}

const lockChangeAlert = () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener("mousemove", updatePosition, false);
    } else {
        document.removeEventListener("mousemove", updatePosition, false);
    }
}

// Control de la calesita de rotación
var timer;

function AutoRotate(param) {
    // Si hay que girar...
    if (param.checked) {
        // Vamos rotando una cantiad constante cada 30 ms
        timer = setInterval(function () {
                var v = document.getElementById('rotation-speed').value;
                autorot += 0.0005 * v;
                if (autorot > 2 * Math.PI) autorot -= 2 * Math.PI;

                // Reenderizamos
                DrawScene();
            }, 30
        );
        document.getElementById('rotation-speed').disabled = false;
    } else {
        clearInterval(timer);
        document.getElementById('rotation-speed').disabled = true;
    }
}

// Control de textura visible
function ShowTexture(param) {
    meshDrawers.forEach(meshDrawer => meshDrawer.showTexture(param.checked));
    DrawScene();
}

function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status===200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function LoadObj(objData) {
    var mesh = new ObjMesh;
    mesh.parse(objData);
    var box = mesh.getBoundingBox();
    var shift = [
        -(box.min[0] + box.max[0]) / 2,
        -(box.min[1] + box.max[1]) / 2,
        -(box.min[2] + box.max[2]) / 2
    ];
    var size = [
        (box.max[0] - box.min[0]) / 2,
        (box.max[1] - box.min[1]) / 2,
        (box.max[2] - box.min[2]) / 2
    ];
    var maxSize = Math.max(size[0], size[1], size[2]);
    var scale = 1 / maxSize;
    mesh.shiftAndScale(shift, scale);
    var buffers = mesh.getVertexBuffers();
    meshDrawers.forEach(meshDrawer => meshDrawer.setMesh(buffers.positionBuffer, buffers.texCoordBuffer, buffers.normalBuffer));
}

// Cargar archivo obj
function LoadObjFromInput(param) {
    let file = param.files && param.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            let objData = e.target.result;
            LoadObj(objData);
            DrawScene();
        }
        reader.readAsText(file);
    }
}

function LoadTexture(src) {
    var img = document.getElementById('texture-img');
    img.onload = function () {
        meshDrawers.forEach(meshDrawer => meshDrawer.setTexture(img));
        DrawScene();
    }
    img.src = src;
}

// Cargar textura
function LoadTextureFromInput(param) {
    if (param.files && param.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            let src = e.target.result;
            LoadTexture(src);
        };
        reader.readAsDataURL(param.files[0]);
    }
}

// Setear Intensidad
function SetShininess(param) {
    var exp = param.value;
    var s = Math.pow(10, exp / 25);
    document.getElementById('shininess-value').innerText = s.toFixed(s < 10 ? 2 : 0);
    meshDrawers.forEach(meshDrawer => meshDrawer.setShininess(s));
    DrawScene();
}

