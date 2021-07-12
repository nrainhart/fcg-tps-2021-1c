
// <============================================ EJERCICIOS ============================================>
// a) Implementar la función:
//
//      GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
//
//    Si la implementación es correcta, podrán hacer rotar la caja correctamente (como en el video). Notar 
//    que esta función no es exactamente la misma que implementaron en el TP4, ya que no recibe por parámetro
//    la matriz de proyección. Es decir, deberá retornar solo la transformación antes de la proyección model-view (MV)
//    Es necesario completar esta implementación para que funcione el control de la luz en la interfaz. 
//    IMPORTANTE: No es recomendable avanzar con los ejercicios b) y c) si este no funciona correctamente. 
//
// b) Implementar los métodos:
//
//      setMesh( vertPos, texCoords, normals )
//      swapYZ( swap )
//      draw( matrixMVP, matrixMV, matrixNormal )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado, asi como también intercambiar 
//    sus coordenadas yz. Notar que es necesario pasar las normales como atributo al VertexShader. 
//    La función draw recibe ahora 3 matrices en column-major: 
//
//       * model-view-projection (MVP de 4x4)
//       * model-view (MV de 4x4)
//       * normal transformation (MV_3x3)
//
//    Estas últimas dos matrices adicionales deben ser utilizadas para transformar las posiciones y las normales del
//    espacio objeto al esapcio cámara. 
//
// c) Implementar los métodos:
//
//      setTexture( img )
//      showTexture( show )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado y su textura.
//    Notar que los shaders deberán ser modificados entre el ejercicio b) y el c) para incorporar las texturas.
//  
// d) Implementar los métodos:
//
//      setLightDir(x,y,z)
//      setShininess(alpha)
//    
//    Estas funciones se llaman cada vez que se modifican los parámetros del modelo de iluminación en la 
//    interface. No es necesario transformar la dirección de la luz (x,y,z), ya viene en espacio cámara.
//
// Otras aclaraciones: 
//
//      * Utilizaremos una sola fuente de luz direccional en toda la escena
//      * La intensidad I para el modelo de iluminación debe ser seteada como blanca (1.0,1.0,1.0,1.0) en RGB
//      * Es opcional incorporar la componente ambiental (Ka) del modelo de iluminación
//      * Los coeficientes Kd y Ks correspondientes a las componentes difusa y especular del modelo 
//        deben ser seteados con el color blanco. En caso de que se active el uso de texturas, la 
//        componente difusa (Kd) será reemplazada por el valor de textura. 
//        
// <=====================================================================================================>

// Esta función recibe la matriz de proyección (ya calculada), una 
// traslación y dos ángulos de rotación (en radianes). Cada una de 
// las rotaciones se aplican sobre el eje x e y, respectivamente. 
// La función debe retornar la combinación de las transformaciones 
// 3D (rotación, traslación y proyección) en una matriz de 4x4, 
// representada por un arreglo en formato column-major. 

function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [COMPLETAR] Modificar el código para formar la matriz de transformación.

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

	return [rotY, rotX, trans].reduce(composeTransforms);
}

function composeTransforms(firstTransform, secondTransform) {
	return MatrixMult(secondTransform, firstTransform)
}

// [COMPLETAR] Completar la implementación de esta clase.
class MeshDrawer
{
	// El constructor es donde nos encargamos de realizar las inicializaciones necesarias. 
	constructor()
	{
		// 1. Compilamos el programa de shaders
		this.prog = InitShaderProgram(meshVS, meshFS);

		// 2. Obtenemos los IDs de las variables uniformes en los shaders
		this.mvp = gl.getUniformLocation(this.prog, 'mvp');
		this.mv = gl.getUniformLocation(this.prog, 'mv');
		this.swapYZUniform = gl.getUniformLocation(this.prog, 'swapYZ');

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

	// Esta función se llama cada vez que el usuario carga un nuevo
	// archivo OBJ. En los argumentos de esta función llegan un areglo
	// con las posiciones 3D de los vértices, un arreglo 2D con las
	// coordenadas de textura y las normales correspondientes a cada 
	// vértice. Todos los items en estos arreglos son del tipo float. 
	// Los vértices y normales se componen de a tres elementos 
	// consecutivos en el arreglo vertPos [x0,y0,z0,x1,y1,z1,..] y 
	// normals [n0,n0,n0,n1,n1,n1,...]. De manera similar, las 
	// cooredenadas de textura se componen de a 2 elementos 
	// consecutivos y se  asocian a cada vértice en orden. 
	setMesh( vertPos, texCoords, normals )
	{
		// [COMPLETAR] Actualizar el contenido del buffer de vértices y otros atributos..
		this.numTriangles = vertPos.length / 3 / 3
		//texturas


		// 1. Binding y seteo del buffer de vértices
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// 2. Binding y seteo del buffer de coordenadas de textura	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texPosbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		// 3. Binding y seteo del buffer de normales
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}

	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Intercambiar Y-Z'
	// El argumento es un booleano que indica si el checkbox está tildado
	swapYZ(swap)
	{
		// [COMPLETAR] Setear variables uniformes en el vertex shader
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZUniform, swap);
	}

	// Esta función se llama para dibujar la malla de triángulos
	// El argumento es la matriz model-view-projection (matrixMVP),
	// la matriz model-view (matrixMV) que es retornada por 
	// GetModelViewProjection y la matriz de transformación de las 
	// normales (matrixNormal) que es la inversa transpuesta de matrixMV
	draw(matrixMVP, matrixMV, matrixNormal)
	{
		// [COMPLETAR] Completar con lo necesario para dibujar la colección de triángulos en WebGL
		console.log(matrixMV);
		console.log(matrixNormal);
		// 1. Seleccionamos el shader
		gl.useProgram(this.prog);

		// 2. Setear matriz de transformación
		gl.uniformMatrix4fv(this.mv, false, matrixMV);
		gl.uniformMatrix4fv(this.mvp, false, matrixMVP);

		// 2''. Setear matriz de transformación de normales
		gl.uniformMatrix3fv(this.normalMatrixLocation, false, matrixNormal);

		// 3''.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);

		// 4''.
		gl.vertexAttribPointer(this.normalPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray(this.normalPos);

		// 3'.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texPosbuffer);

		// 4'.
		gl.vertexAttribPointer(this.texCoordsLocation, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray(this.texCoordsLocation);

		// 3.Binding de los buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);

		// 4. Habilitamos el atributo
		gl.vertexAttribPointer(this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray(this.vertPos);

		// 5. Dibujamos
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles * 3);
	}

	// Esta función se llama para setear una textura sobre la malla
	// El argumento es un componente <img> de html que contiene la textura.
	setTexture( img )
	{
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
	// El argumento es un boleano que indica si el checkbox está tildado
	showTexture( show )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTexLocation, show);
	}

	// Este método se llama al actualizar la dirección de la luz desde la interfaz
	setLightDir( x, y, z )
	{
		// [COMPLETAR] Setear variables uniformes en el fragment shader para especificar la dirección de la luz
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLocation, x, y, z);
	}

	// Este método se llama al actualizar el brillo del material
	setShininess( shininess )
	{
		// [COMPLETAR] Setear variables uniformes en el fragment shader para especificar el brillo.
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLocation, shininess);
	}
}



// [COMPLETAR] Calcular iluminación utilizando Blinn-Phong.

// Recordar que:
// Si declarás las variables pero no las usás, es como que no las declaraste
// y va a tirar error. Siempre va punto y coma al finalizar la sentencia.
// Las constantes en punto flotante necesitan ser expresadas como x.y,
// incluso si son enteros: ejemplo, para 4 escribimos 4.0.

// Vertex Shader
var meshVS = `
	attribute vec3 pos;
	attribute vec2 tcoord;
	attribute vec3 ncoord;

	uniform mat4 mvp;
	uniform bool swapYZ;

	varying vec2 texCoord;
	varying vec3 normCoord;
	varying vec4 vertCoord;

	void main()
	{
		
		texCoord = tcoord;
		normCoord = ncoord;
		gl_Position = mvp * vec4(swapYZ ? pos.xzy : pos,1);
	}
`;

// Fragment Shader
// Algunas funciones útiles para escribir este shader:
// Dot product: https://thebookofshaders.com/glossary/?search=dot
// Normalize:   https://thebookofshaders.com/glossary/?search=normalize
// Pow:         https://thebookofshaders.com/glossary/?search=pow

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

	void main()
	{
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
