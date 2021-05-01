// Esta función construye una matriz de transformación de 3x3 en coordenadas homogéneas
// utilizando los parámetros de posición, rotación y escala. La estructura de datos a 
// devolver es un arreglo 1D con 9 valores en orden "column-major". Es decir, para un 
// arreglo A[] de 0 a 8, cada posición corresponderá a la siguiente matriz:
//
// | A[0] A[3] A[6] |
// | A[1] A[4] A[7] |
// | A[2] A[5] A[8] |
// 
// Se deberá aplicar primero la escala, luego la rotación y finalmente la traslación. 
// Las rotaciones vienen expresadas en grados. 
function BuildTransform(positionX, positionY, rotation, scale) {
  return [uniformScaleMatrix(scale), rotationMatrix(rotation), translationMatrix(positionX, positionY)]
    .reduce(ComposeTransforms);
}

// Esta función retorna una matriz que resulta de la composición de trans1 y trans2. Ambas
// matrices vienen como un arreglo 1D expresado en orden "column-major", y se deberá 
// retornar también una matriz en orden "column-major". La composición debe aplicar 
// primero trans1 y luego trans2. 
function ComposeTransforms(trans1, trans2) {
  return matrixMultiplication(trans2, trans1);
}

function uniformScaleMatrix(scale) {
  return [scale, 0, 0, 0, scale, 0, 0, 0, 1];
}

function translationMatrix(offsetX, offsetY) {
  return [1, 0, 0, 0, 1, 0, offsetX, offsetY, 1];
}

function rotationMatrix(rotationInDegrees) {
  const rotationInRadians = rotationInDegrees * Math.PI / 180;
  const cos = Math.cos(rotationInRadians);
  const sin = Math.sin(rotationInRadians);
  return [cos, sin, 0, -sin, cos, 0, 0, 0, 1];
}

function matrixMultiplication(aMatrix, anotherMatrix) {
  const res = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      res[i + j * 3] = 0;
      for (let k = 0; k < 3; k++) {
        res[i + j * 3] += aMatrix[i + k * 3] * anotherMatrix[k + j * 3];
      }
    }
  }
  return res;
}