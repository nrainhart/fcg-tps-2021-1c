// Esta función recibe la matriz de proyección (ya calculada), una traslación y dos ángulos de rotación (en radianes).
// Cada una de las rotaciones se aplican sobre el eje x e y, respectivamente. La función retorna la combinación de las
// transformaciones 3D (rotación, traslación y proyección) en una matriz de 4x4, representada por un arreglo en formato
// column-major.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
	// Matriz de traslación
	const trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// Invertimos el signo de los ángulos para que el sentido de la rotación sea horario en vez de anti-horario
	const cosRotX = Math.cos(-rotationX);
	const sinRotX = Math.sin(-rotationX);
	const rotX = [
		1, 0, 0, 0,
		0, cosRotX, -sinRotX, 0,
		0, sinRotX, cosRotX, 0,
		0, 0, 0, 1
	];
	const cosRotY = Math.cos(-rotationY);
	const sinRotY = Math.sin(-rotationY);
	const rotY = [
		cosRotY, 0, sinRotY, 0,
		0, 1, 0, 0,
		-sinRotY, 0, cosRotY, 0,
		0, 0, 0, 1
	];

	return [rotY, rotX, trans].reduce((firstTransform, secondTransform) => MatrixMult(secondTransform, firstTransform));
}

class MeshDrawer {
	constructor(initialPosition) {
		this.initialPosition = initialPosition;

		// 1. Compilamos el programa de shaders
		this.prog = InitShaderProgram(meshVS, meshFS);

		// 2. Obtenemos los IDs de las variables uniformes en los shaders
		this.mvp = gl.getUniformLocation(this.prog, 'mvp');
		this.mv = gl.getUniformLocation(this.prog, 'mv');

		// 3. Obtenemos los IDs de los atributos de los vértices en los shaders
		this.vertPos = gl.getAttribLocation(this.prog, 'pos');
		this.normalPos = gl.getAttribLocation(this.prog, 'ncoord');

		// 4. Creamos el buffer para los vertices
		this.vertbuffer = gl.createBuffer();
		this.normalbuffer = gl.createBuffer();

		// 5. Texturas
		this.texPosbuffer = gl.createBuffer();
		this.textura = gl.createTexture();

		this.texGPULocation = gl.getUniformLocation(this.prog, 'texGPU');
		this.useTexLocation = gl.getUniformLocation(this.prog, 'useTexture');
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTexLocation, true);

		this.texCoordsLocation = gl.getAttribLocation(this.prog, 'tcoord');

		// 6. Iluminación
		this.shininessLocation = gl.getUniformLocation(this.prog, 'shininess');
		this.normalMatrixLocation = gl.getUniformLocation(this.prog, 'mn');
		this.lightDirLocation = gl.getUniformLocation(this.prog, 'lightDir');
	}

	// Esta función se llama cada vez que el usuario carga un nuevo archivo OBJ. En los argumentos de esta función llegan
	// un arreglo con las posiciones 3D de los vértices, un arreglo 2D con las  coordenadas de textura y las normales
	// correspondientes a cada vértice. Todos los items en estos arreglos son del tipo float. Los vértices y normales se
	// componen de a tres elementos consecutivos en el arreglo vertPos [x0,y0,z0,x1,y1,z1,..] y normals
	// [n0,n0,n0,n1,n1,n1,...]. De manera similar, las coordenadas de textura se componen de a 2 elementos consecutivos y
	// se  asocian a cada vértice en orden.
	setMesh( vertPos, texCoords, normals ) {
		this.numTriangles = vertPos.length / 3 / 3;
		this._setBufferData(this.vertbuffer, vertPos);
		this._setBufferData(this.texPosbuffer, texCoords);
		this._setBufferData(this.normalbuffer, normals);
	}

	_setBufferData(buffer, vertPos) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	}

	// Esta función se llama para dibujar la malla de triángulos. El argumento es la matriz model-view-projection
	// (matrixMVP), la matriz model-view (matrixMV) que es retornada por GetModelViewProjection y la matriz de
	// transformación de las normales (matrixNormal) que es la inversa transpuesta de matrixMV
	draw(matrixMVP, matrixMV, matrixNormal) {
		// Seleccionamos el shader
		gl.useProgram(this.prog);

		// Seteamos matriz de transformación
		gl.uniformMatrix4fv(this.mv, false, matrixMV);
		gl.uniformMatrix4fv(this.mvp, false, matrixMVP);
		gl.uniformMatrix3fv(this.normalMatrixLocation, false, matrixNormal);

		// Seteamos atributos del vertex shader
		this._setVertexAttributeFromBuffer(this.vertPos, this.vertbuffer, 3);
		this._setVertexAttributeFromBuffer(this.texCoordsLocation, this.texPosbuffer, 2);
		this._setVertexAttributeFromBuffer(this.normalPos, this.normalbuffer, 3);

		// Dibujamos
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles * 3);
	}

	_setVertexAttributeFromBuffer(vertexAttribute, buffer, elementsPerVertex) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(vertexAttribute, elementsPerVertex, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexAttribute);
	}

	// Esta función se llama para setear una textura sobre la malla
	// El argumento es un componente <img> de html que contiene la textura.
	setTexture(img) {
		gl.bindTexture( gl.TEXTURE_2D, this.textura);
		gl.texImage2D( gl.TEXTURE_2D, // Textura 2D
			0, // Mipmap nivel 0
			gl.RGB, // formato (en GPU)
			gl.RGB, // formato del input
			gl.UNSIGNED_BYTE, // tipo
			img // arreglo o <img>
		);
		gl.generateMipmap( gl.TEXTURE_2D );

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, this.textura);

		gl.useProgram(this.prog);
		gl.uniform1i (this.texGPULocation, 0 ); // Unidad 0
	}

	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Mostrar textura'
	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTexLocation, show);
	}

	// Este método se llama al actualizar la dirección de la luz desde la interfaz
	setLightDir(x, y, z) {
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLocation, x, y, z);
	}

	// Este método se llama al actualizar el brillo del material
	setShininess(shininess) {
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLocation, shininess);
	}
}

var meshVS = `
	attribute vec3 pos;
	attribute vec2 tcoord;
	attribute vec3 ncoord;

	uniform mat4 mvp;

	varying vec2 texCoord;
	varying vec3 normCoord;
	varying vec4 vertCoord;

	void main() {
		texCoord = tcoord;
		normCoord = ncoord;
		gl_Position = mvp * vec4(pos,1);
	}
`;

var meshFS = `
	precision mediump float;

	uniform vec3 lightDir;
	uniform float shininess;
	uniform mat3 mn;
	uniform mat4 mv;

	varying vec2 texCoord;
	varying vec3 normCoord;
	varying vec4 vertCoord;

	uniform sampler2D texGPU;
	uniform bool useTexture;

	void main() {
		vec3 normal = normalize(mn * normCoord);
		float cosTita = max(0.0, dot(normal,lightDir));
		
		vec4 v = -1.0*(mv*vertCoord);
		vec4 r = vec4(2.0*dot(lightDir, normCoord)*normCoord - lightDir, 1);
		float cosDelta = max(0.0, dot(v,r));
		
		vec4 kd = useTexture ? texture2D(texGPU, texCoord) : vec4(1.0,0.0,gl_FragCoord.z*gl_FragCoord.z,1.0);
		vec4 i = vec4(1.0, 1.0, 1.0, 1.0);
		vec4 ks = vec4(1.0, 1.0, 1.0, 1.0);
		
		gl_FragColor = cosTita * i * (kd + (pow(cosTita, shininess)*ks)/cosTita) + 0.01 * kd;
	}
`;