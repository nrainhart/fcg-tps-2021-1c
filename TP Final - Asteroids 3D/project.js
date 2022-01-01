// Estructuras globales e inicializaciones
let meshDrawers;         // clase para contener el comportamiento de la malla
let canvas, gl;         // canvas y contexto WebGL
let perspectiveMatrix;	// matriz de perspectiva

let cameraPosition = [0, 0, 0]
let camera_u = [1, 0, 0, 0];
let camera_v = [0, 1, 0, 0];
let camera_w = [0, 0, 1, 0];

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
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            for (let k = 0; k < 5; k++) {
                coords.push([
                    i * 10 + 5 * Math.random(),
                    j * 10 + 5 * Math.random(),
                    k * 10 + 5 * Math.random()
                ]);
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

function RotationMatrix(angle, axis) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [x, y, z] = axis;
    const x2 = x * x, y2 = y * y, z2 = z * z;
    return [
        [cos + x2 * (1 - cos), y * x * (1 - cos) + z * sin, z * x * (1 - cos) - y * sin, 0],
        [x * y * (1 - cos) - z * sin, cos + y2 * (1 - cos), z * y * (1 - cos) + x * sin, 0],
        [x * z * (1 - cos) + y * sin, y * z * (1 - cos) - x * sin, cos + z2 * (1 - cos), 0],
        [0, 0, 0, 1]
    ]
}

function NormalizeVector(vector) {
    return math.multiply(1 / math.norm(vector), vector)
}

function CameraTransform(translation, rotX, rotY) {
    let rotationMatrixX = RotationMatrix(rotX, math.multiply(-1, camera_u));
    let rotationMatrixY = RotationMatrix(rotY, math.multiply(-1, camera_v));
    const rotateXY = (vector) => NormalizeVector(math.multiply(rotationMatrixX, math.multiply(rotationMatrixY, vector)));
    camera_u = rotateXY(camera_u);
    camera_v = rotateXY(camera_v);
    camera_w = rotateXY(camera_w);
    for (let i = 0; i < 3; i++) {
        cameraPosition[i] -= translation * camera_w[i];
    }
    return MatrixMult([
        camera_u[0], camera_v[0], camera_w[0], 0,
        camera_u[1], camera_v[1], camera_w[1], 0,
        camera_u[2], camera_v[2], camera_w[2], 0,
        0, 0, 0, 1,
    ], [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        -cameraPosition[0], -cameraPosition[1], -cameraPosition[2], 1,
    ]);
}

let kaboom;

// Calcula la matriz de perspectiva (column-major)
function ProjectionMatrix(canvas, translation, rotX = 0, rotY = 0, fov_angle = 60) {

    let offsetCameraPosition = math.add(cameraPosition, math.multiply(camera_w.slice(0, 3), -10 * translation));
    // Por ahora usamos bounding boxes para aproximar el volumen de los asteroides. En el futuro capaz queramos
    // "bounding spheres" para que sea un poco más preciso.
    const collidingAsteroidIndex = meshDrawers.findIndex(meshDrawer => meshDrawer.getBoundingBox().contains(offsetCameraPosition));
    if (collidingAsteroidIndex !== -1) {
        kaboom.classList.add('visible')
        setTimeout(() => kaboom.classList.remove('visible'), 200)
        meshDrawers.splice(collidingAsteroidIndex, 1);
    }

    // Hacemos esto primero porque `CameraTransform` actualiza la traslación en z de la cámara (cameraPosition[2])
    // que se usa más abajo
    const cameraTransform = CameraTransform(translation, rotX, rotY);

    const ratio = canvas.width / canvas.height;
    let boxDepthRadius = 100;
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
function UpdateProjectionMatrix(translation = 0, rotX = 0, rotY = 0) {
    perspectiveMatrix = ProjectionMatrix(canvas, translation, rotX, rotY);
}

function setLightDirection() {
    const rotX = 0;
    const rotY = 0;

    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    meshDrawers.forEach(meshDrawer => meshDrawer.setLightDir(-sy, cy * sx, -cy * cx));
    DrawScene();
}

// Funcion que renderiza la escena.
function DrawScene() {
    // 2. Limpiamos la escena
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    meshDrawers.forEach(meshDrawer => {
        // 1. Obtenemos las matrices de transformación
        var mv = GetModelViewMatrix(meshDrawer.initialPosition[0], meshDrawer.initialPosition[1], meshDrawer.initialPosition[2], 0, 0);
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

    setLightDirection();

    canvas.onclick = canvas.requestPointerLock;
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    canvas.oncontextmenu = () => false;

    // Evento de zoom (ruedita)
    const zoom = s => {
        UpdateProjectionMatrix(s * 0.1);
        DrawScene();
    }

    // Para avanzar/parar
    let moving = false;
    window.onkeydown = (e) => {
        if (e.key === ' ') {
            moving = !moving;
        }
    };
    const animate = () => requestAnimationFrame(() => {
        if (moving) {
            zoom(-0.8);
        }
        animate();
    });
    animate();
    canvas.onwheel = () => zoom(0.3 * event.deltaY);

    SetShininess(50);

    kaboom = document.getElementById('kaboom');

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
    const rotX = event.movementY / canvas.height * 5;
    const rotY = event.movementX / canvas.width * 5;
    UpdateProjectionMatrix(0, rotX, rotY);
    DrawScene();
}

const lockChangeAlert = () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener("mousemove", updatePosition, false);
    } else {
        document.removeEventListener("mousemove", updatePosition, false);
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
    if (xmlhttp.status === 200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function LoadObj(objData) {
    const mesh = new ObjMesh;
    mesh.parse(objData);
    const box = mesh.getBoundingBox();
    const shift = [
        -(box.min[0] + box.max[0]) / 2,
        -(box.min[1] + box.max[1]) / 2,
        -(box.min[2] + box.max[2]) / 2
    ];
    const size = [
        (box.max[0] - box.min[0]) / 2,
        (box.max[1] - box.min[1]) / 2,
        (box.max[2] - box.min[2]) / 2
    ];
    const maxSize = Math.max(size[0], size[1], size[2]);
    const scale = 1 / maxSize;
    mesh.shiftAndScale(shift, scale);
    meshDrawers.forEach(meshDrawer => meshDrawer.setMesh(mesh));
}

function LoadTexture(src) {
    const img = document.getElementById('texture-img');
    img.onload = function () {
        meshDrawers.forEach(meshDrawer => meshDrawer.setTexture(img));
        DrawScene();
    }
    img.src = src;
}

function SetShininess(value) {
    const s = Math.pow(10, value / 25);
    meshDrawers.forEach(meshDrawer => meshDrawer.setShininess(s));
    DrawScene();
}

