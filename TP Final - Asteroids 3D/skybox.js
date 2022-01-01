class Skybox {
    constructor() {
        this.prog = InitShaderProgram(skyboxVS, skyboxFS);

        // look up where the vertex data needs to go.
        this.positionLocation = gl.getAttribLocation(this.prog, "a_position");

        // lookup uniforms
        this.skyboxLocation = gl.getUniformLocation(this.prog, "u_skybox");
        this.viewDirectionProjectionInverseLocation =
          gl.getUniformLocation(this.prog, "u_viewDirectionProjectionInverse");

        // Create a buffer for positions
        this.positionBuffer = gl.createBuffer();
        // Put the positions in the buffer
        this._setGeometry();

        // Create a texture.
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        const faceInfos = [
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                url: './models/computer-history-museum/pos-x.jpg',
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                url: './models/computer-history-museum/neg-x.jpg',
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                url: './models/computer-history-museum/pos-y.jpg',
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                url: './models/computer-history-museum/neg-y.jpg',
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                url: './models/computer-history-museum/pos-z.jpg',
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                url: './models/computer-history-museum/neg-z.jpg',
            },
        ];
        faceInfos.forEach((faceInfo) => {
            const {target, url} = faceInfo;

            // Upload the canvas to the cubemap face.
            const level = 0;
            const internalFormat = gl.RGBA;
            const width = 512;
            const height = 512;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;

            // setup each face so it's immediately renderable
            gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

            // Asynchronously load an image
            const image = new Image();
            image.src = url;
            image.addEventListener('load', () => {
                // Now that the image has loaded make copy it to the texture.
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(target, level, internalFormat, format, type, image);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            });
        });
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }

    // Fill the buffer with the values that define a quad.
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

    draw() {
        // Tell it to use our program (pair of shaders)
        gl.useProgram(this.prog);

        // Turn on the position attribute
        gl.enableVertexAttribArray(this.positionLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(this.positionLocation, size, type, normalize, stride, offset);

        // Compute the projection matrix
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const fieldOfViewRadians = degToRad(60);
        const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // camera going in circle 2 units from origin looking at origin
        const cameraPosition = [Math.cos(0), 0, Math.sin(0)];
        const target = [0, 0, 0];
        const up = [0, 1, 0];
        // Compute the camera's matrix using look at.
        const cameraMatrix = m4.lookAt(cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        const viewMatrix = m4.inverse(cameraMatrix);

        // We only care about direction so remove the translation
        viewMatrix[12] = 0;
        viewMatrix[13] = 0;
        viewMatrix[14] = 0;

        const viewDirectionProjectionMatrix =
          m4.multiply(projectionMatrix, viewMatrix);
        const viewDirectionProjectionInverseMatrix =
          m4.inverse(viewDirectionProjectionMatrix);

        // Set the uniforms
        gl.uniformMatrix4fv(
          this.viewDirectionProjectionInverseLocation,
          false,
          viewDirectionProjectionInverseMatrix
        );

        // Tell the shader to use texture unit 0 for u_skybox
        gl.uniform1i(this.skyboxLocation, 0);

        // let our quad pass the depth test at 1.0
        gl.depthFunc(gl.LEQUAL);

        // Draw the geometry.
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

function degToRad(d) {
    return d * Math.PI / 180;
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