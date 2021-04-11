// La imagen que tienen que modificar viene en el parámetro image y contiene inicialmente los datos originales
// es objeto del tipo ImageData ( más info acá https://mzl.la/3rETTC6  )
// Factor indica la cantidad de intensidades permitidas (sin contar el 0)

const errorDiffusionFactorsFloyd = [
    {displacement: {x: 1, y: 0}, factor: 7 / 16},
    {displacement: {x: -1, y: 1}, factor: 3 / 16},
    {displacement: {x: 0, y: 1}, factor: 5 / 16},
    {displacement: {x: 1, y: 1}, factor: 1 / 16},
];

const errorDiffusionFactorsJarvis = [
    {displacement: {x:1 , y:0 }, factor: 7/48},
    {displacement: {x:2 , y:0 }, factor: 5/48},
    {displacement: {x:-2 , y:1 }, factor: 3/48},
    {displacement: {x:-1 , y:1 }, factor: 5/48},
    {displacement: {x:0 , y:1 }, factor: 7/48},
    {displacement: {x:1 , y:1 }, factor: 5/48},
    {displacement: {x:2 , y:1 }, factor: 3/48},
    {displacement: {x:-2 , y:2 }, factor: 1/48},
    {displacement: {x:-1 , y:2 }, factor: 3/48},
    {displacement: {x:0 , y:2 }, factor: 5/48},
    {displacement: {x:1 , y:2 }, factor: 3/48},
    {displacement: {x:2 , y:2 }, factor: 1/48},
];

function dither(image, factor, useJarvis) {
    const factorNum = parseInt(factor);
    const imageData = image.data;
    const imageWidth = image.width;

    const errorDiffusionFactors = useJarvis ? errorDiffusionFactorsJarvis : errorDiffusionFactorsFloyd;

    for (let i = 0; i < imageData.length; i += 1) {
        if(i%4 != 3){
            var originalComponent = imageData[i];
            var newComponent = quantizeComponentWithFactor(originalComponent, factorNum);
            var err = originalComponent - newComponent;
            imageData[i] = newComponent;
            for(const errorDiffusionFactor of errorDiffusionFactors) {
                const {x, y} = errorDiffusionFactor.displacement;
                const linearCoord = i + x*4 + y * imageWidth * 4;
                if (linearCoord < imageData.length) {
                    imageData[linearCoord] += err * errorDiffusionFactor.factor;
                }
            }
        }
    }
}

function quantizeComponentWithFactor(oldComponent, factor){
    var step = Math.floor(256/factor);
    return Math.round(oldComponent/step) * step;
}

function componentDistance(comp1, comp2){
    return Math.abs(comp1 - comp2);
}

// Imágenes a restar (imageA y imageB) y el retorno en result
function substraction(imageA, imageB, result) {
    const resultComponents = result.data;
    const imageAComponents = imageA.data;
    const imageBComponents = imageB.data;
    for (let i = 0; i < resultComponents.length; i += 1) {
        if(i%4 != 3){
            resultComponents[i] = componentDistance(imageAComponents[i], imageBComponents[i]);
        } else {
            resultComponents[i] = 255;
        }
    }
}