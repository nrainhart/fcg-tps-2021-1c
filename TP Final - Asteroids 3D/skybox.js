class Skybox {
    constructor() {
        this.prog = InitShaderProgram(skyboxVS, skyboxFS);

        this.positionLocation = gl.getAttribLocation(this.prog, "a_position");

        this.skyboxLocation = gl.getUniformLocation(this.prog, "u_skybox");
        this.viewDirectionProjectionInverseLocation =
          gl.getUniformLocation(this.prog, "u_viewDirectionProjectionInverse");

        this.positionBuffer = gl.createBuffer();
        this._setGeometry();

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        const modelRoot = './models/space-skybox/red';

        const faceInfos = [
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                url: `${modelRoot}/pos-x.jpg`,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                url: `${modelRoot}/neg-x.jpg`,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                url: `${modelRoot}/pos-y.jpg`,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                url: `${modelRoot}/neg-y.jpg`,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                url: `${modelRoot}/pos-z.jpg`,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                url: `${modelRoot}/neg-z.jpg`,
            },
        ];
        faceInfos.forEach(({target, url}) => {
            const level = 0;
            const internalFormat = gl.RGBA;
            const width = 2048;
            const height = 2048;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            // Setear cara sin imagen para que se renderee de inmediato
            gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

            // Cargar imagen asincrónicamente
            const image = new Image();
            image.src = url;
            image.addEventListener('load', () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(target, level, internalFormat, format, type, image);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            });
        });
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }

    /**
     * Carga vértices del cubo/skybox en {@link positionBuffer}. El skybox es tan grande como el canvas
     */
    _setGeometry() {
        const positions = [
          -1, -1,
          1, -1,
          -1,  1,
          -1,  1,
          1, -1,
          1,  1,
        ];
        this._setBufferData(this.positionBuffer, positions)
    }

    _setBufferData(buffer, vertPos) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
    }

    draw(projectionMatrix) {
        gl.useProgram(this.prog);

        const viewDirectionProjectionInverseMatrix = matrixInverse(projectionMatrix);
        gl.uniformMatrix4fv(
          this.viewDirectionProjectionInverseLocation,
          false,
          viewDirectionProjectionInverseMatrix
        );

        // Usar la Unidad de textura 0 para u_skybox
        gl.uniform1i(this.skyboxLocation, 0);

        this._setVertexAttributeFromBuffer(this.positionLocation, this.positionBuffer, 2);

        // Necesario para que el skybox pase el test de profundidad en 1.0
        gl.depthFunc(gl.LEQUAL);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _setVertexAttributeFromBuffer(vertexAttribute, buffer, elementsPerVertex) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(vertexAttribute, elementsPerVertex, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertexAttribute);
    }
}

const skyboxVS = `
	attribute vec4 a_position;
	
  varying vec4 v_position;
  
  void main() {
    v_position = a_position;
    gl_Position = a_position;
    gl_Position.z = 1.0;
  }
`;

const skyboxFS = `
	precision mediump float;

  uniform samplerCube u_skybox;
  uniform mat4 u_viewDirectionProjectionInverse;

  varying vec4 v_position;
  
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_position;
    gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
  }
`;